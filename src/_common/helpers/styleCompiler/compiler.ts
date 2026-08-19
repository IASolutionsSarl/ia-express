import { getStyleBreakpointRangeMediaQuery, STYLE_BREAKPOINTS, type StyleBreakpointDefinition } from './breakpoints';
import {
    createCustomCssDeclaration,
    createKeyframesRule,
    getDeclarationResolvers,
    type CompiledStyleDeclaration,
    type CompiledStyleRuleTarget,
    type DeclarationScope,
} from './declarations';
import {
    registerCssDeclarationDynamicReferences,
    serializeCssDeclarationValue,
    serializeCssProperty,
    splitLegacyCssPriority,
} from './serialization';
import { createStyleEffectScope } from './scope';
import { getStateRuleSelectors, getUniqueStates } from './states';
import {
    createStyleTargetDescriptors,
    createStyleTargetSurfaces,
    readStyleTargetSource,
    type StyleSourceReader,
    type StyleTargetDescriptor,
} from './targets';
import {
    collectStringifiedDynamicCssVariableReferences,
    createStyleSlotContext,
    isStyleDynamicVariableReference,
    resolveCustomCssProperties,
} from './values';
import type {
    StyleCompiler,
    StyleCompilerInput,
    StyleDynamicVariable,
    StyleLibraryLayer,
    StyleStringifiedDynamicVariableReference,
    StylePropertyDomain,
    StyleRegisteredProperty,
    StyleRule,
    StyleRuleGroup,
    StyleRuleAdapter,
    StyleRuleContainerAdapter,
    StyleScopeDispose,
    StyleScopeStop,
    StyleStyleRule,
    StyleStyleRuleAdapter,
    StyleSurface,
    StyleRuntime,
} from './types';
import { STATIC_STYLE_RUNTIME, STYLE_LIBRARY_LAYER_ORDER, STYLE_RULE_GROUP_LAYERS, STYLE_RULE_GROUPS } from './types';

const ORDER_SENSITIVE_TARGET_GROUPS: readonly StyleRuleGroup[] = ['library'];
const STYLE_DECLARATION_LAYER_ORDER = ['normal', 'custom'] as const;
type StyleDeclarationLayer = (typeof STYLE_DECLARATION_LAYER_ORDER)[number];
type StyleLayerContainerKey = Exclude<StyleRuleGroup, 'library'> | `library:${StyleLibraryLayer}`;
type StyleDeclarationLayerContainers = Record<StyleDeclarationLayer, StyleRuleContainerAdapter>;

/**
 * Creates the shared stylesheet compiler.
 *
 * The compiler walks the requested page sources, opens a reactive/static scope per level, and
 * delegates the actual CSS output to the stylesheet adapter. Publisher calls can use the static
 * scope; editor calls can inject Vue-backed scopes.
 */
export function createStyleCompiler(): StyleCompiler {
    return new StyleCompilerImpl();
}

class StyleCompilerImpl implements StyleCompiler {
    compileStylesheet<TResult>(input: StyleCompilerInput<TResult>) {
        const runtime = input.runtime || STATIC_STYLE_RUNTIME;
        const layerContainers =
            input.mode === 'runtime' ? createNoopLayerContainers() : createGeneratedLayerContainers(input.stylesheet);
        const targetStops = new Map<string, StyleScopeStop>();
        const targetOrderSignatures = new Map<StyleRuleGroup, string>();
        const stopRoot = createStyleEffectScope(runtime, () => {
            this.reconcileStyleTargets(input, runtime, targetStops, targetOrderSignatures, layerContainers);
        });

        return {
            result: input.stylesheet.result(),
            stop: createStylesheetStop(stopRoot, targetStops),
        };
    }

    private reconcileStyleTargets(
        input: StyleCompilerInput,
        runtime: StyleRuntime,
        targetStops: Map<string, StyleScopeStop>,
        targetOrderSignatures: Map<StyleRuleGroup, string>,
        layerContainers: Map<StyleLayerContainerKey, StyleDeclarationLayerContainers>
    ) {
        const targets = createStyleTargetDescriptors(input);
        const activeTargetKeys = new Set<string>();

        this.reconcileOrderSensitiveTargetGroups(targets, targetStops, targetOrderSignatures);

        for (const target of targets) {
            activeTargetKeys.add(target.key);
            if (targetStops.has(target.key)) continue;

            const stopTarget = createStyleEffectScope(runtime, onDispose => {
                this.compileTarget(input, onDispose, target, layerContainers);
            });
            targetStops.set(target.key, stopTarget);
        }

        for (const targetKey of [...targetStops.keys()]) {
            if (activeTargetKeys.has(targetKey)) continue;

            stopTarget(targetStops, targetKey);
        }
    }

