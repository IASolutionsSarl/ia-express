import { escapeCssString } from './serialization';
import { resolveParentSelector, splitCssSelectorList } from './selectors';
import type {
    StyleConfiguredState,
    StyleCompilerMode,
    StyleDiagnostic,
    StyleElementReader,
    StyleSectionReader,
    StyleStateDescriptor,
    StyleSurface,
} from './types';

/**
 * WeWeb state names that can be represented as native CSS pseudo selectors.
 *
 * These do not require runtime state attributes for static/runtime CSS. Editor preview adds
 * `data-ww-forced-states` fallbacks so the side panel can preview native states without forcing
 * actual browser hover/focus/active.
 */
const NATIVE_STYLE_STATE_PSEUDO_CLASSES: Record<string, string> = {
    _wwHover: ':hover',
    _wwFocus: ':focus-within',
    _wwFocusVisible: ':focus-visible',
    _wwActive: ':active',
};

const EDITOR_PREVIEW_SELECTOR = ':where(#app.-ww-preview)';
const EDITOR_PREVIEW_ONLY_PSEUDO_CLASS_RE = /:(?:hover|active|focus(?:-visible|-within)?)(?![\w-])/;

export const PARENT_STYLE_STATE_PREFIX = '_wwParent_';

/**
 * Normalizes component configuration state declarations.
 *
 * Strings keep the old `states: ['focus']` API. Objects add selector metadata while still matching
 * persisted state data by label, because existing saved states may have generated ids.
 */
export function normalizeConfiguredStyleStates(states: readonly StyleConfiguredState[] | null | undefined) {
    const normalizedStates: Array<{ label: string; selectors?: readonly string[] }> = [];
    const seenLabels = new Set<string>();

    for (const state of states || []) {
        const normalizedState = normalizeConfiguredStyleState(state);
        if (!normalizedState || seenLabels.has(normalizedState.label)) continue;

        normalizedStates.push(normalizedState);
        seenLabels.add(normalizedState.label);
    }

    return normalizedStates;
}

function normalizeConfiguredStyleState(state: StyleConfiguredState) {
    if (typeof state === 'string') return state ? { label: state } : null;
    if (!state || typeof state !== 'object' || Array.isArray(state) || typeof state.label !== 'string') return null;

    const selectors = [state.selector, ...(Array.isArray(state.selectors) ? state.selectors : [])].filter(
        (selector): selector is string => typeof selector === 'string' && selector.includes('&')
    );

    return selectors.length ? { label: state.label, selectors } : { label: state.label };
}

/**
 * Removes duplicate/empty states and excludes the internal base state.
 */
export function getUniqueStates(states: readonly StyleStateDescriptor[]) {
    const normalizedStates: StyleStateDescriptor[] = [];
    const seenStateIds = new Set<string>();

    for (const state of states) {
        if (!state.id || state.id === 'base' || seenStateIds.has(state.id)) continue;

        normalizedStates.push(state);
        seenStateIds.add(state.id);
    }

    return normalizedStates;
}

/**
 * Returns the CSS selector for a state rule, plus diagnostics when a state cannot be represented.
 */
export function getStateRuleSelectors({
    state,
    surface,
    source,
    mode,
}: {
    state: StyleStateDescriptor;
    surface: StyleSurface;
    source: StyleElementReader | StyleSectionReader;
    mode?: StyleCompilerMode;
}): { selector?: string; diagnostics: StyleDiagnostic[] } {
    const parentState = state.parent;
    const includeForcedStateSelectors = mode === 'editor';
    const selectors: string[] = [];

    if (parentState) {
        const parentSelector = parentState.selector || resolveParentSelector(parentState.uid, source);
        if (parentSelector) {
            if (parentState.selectors?.length) {
                selectors.push(
                    ...parentState.selectors.flatMap(selector =>
                        splitCssSelectorList(selector).map(selectorPart => {
                            const configuredParentSelector = mapSelectorList(parentSelector, parentSelectorPart =>
                                selectorPart.replaceAll('&', parentSelectorPart)
                            );
                            const ruleSelector = prependParentSelector(surface.selector, configuredParentSelector);
                            return gatePreviewOnlySelectorInEditor(ruleSelector, selectorPart, mode);
                        })
                    )
                );
            }

            const nativePseudoClass = getNativeStyleStatePseudoClass(parentState.stateId);
            if (nativePseudoClass) {
                selectors.push(
                    gateSelectorInEditorPreview(
                        prependParentPseudoClass(surface.selector, parentSelector, nativePseudoClass),
                        mode
                    )
                );
            }

            if (!parentState.selectors?.length && !nativePseudoClass) {
                selectors.push(
                    prependParentStateAttribute(surface.selector, parentSelector, 'data-ww-states', parentState.stateId)
                );
            }

            if (includeForcedStateSelectors) {
                selectors.push(
                    prependParentStateAttribute(
                        surface.selector,
                        parentSelector,
                        'data-ww-forced-states',
                        parentState.stateId
                    )
                );
            }
        }
    } else {
        if (state.selectors?.length) {
            selectors.push(
                ...state.selectors.flatMap(selector =>
                    splitCssSelectorList(selector).map(selectorPart =>
                        gatePreviewOnlySelectorInEditor(
                            mapSelectorList(surface.selector, surfaceSelectorPart =>
                                selectorPart.replaceAll('&', surfaceSelectorPart)
                            ),
                            selectorPart,
                            mode
                        )
                    )
                )
            );
        }

        const nativePseudoClass = getNativeStyleStatePseudoClass(state.id);
        if (nativePseudoClass) {
            selectors.push(gateSelectorInEditorPreview(appendPseudoClass(surface.selector, nativePseudoClass), mode));
        }
    }

    if (!selectors.length && !parentState) {
        // Custom states still depend on the runtime state attribute.
        selectors.push(appendStateAttribute(surface.selector, state.id));
    }

    if (selectors.length && !parentState && includeForcedStateSelectors) {
        selectors.push(appendForcedStateAttribute(surface.selector, state.id));
    }

    if (selectors.length) return { selector: joinSelectors(selectors), diagnostics: [] };

    return {
        diagnostics: [
            {
                code: 'state-selector-unresolved',
                surface,
                selector: surface.selector,
                message: `Could not resolve CSS selector for state ${state.id}.`,
            },
        ],
    };
}

