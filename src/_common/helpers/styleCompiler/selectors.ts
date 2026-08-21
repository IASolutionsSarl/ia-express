import { escapeCssIdentifier, escapeCssString } from './serialization';
import type {
    StyleElementReader,
    StyleLibraryLayer,
    StyleRuleGroup,
    StyleSectionReader,
    StyleSurface,
    StyleSurfaceKind,
} from './types';

type ElementSurfaceOptions = {
    key?: string;
    selector?: string;
    layoutSelector?: string;
    runtimeScopeSelector?: string;
    libraryLayer?: StyleLibraryLayer;
};

/**
 * Creates the compiler-owned class applied to rendered element surfaces.
 */
export function createElementClassName(uid: string) {
    return `ww-element-${uid}`;
}

/**
 * Creates the default selector for an element surface.
 */
export function createElementSelector(uid: string) {
    return `.${escapeCssIdentifier(createElementClassName(uid))}`;
}

/**
 * Creates selectors for layout CSS owned by an element source.
 *
 * `wwLayout` can be the component root or an internal layout node inside a custom/coded component.
 * Internal layouts expose every renderless root/instance scope that owns them. The token selector
 * prevents an element from styling layouts owned by child elements.
 */
export function createElementLayoutSelector(uid: string, selector = createElementSelector(uid)) {
    return `${appendCssSelector(selector, '.ww-layout')},\n${createElementDescendantLayoutSelector(uid, selector)}`;
}

/**
 * Creates selectors for internal layout nodes owned by an element source.
 */
export function createElementDescendantLayoutSelector(uid: string, selector = createElementSelector(uid)) {
    const scopedLayoutSelector = `[data-ww-layout-style-scopes~="${escapeCssString(uid)}"]`;

    return splitCssSelectorList(selector)
        .map(selectorPart => `${selectorPart} ${scopedLayoutSelector}`)
        .join(',\n');
}

/**
 * Creates the default selector for a section container surface.
 */
export function createSectionContainerSelector(uid: string) {
    return `.ww-section-${escapeCssIdentifier(uid)}`;
}

/**
 * Creates the default selector for a section inner element surface.
 */
export function createSectionElementSelector(uid: string) {
    return `${createSectionContainerSelector(uid)} > .ww-section-element`;
}

/**
 * Creates selectors for layout CSS owned by a section source.
 */
export function createSectionLayoutSelector(uid: string) {
    const sectionElementSelector = createSectionElementSelector(uid);

    return `${sectionElementSelector}.ww-layout`;
}

/**
 * Appends a suffix to each selector in a comma-separated selector list.
 */
export function appendCssSelector(selector: string, suffix: string) {
    return splitCssSelectorList(selector)
        .map(selectorPart => `${selectorPart}${suffix}`)
        .join(',\n');
}

/**
 * Keeps selector matching intact while removing its specificity contribution.
 *
 * This is useful for behavioral rules whose precedence is owned by compiler source order rather
 * than by the shape of a state, library definition, or instance selector.
 */
export function zeroCssSelectorSpecificity(selector: string) {
    return splitCssSelectorList(selector)
        .map(selectorPart => `:where(${selectorPart})`)
        .join(',\n');
}

/**
 * Splits a CSS selector list on top-level commas only.
 *
 * Selectors can contain commas inside functional pseudo-classes or attribute values, for example
 * `:is(.a, .b)` or `[data-label=","]`. The runtime stylesheet uses this when replacing the static
 * source selector with a mounted instance selector.
 */
export function splitCssSelectorList(selector: string) {
    const parts: string[] = [];
    let currentPart = '';
    let quote: '"' | "'" | null = null;
    let isEscaped = false;
    let bracketDepth = 0;
    let parenthesisDepth = 0;

    for (const char of selector) {
        if (isEscaped) {
            currentPart += char;
            isEscaped = false;
            continue;
        }

        if (char === '\\') {
            currentPart += char;
            isEscaped = true;
            continue;
        }

        if (quote) {
            currentPart += char;
            if (char === quote) quote = null;
            continue;
        }

        if (char === '"' || char === "'") {
            quote = char;
            currentPart += char;
            continue;
        }

        if (char === '[') {
            bracketDepth++;
        } else if (char === ']') {
            bracketDepth = Math.max(0, bracketDepth - 1);
        } else if (char === '(') {
            parenthesisDepth++;
        } else if (char === ')') {
            parenthesisDepth = Math.max(0, parenthesisDepth - 1);
        } else if (char === ',' && bracketDepth === 0 && parenthesisDepth === 0) {
            addSelectorPart(parts, currentPart);
            currentPart = '';
            continue;
        }

        currentPart += char;
    }

    addSelectorPart(parts, currentPart);
    return parts;
}

function addSelectorPart(parts: string[], selectorPart: string) {
    const trimmedPart = selectorPart.trim();
    if (trimmedPart) parts.push(trimmedPart);
}

/**
 * Builds an element style surface from an element reader.
 */
export function createElementStyleSurface(
    source: StyleElementReader,
    group: StyleRuleGroup,
    options: ElementSurfaceOptions = {}
): StyleSurface {
    const uid = source.uid();
    const selector = options.selector || source.selector?.() || createElementSelector(uid);

    return {
        key: options.key || `element:${uid}`,
        group,
        kind: 'element',
        selector,
        runtimeScopeSelector: options.runtimeScopeSelector || selector,
        libraryLayer: options.libraryLayer,
    };
}

/**
 * Builds an element-owned layout surface from an element reader.
 */
export function createElementLayoutStyleSurface(
    source: StyleElementReader,
    group: StyleRuleGroup,
    options: ElementSurfaceOptions = {}
): StyleSurface {
    const uid = source.uid();

    return {
        key: options.key ? `${options.key}:layout` : `element-layout:${uid}`,
        group,
        kind: 'element-layout',
        selector: options.layoutSelector || createElementLayoutSelector(uid, options.selector),
        runtimeScopeSelector: options.runtimeScopeSelector || createElementSelector(uid),
        libraryLayer: options.libraryLayer,
    };
}

/**
 * Builds a section style surface from a section reader and a section DOM surface.
 */
export function createSectionStyleSurface(
    source: StyleSectionReader,
    kind: Extract<StyleSurfaceKind, 'section-container' | 'section-element'>,
    group: StyleRuleGroup
): StyleSurface {
    const uid = source.uid();
    const defaultSelector = kind === 'section-container' ? createSectionContainerSelector(uid) : createSectionElementSelector(uid);
    const selector = source.selector?.() || defaultSelector;

    return {
        key: `${kind}:${uid}`,
        group,
        kind,
        selector,
        runtimeScopeSelector: selector,
    };
}

/**
 * Builds a section-owned layout surface from a section reader.
 */
export function createSectionLayoutStyleSurface(source: StyleSectionReader, group: StyleRuleGroup): StyleSurface {
    const uid = source.uid();

    return {
        key: `section-layout:${uid}`,
        group,
        kind: 'section-layout',
        selector: createSectionLayoutSelector(uid),
        runtimeScopeSelector: createSectionElementSelector(uid),
    };
}

/**
 * Resolves the selector used for a parent state.
 */
export function resolveParentSelector(parentUid: string, source: StyleElementReader | StyleSectionReader) {
    const parentRef = source.parentRef();
    if (parentRef?.uid === parentUid && parentRef.selector) return parentRef.selector;

    return createElementSelector(parentUid);
}