    private reconcileOrderSensitiveTargetGroups(
        targets: StyleTargetDescriptor[],
        targetStops: Map<string, StyleScopeStop>,
        targetOrderSignatures: Map<StyleRuleGroup, string>
    ) {
        for (const group of ORDER_SENSITIVE_TARGET_GROUPS) {
            const signature = targets
                .filter(target => target.group === group)
                .map(target => target.key)
                .join('|');
            const previousSignature = targetOrderSignatures.get(group);

            targetOrderSignatures.set(group, signature);
            if (previousSignature === undefined || previousSignature === signature) continue;

            for (const targetKey of [...targetStops.keys()]) {
                if (targetKey.startsWith(`${group}:`)) stopTarget(targetStops, targetKey);
            }
        }
    }

    private compileTarget(
        input: StyleCompilerInput,
        onDispose: StyleScopeDispose,
        target: StyleTargetDescriptor,
        layerContainers: Map<StyleLayerContainerKey, StyleDeclarationLayerContainers>
    ) {
        const source = readStyleTargetSource(input.reader, target);
        if (!source) return;

        const targetInput = createTargetScopedInput(input, onDispose);
        const ruleAdapters: StyleRuleAdapter[] = [];

        onDispose(() => {
            for (let index = ruleAdapters.length - 1; index >= 0; index--) {
                ruleAdapters[index].dispose();
            }
        });

        for (const surface of createStyleTargetSurfaces(source, target)) {
            const declarationLayerContainers = layerContainers.get(getStyleLayerContainerKey(surface));
            if (!declarationLayerContainers) continue;

            this.compileSurfaceRules(targetInput, ruleAdapters, source, surface, declarationLayerContainers, target);
        }
    }

    private compileSurfaceRules(
        input: StyleCompilerInput,
        ruleAdapters: StyleRuleAdapter[],
        source: StyleSourceReader,
        surface: StyleSurface,
        layerContainers: StyleDeclarationLayerContainers,
        target: StyleTargetDescriptor
    ) {
        // The base state always exists. Additional states come from the reader and are normalized
        // before generating rules so duplicate/base aliases do not create extra CSS.
        const states = [{ id: 'base' }, ...getUniqueStates(source.states())];

        for (const state of states) {
            const selectorResult =
                state.id === 'base'
                    ? { selector: surface.selector, diagnostics: [] }
                    : getStateRuleSelectors({
                          state,
                          surface,
                          source,
                          mode: input.mode,
                      });

            for (const diagnostic of selectorResult.diagnostics) {
                input.stylesheet.diagnostic?.(diagnostic);
            }

            if (!selectorResult.selector) continue;

            // Rule insertion order inside a target chunk is the cascade order: base state first,
            // then configured states; inside each state, default/tablet/mobile breakpoints.
            for (const breakpoint of STYLE_BREAKPOINTS) {
                this.compileBreakpoint(
                    input,
                    ruleAdapters,
                    source,
                    surface,
                    layerContainers,
                    state.id,
                    breakpoint,
                    selectorResult.selector,
                    getTargetEmitDefaultDeclarations(source, target)
                );
            }
        }
    }