/**
 * Returns the native pseudo class for a known WeWeb state name.
 */
export function getNativeStyleStatePseudoClass(state: string) {
    return NATIVE_STYLE_STATE_PSEUDO_CLASSES[state] || null;
}

/**
 * Transient browser interaction states must only react to the rendered DOM in editor Preview mode.
 * `:where()` keeps the mode marker from increasing the generated selector specificity.
 */
function gateSelectorInEditorPreview(selector: string, mode?: StyleCompilerMode) {
    if (mode !== 'editor') return selector;
    return mapSelectorList(selector, selectorPart => `${EDITOR_PREVIEW_SELECTOR} ${selectorPart}`);
}

/**
 * Configured selectors can contain arbitrary structural states such as `:disabled` or `[aria-selected]`.
 * Only the known pointer/focus pseudo-classes are transient editor interactions. Matching the configured
 * selector also handles nested forms such as `&:has(input:focus)` without component-specific metadata.
 */
function gatePreviewOnlySelectorInEditor(selector: string, configuredSelector: string, mode?: StyleCompilerMode) {
    return EDITOR_PREVIEW_ONLY_PSEUDO_CLASS_RE.test(configuredSelector)
        ? gateSelectorInEditorPreview(selector, mode)
        : selector;
}

/**
 * Appends a native pseudo class to a surface selector.
 */
function appendPseudoClass(selector: string, pseudoClass: string) {
    return mapSelectorList(selector, selectorPart => `${selectorPart}${pseudoClass}`);
}

/**
 * Creates a parent-state selector such as `.parent:hover .child`.
 */
function prependParentPseudoClass(selector: string, parentSelector: string, pseudoClass: string) {
    return combineParentAndChildSelectors(
        selector,
        parentSelector,
        parentSelectorPart => `${parentSelectorPart}${pseudoClass}`
    );
}

/**
 * Creates a parent-state selector such as `.parent:focus-within .child`.
 */
function prependParentSelector(selector: string, parentSelector: string) {
    return combineParentAndChildSelectors(selector, parentSelector);
}

/**
 * Creates a parent state attribute selector such as `.parent[data-ww-forced-states~="focus"] .child`.
 */
function prependParentStateAttribute(
    selector: string,
    parentSelector: string,
    attribute: 'data-ww-states' | 'data-ww-forced-states',
    state: string
) {
    const attributeSelector = createStateAttributeSelector(attribute, state);
    return combineParentAndChildSelectors(
        selector,
        parentSelector,
        parentSelectorPart => `${parentSelectorPart}${attributeSelector}`
    );
}

/**
 * Appends the runtime state attribute selector for custom runtime states.
 */
function appendStateAttribute(selector: string, state: string) {
    const attributeSelector = createStateAttributeSelector('data-ww-states', state);
    return mapSelectorList(selector, selectorPart => `${selectorPart}${attributeSelector}`);
}

/**
 * Appends the editor-only forced-state attribute selector.
 */
function appendForcedStateAttribute(selector: string, state: string) {
    const attributeSelector = createStateAttributeSelector('data-ww-forced-states', state);
    return mapSelectorList(selector, selectorPart => `${selectorPart}${attributeSelector}`);
}

function createStateAttributeSelector(attribute: 'data-ww-states' | 'data-ww-forced-states', state: string) {
    return `[${attribute}~="${escapeCssString(state)}"]`;
}

/**
 * Joins selectors while removing duplicates from fallback/native combinations.
 */
function joinSelectors(selectors: string[]) {
    return [...new Set(selectors)].join(',\n');
}

function mapSelectorList(selector: string, callback: (selectorPart: string) => string) {
    return splitCssSelectorList(selector).map(callback).join(',\n');
}

function combineParentAndChildSelectors(
    selector: string,
    parentSelector: string,
    mapParentSelector: (parentSelectorPart: string) => string = parentSelectorPart => parentSelectorPart
) {
    const selectors: string[] = [];

    for (const parentSelectorPart of splitCssSelectorList(parentSelector)) {
        for (const selectorPart of splitCssSelectorList(selector)) {
            selectors.push(`${mapParentSelector(parentSelectorPart)} ${selectorPart}`);
        }
    }

    return selectors.join(',\n');
}