    private compileBreakpoint(
        input: StyleCompilerInput,
        ruleAdapters: StyleRuleAdapter[],
        source: StyleSourceReader,
        surface: StyleSurface,
        layerContainers: StyleDeclarationLayerContainers,
        state: string,
        breakpoint: StyleBreakpointDefinition,
        selector: string,
        emitDefaultDeclarations: boolean
    ) {
        const slots = new Map<StylePropertyDomain, ReturnType<typeof createStyleSlotContext>>();
        const scope: DeclarationScope = {
            surface,
            input,
            source,
            state,
            breakpoint: breakpoint.name,
            emitDefaultDeclarations,
            slot(domain) {
                const cachedSlot = slots.get(domain);
                if (cachedSlot) return cachedSlot;

                const slot = createStyleSlotContext({
                    source,
                    state,
                    domain,
                });
                slots.set(domain, slot);
                return slot;
            },
        };
        const normalRules = createBreakpointRuleAccessors(layerContainers.normal, 'normal');
        const customRules = createBreakpointRuleAccessors(layerContainers.custom, 'custom');

        for (const resolveDeclarations of getDeclarationResolvers(surface)) {
            const { result: declarations, references } = collectStringifiedDynamicCssVariableReferences(() =>
                resolveDeclarations(scope)
            );
            for (const declaration of declarations) {
                if (!declaration) continue;

                this.applyDeclaration(input, normalRules.getRule, declaration, surface, selector, references);
            }
        }

        if (shouldCompileCustomCss(surface)) {
            this.compileCustomCssEntries(input, customRules.getRule, scope, surface, selector);
        }

        // The slot-scoped `@keyframes` block is emitted in the SAME slot/container as its matching
        // `animation-name` declaration (createAnimationNameDeclaration also delegates to
        // createKeyframesRule, so names stay in sync). `read()` is own-slot, so this only fires for the
        // exact state/breakpoint that defines the keyframes — going into the media container for
        // responsive slots. Runtime mode registers dynamic variables only, so it skips static CSS.
        if (input.mode !== 'runtime' && surface.kind === 'element') {
            const keyframes = createKeyframesRule(scope);
            if (keyframes) {
                const keyframesAdapter = normalRules.getRuleContainer().insertRule({
                    kind: 'keyframes',
                    key: `keyframes:${createStyleRuleKey({ surface, state, breakpoint })}`,
                    name: keyframes.name,
                    css: keyframes.css,
                });
                ruleAdapters.push(keyframesAdapter);
            }
        }

        function createBreakpointRuleAccessors(
            layerContainer: StyleRuleContainerAdapter,
            declarationLayer: StyleDeclarationLayer
        ) {
            const rules = new Map<string, StyleStyleRuleAdapter>();
            const mediaContainers = new Map<string, StyleRuleContainerAdapter>();
            const getRuleContainer = (target?: CompiledStyleRuleTarget) => {
                const mediaQuery = target?.mediaQuery || breakpoint.mediaQuery;
                if (!mediaQuery) return layerContainer;

                const cachedContainer = mediaContainers.get(mediaQuery);
                if (cachedContainer) return cachedContainer;

                const mediaContainer = layerContainer.insertRule({
                    kind: 'media',
                    key: `media:${declarationLayer}:${createStyleRuleKey({
                        surface,
                        state,
                        breakpoint,
                    })}:${escapeRuleKeyPart(mediaQuery)}`,
                    query: mediaQuery,
                });
                mediaContainers.set(mediaQuery, mediaContainer);
                ruleAdapters.push(mediaContainer);
                return mediaContainer;
            };
            const getRule = (target?: CompiledStyleRuleTarget) => {
                const targetKey = target?.keySuffix || '';
                const cachedRule = rules.get(targetKey);
                if (cachedRule) return cachedRule;

                const rule = getRuleContainer(target).insertRule(
                    createStyleRule({
                        surface,
                        state,
                        breakpoint,
                        selector,
                        target,
                    })
                );
                rules.set(targetKey, rule);
                ruleAdapters.push(rule);
                return rule;
            };

            return { getRule, getRuleContainer };
        }
    }

    private compileCustomCssEntries(
        input: StyleCompilerInput,
        getRule: (target?: CompiledStyleRuleTarget) => StyleStyleRuleAdapter,
        scope: DeclarationScope,
        surface: StyleSurface,
        selector: string
    ) {
        // Legacy Custom CSS is one whole responsive property. Mutually-exclusive ranges let an
        // explicit `{}` or partial map replace the inherited map without leaking desktop keys.
        const { result: customCss, references } = collectStringifiedDynamicCssVariableReferences(() =>
            resolveCustomCssProperties({
                input,
                surface,
                source: scope.source,
                state: scope.state,
                breakpoint: scope.breakpoint,
                slot: scope.slot('style'),
            })
        );
        const rule: CompiledStyleRuleTarget | undefined = customCss.useBreakpointRange
            ? {
                  keySuffix: 'custom-css-breakpoint-range',
                  selector,
                  mediaQuery: getStyleBreakpointRangeMediaQuery(scope.breakpoint),
              }
            : undefined;

        for (const { property, value } of customCss.properties) {
            const declaration = createCustomCssDeclaration({
                property,
                value,
                rule,
            });
            if (declaration) {
                this.applyDeclaration(input, getRule, declaration, surface, selector, references);
            }
        }
    }

    private applyDeclaration(
        input: StyleCompilerInput,
        getRule: (target?: CompiledStyleRuleTarget) => StyleStyleRuleAdapter,
        declaration: CompiledStyleDeclaration,
        surface: StyleSurface,
        selector: string,
        dynamicReferences: readonly StyleStringifiedDynamicVariableReference[] = []
    ) {
        const cssProperty = serializeCssProperty(declaration.property);
        const ruleTarget = declaration.rule;
        const ruleSelector = ruleTarget?.selector || selector;

        if (
            input.mode === 'runtime' &&
            !dynamicReferences.length &&
            !isStyleDynamicVariableReference(declaration.value)
        ) {
            return;
        }

        const cssValue = cssProperty ? serializeCssDeclarationValue(cssProperty, declaration.value) : undefined;

        // Unsupported WeWeb value types cannot be sent to CSSOM. CSS grammar validity is decided by
        // the stylesheet adapter below.
        if (!cssProperty || !cssValue) {
            addSerializationDiagnostic(input, surface, ruleSelector, declaration, cssProperty ? 'value' : 'property');
            return;
        }

        if (input.mode === 'runtime') {
            registerCssDeclarationDynamicReferences(cssProperty, declaration.value, cssValue, {
                selector: ruleSelector,
                dynamicReferences,
            });
            return;
        }

        const { value, priority } = splitLegacyCssPriority(cssProperty, cssValue);
        const accepted = getRule(ruleTarget).style.setProperty(cssProperty, value, priority);
        if (accepted === false) {
            addSerializationDiagnostic(
                input,
                surface,
                ruleSelector,
                declaration,
                isCssPropertyName(cssProperty) ? 'value' : 'property'
            );
            return;
        }

        registerCssDeclarationDynamicReferences(cssProperty, declaration.value, value, {
            selector: ruleSelector,
            dynamicReferences,
        });
    }
}

/**
 * Creates the fixed generated layer tree once per compiler run.
 */
function createGeneratedLayerContainers(stylesheet: StyleCompilerInput['stylesheet']) {
    const layerContainers = new Map<StyleLayerContainerKey, StyleDeclarationLayerContainers>();
    for (const group of STYLE_RULE_GROUPS) {
        const groupLayer = stylesheet.insertRule({
            kind: 'layer',
            key: group,
            name: STYLE_RULE_GROUP_LAYERS[group],
        });
        if (group !== 'library') {
            layerContainers.set(group, createDeclarationLayerContainers(groupLayer, group));
            continue;
        }

        groupLayer.insertRule({
            kind: 'layer-statement',
            key: 'library-layer-order',
            names: STYLE_LIBRARY_LAYER_ORDER,
        });
        for (const libraryLayer of STYLE_LIBRARY_LAYER_ORDER) {
            const libraryLayerContainer = groupLayer.insertRule({
                kind: 'layer',
                key: libraryLayer,
                name: libraryLayer,
            });
            layerContainers.set(
                `library:${libraryLayer}`,
                createDeclarationLayerContainers(libraryLayerContainer, `library:${libraryLayer}`)
            );
        }
    }

    return layerContainers;
}

function createDeclarationLayerContainers(
    parent: StyleRuleContainerAdapter,
    keyPrefix: string
): StyleDeclarationLayerContainers {
    parent.insertRule({
        kind: 'layer-statement',
        key: `${keyPrefix}:declaration-layer-order`,
        names: STYLE_DECLARATION_LAYER_ORDER,
    });

    return {
        normal: parent.insertRule({
            kind: 'layer',
            key: `${keyPrefix}:normal`,
            name: 'normal',
        }),
        custom: parent.insertRule({
            kind: 'layer',
            key: `${keyPrefix}:custom`,
            name: 'custom',
        }),
    };
}

/**
 * Runtime mode only needs declaration serialization to register dynamic variable metadata.
 * Static generated rules are intentionally discarded.
 */
function createNoopLayerContainers() {
    const layerContainers = new Map<StyleLayerContainerKey, StyleDeclarationLayerContainers>();
    const container = createNoopRuleContainerAdapter();
    const declarationLayerContainers = { normal: container, custom: container };
    for (const group of STYLE_RULE_GROUPS) {
        if (group !== 'library') {
            layerContainers.set(group, declarationLayerContainers);
            continue;
        }

        for (const libraryLayer of STYLE_LIBRARY_LAYER_ORDER) {
            layerContainers.set(`library:${libraryLayer}`, declarationLayerContainers);
        }
    }

    return layerContainers;
}

function getStyleLayerContainerKey(surface: StyleSurface): StyleLayerContainerKey {
    if (surface.group !== 'library') return surface.group;

    return `library:${surface.libraryLayer || 'definition'}`;
}

function createNoopRuleContainerAdapter(): StyleRuleContainerAdapter {
    const ruleAdapter = {
        dispose() {},
    } satisfies StyleRuleAdapter;
    const styleRuleAdapter = {
        ...ruleAdapter,
        style: {
            setProperty() {
                return false;
            },
            removeProperty() {},
        },
    } satisfies StyleStyleRuleAdapter;

    const containerAdapter = {
        insertRule(rule: StyleRule) {
            return rule.kind === 'style' ? styleRuleAdapter : containerAdapter;
        },
        dispose() {},
    } satisfies StyleRuleContainerAdapter;

    return containerAdapter;
}

/**
 * Wraps `dynamicVariable()` so variable registrations are owned by the target chunk that emitted
 * them. When that chunk reruns or disappears, the editor runtime can clear stale CSS-var writers.
 */
function createTargetScopedInput(input: StyleCompilerInput, onDispose: StyleScopeDispose): StyleCompilerInput {
    const registerDynamicVariable = input.stylesheet.dynamicVariable;
    const registerProperty = input.mode === 'runtime' ? undefined : input.stylesheet.registerProperty;
    if (!registerDynamicVariable && !registerProperty) return input;

    const dynamicVariableKeys = new Set<string>();
    const dynamicVariableCleanups: StyleScopeStop[] = [];
    const registeredPropertyKeys = new Set<string>();
    const registeredPropertyCleanups: StyleScopeStop[] = [];
    onDispose(() => {
        for (let index = dynamicVariableCleanups.length - 1; index >= 0; index--) {
            dynamicVariableCleanups[index]();
        }
        for (let index = registeredPropertyCleanups.length - 1; index >= 0; index--) {
            registeredPropertyCleanups[index]();
        }
        dynamicVariableKeys.clear();
        dynamicVariableCleanups.length = 0;
        registeredPropertyKeys.clear();
        registeredPropertyCleanups.length = 0;
    });

    const stylesheet: StyleCompilerInput['stylesheet'] = {
        ...input.stylesheet,
        registerProperty: registerProperty
            ? (property: StyleRegisteredProperty) => {
                  const key = createRegisteredPropertyKey(property);
                  if (registeredPropertyKeys.has(key)) return;

                  registeredPropertyKeys.add(key);
                  const cleanup = registerProperty.call(input.stylesheet, property);
                  if (cleanup) registeredPropertyCleanups.push(cleanup);
              }
            : undefined,
        dynamicVariable(variable) {
            const key = createDynamicVariableKey(variable);
            if (dynamicVariableKeys.has(key)) return;

            dynamicVariableKeys.add(key);
            const cleanup = registerDynamicVariable?.call(input.stylesheet, variable);
            if (cleanup) dynamicVariableCleanups.push(cleanup);
        },
    };

    return {
        ...input,
        stylesheet,
    };
}

function createRegisteredPropertyKey(property: StyleRegisteredProperty) {
    return property.name;
}

function createDynamicVariableKey(variable: StyleDynamicVariable) {
    return [
        variable.group,
        variable.surface.libraryLayer || '',
        variable.sourceUid,
        variable.surface.key,
        variable.domain,
        variable.property,
        variable.state,
        variable.breakpoint,
        variable.name,
        variable.kind || '',
        variable.keyframesName || '',
        variable.outputKey || '',
        variable.omitWhenUndefined ? 'omit-undefined' : '',
        stringifyDynamicVariableValueNormalizer(variable.valueNormalizer),
        variable.validationProperty,
        variable.selector,
        variable.cssProperty,
    ].join('\u001f');
}

function stringifyDynamicVariableValueNormalizer(valueNormalizer: StyleDynamicVariable['valueNormalizer']) {
    if (!valueNormalizer) return '';

    return JSON.stringify(valueNormalizer);
}

/**
 * Creates an idempotent stop for the root list watcher and all live target scopes.
 */
function createStylesheetStop(stopRoot: StyleScopeStop, targetStops: Map<string, StyleScopeStop>) {
    let stopped = false;

    return () => {
        if (stopped) return;

        stopped = true;
        stopRoot();
        stopTargets(targetStops);
    };
}

/**
 * Stops one target scope and removes it from the registry.
 */
function stopTarget(targetStops: Map<string, StyleScopeStop>, targetKey: string) {
    const stop = targetStops.get(targetKey);
    if (!stop) return;

    targetStops.delete(targetKey);
    stop();
}

/**
 * Stops all target scopes in reverse creation order.
 */
function stopTargets(targetStops: Map<string, StyleScopeStop>) {
    const stops = [...targetStops.values()].reverse();
    targetStops.clear();

    for (const stop of stops) {
        stop();
    }
}

/**
 * Creates the rule identity used by adapters to materialize CSS.
 */
function createStyleRule({
    surface,
    state,
    breakpoint,
    selector,
    target,
}: {
    surface: StyleSurface;
    state: string;
    breakpoint: StyleBreakpointDefinition;
    selector: string;
    target?: CompiledStyleRuleTarget;
}): StyleStyleRule {
    const baseKey = createStyleRuleKey({ surface, state, breakpoint });

    return {
        kind: 'style',
        key: target ? `${baseKey}:target:${escapeRuleKeyPart(target.keySuffix)}` : baseKey,
        surface,
        selector: target?.selector || selector,
    };
}

/**
 * Creates a stable key for one surface/state/breakpoint rule.
 */
function createStyleRuleKey({
    surface,
    state,
    breakpoint,
}: {
    surface: StyleSurface;
    state: string;
    breakpoint: StyleBreakpointDefinition;
}) {
    return `${surface.key}:state:${escapeRuleKeyPart(state)}:breakpoint:${escapeRuleKeyPart(breakpoint.name)}`;
}

/**
 * Reports a declaration that could not be represented or was ignored by the backing CSSOM.
 */
function addSerializationDiagnostic(
    input: StyleCompilerInput,
    surface: StyleSurface,
    selector: string,
    declaration: CompiledStyleDeclaration,
    reason: 'property' | 'value'
) {
    if (declaration.value === undefined || declaration.value === null || declaration.value === '') return;

    input.stylesheet.diagnostic?.({
        code: reason === 'property' ? 'css-property-fallback' : 'css-value-fallback',
        surface,
        selector,
        property: declaration.property,
        message:
            reason === 'property'
                ? `Could not safely serialize CSS property ${declaration.property}.`
                : `Could not safely serialize ${declaration.property}.`,
    });
}

/** Used only to select a useful diagnostic; CSSOM remains the validity authority. */
function isCssPropertyName(property: string) {
    if (property.startsWith('--')) return /^--[-_a-zA-Z0-9]+$/.test(property);
    return /^-?[_a-zA-Z][-_a-zA-Z0-9]*$/.test(property);
}

/**
 * Escapes rule-key segments so state and breakpoint names cannot collide.
 */
function escapeRuleKeyPart(value: string) {
    return encodeURIComponent(value);
}

function shouldCompileCustomCss(surface: StyleSurface) {
    // Legacy sections applied Custom CSS to `containerStyle` only. The inner section component had
    // its own structured `elementStyle`, so emitting the same Custom CSS on both surfaces paints
    // non-inherited effects such as backgrounds and shadows twice.
    return surface.kind === 'element' || surface.kind === 'section-container';
}

function getTargetEmitDefaultDeclarations(source: StyleSourceReader, target: StyleTargetDescriptor) {
    if (target.emitDefaultDeclarations !== undefined) return target.emitDefaultDeclarations;

    return source.emitDefaultDeclarations?.() ?? true;
}
