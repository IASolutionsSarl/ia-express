import { getStyleBreakpointRangeMediaQuery } from './breakpoints';
import {
    DEFAULT_DISPLAY_VALUES,
    getAllowedDisplayValues,
    hasConfiguredDisplayAllowedValues,
    normalizeDisplayValue,
} from './capabilities';
import {
    createDeclaration,
    readDisplayValue,
    readEffectiveStyleValueWithSourceFallback,
    readEffectiveStyleValueWithSourceFallbackResolution,
    readStyleValue,
    shouldEmitDefaultDeclaration,
    type CompiledStyleDeclaration,
    type CompiledStyleRuleTarget,
    type DeclarationScope,
} from './declaration';
import { getFlexDirection as getFlexDirectionCore } from './layout';
import { LAYOUT_ITEM_SELECTOR } from './layoutContract';
import { appendCssSelector, splitCssSelectorList, zeroCssSelectorSpecificity } from './selectors';
import {
    createConditionalDynamicCssVariableReference,
    isDynamicCssVariableReference,
    isStyleDynamicVariableReference,
    normalizeStyleRuntimeValue,
} from './values';
import type {
    StyleCssValueNormalizer,
    StyleDynamicVariableCondition,
    StyleDynamicVariableReference,
    StyleElementReader,
    StyleSectionReader,
} from './types';

const LAYOUT_FLEX_CONTENT_PROPERTIES = [
    '_ww-layout_flexDirection',
    '_ww-layout_justifyContent',
    '_ww-layout_alignItems',
    '_ww-layout_alignContent',
    '_ww-layout_rowGap',
    '_ww-layout_columnGap',
    '_ww-layout_flexWrap',
    '_ww-layout_reverse',
];
const LAYOUT_PUSH_LAST_CONTENT_PROPERTIES = ['_ww-layout_flexDirection', '_ww-layout_reverse', '_ww-layout_pushLast'];
const LAYOUT_GRID_CONTENT_PROPERTIES = [
    '_ww-grid_flowDirection',
    '_ww-grid_columns',
    '_ww-grid_rows',
    '_ww-grid_columnGap',
    '_ww-grid_rowGap',
];
const LAYOUT_TABLE_CONTENT_PROPERTIES = ['_ww-table_layout', '_ww-table_borderCollapse', '_ww-table_borderSpacing'];
const LEGACY_FALSY_CONDITION_VALUE = '\u0000ww-falsy';
const LEGACY_FALSY_CONDITION_NORMALIZER = {
    type: 'falsy-fallback',
    fallbackValue: LEGACY_FALSY_CONDITION_VALUE,
} as const satisfies StyleCssValueNormalizer;
const LEGACY_GRID_TRACK_LIST_NORMALIZER = {
    type: 'space-separated-list',
    fallbackValue: 'revert-layer',
} as const satisfies StyleCssValueNormalizer;
const FLEX_WRAP_BOOLEAN_NORMALIZER = {
    type: 'map',
    map: { trueValue: 'wrap', falseValue: 'nowrap' },
} as const satisfies StyleCssValueNormalizer;
const LEGACY_NON_COLUMN_FLEX_DIRECTIONS = [
    'row',
    'row-reverse',
    'column-reverse',
    'inherit',
    'initial',
    'revert',
    'revert-layer',
    'unset',
] as const;
const LEGACY_AS_AUTHORED_FLEX_DIRECTIONS = LEGACY_NON_COLUMN_FLEX_DIRECTIONS.filter(value => value !== 'row');

/**
 * Creates CSS declarations from `wwLayout` content properties.
 *
 * Runtime-only layout behavior stays out of this resolver: repeat rendering, editor drop
 * affordances, and formula resolution are handled by runtime/editor adapters for now.
 */
export function createLayoutDeclarations(scope: DeclarationScope) {
    const allowedDisplayValues = getAllowedDisplayValues(scope.source);
    const restrictToAllowedValues = hasConfiguredDisplayAllowedValues(scope.source);
    const displayValueNormalizer = {
        type: 'display' as const,
        allowedValues: allowedDisplayValues,
        restrictToAllowedValues,
    };
    const currentDisplay = readDisplayValue(scope, allowedDisplayValues, restrictToAllowedValues);
    const effectiveDisplayResolution = hasResolvedValue(currentDisplay)
        ? undefined
        : readEffectiveStyleValueWithSourceFallbackResolution(scope, 'display', 'style', displayValueNormalizer);
    const display = hasResolvedValue(currentDisplay) ? currentDisplay : effectiveDisplayResolution?.value;
    const recomposeInheritedValues = shouldEmitEffectiveLayoutValues(
        scope,
        currentDisplay,
        effectiveDisplayResolution?.source
    );
    const currentTextAlign = readStyleValue(scope, 'textAlign');
    const effectiveTextAlignResolution =
        currentTextAlign !== undefined
            ? undefined
            : readEffectiveStyleValueWithSourceFallbackResolution(scope, 'textAlign');
    const textAlign = currentTextAlign !== undefined ? currentTextAlign : effectiveTextAlignResolution?.value;
    const canUseBlockLayout = allowedDisplayValues.some(displayValue => getLayoutFamily(displayValue) === 'block');
    const serializeBlockValues =
        canUseBlockLayout &&
        shouldEmitEffectiveBlockValues(
            scope,
            recomposeInheritedValues,
            currentTextAlign,
            effectiveTextAlignResolution?.source
        );
    const compilation: LayoutCompilationContext = {
        currentDisplay,
        textAlign,
        recomposeInheritedValues,
        serializeBlockValues,
    };
    const serializePushLastValues = !isRenderlessLibraryInstance(scope.source) || recomposeInheritedValues;
    // Legacy wwLayout applied push-last to repeated items independently of the container's display
    // family. Keep it outside the flex/grid/block switch so family changes can also clear it.
    const pushLastDeclarations = createPushLastLayoutDeclarations(
        scope,
        readLayoutContentValues(scope, LAYOUT_PUSH_LAST_CONTENT_PROPERTIES),
        serializePushLastValues
    );
    const displayValue =
        display === undefined
            ? allowedDisplayValues[0] || DEFAULT_DISPLAY_VALUES[0]
            : getDisplayValue(display, allowedDisplayValues, restrictToAllowedValues);

    if (displayValue === undefined) return pushLastDeclarations;
    const layoutDisplayValue = getLayoutDisplayValue(displayValue, allowedDisplayValues, restrictToAllowedValues);
    if (layoutDisplayValue !== undefined) {
        return [
            createDeclaration(scope, 'display', displayValue),
            ...createLayoutFamilyDeclarations(scope, layoutDisplayValue, compilation),
            ...pushLastDeclarations,
        ];
    }

    if (!isStyleDynamicVariableReference(displayValue) || !restrictToAllowedValues) {
        return [
            createDeclaration(scope, 'display', displayValue),
            ...createBlockLayoutDeclarations(scope, false, undefined, serializeBlockValues),
            ...pushLastDeclarations,
        ];
    }

    return [
        createDeclaration(scope, 'display', displayValue),
        ...createConditionalLayoutFamilyDeclarations(scope, displayValue, allowedDisplayValues, compilation),
        ...pushLastDeclarations,
    ];
}

type LayoutCompilationContext = {
    currentDisplay: unknown;
    textAlign: unknown;
    recomposeInheritedValues: boolean;
    serializeBlockValues: boolean;
};

function createLayoutFamilyDeclarations(
    scope: DeclarationScope,
    layoutDisplayValue: string,
    compilation: LayoutCompilationContext
) {
    const { currentDisplay, textAlign, recomposeInheritedValues, serializeBlockValues } = compilation;
    const contentValues = readLayoutContentValues(scope, getLayoutContentProperties(layoutDisplayValue));
    const isBlockLayout = layoutDisplayValue === 'block' || layoutDisplayValue === 'inline-block';
    const hasCurrentInput = hasCurrentLayoutInput({ currentDisplay, contentValues });
    const isFlexLayout = layoutDisplayValue === 'flex' || layoutDisplayValue === 'inline-flex';
    if (
        !shouldEmitDefaultDeclaration(scope) &&
        !hasCurrentInput &&
        !recomposeInheritedValues &&
        !serializeBlockValues
    ) {
        return [];
    }

    const declarations: Array<CompiledStyleDeclaration | null> = [];

    if (isFlexLayout) {
        declarations.push(...createFlexLayoutDeclarations(scope, contentValues, recomposeInheritedValues));
    } else if (layoutDisplayValue === 'grid' || layoutDisplayValue === 'inline-grid') {
        declarations.push(...createGridLayoutDeclarations(scope, contentValues, recomposeInheritedValues));
    } else if (layoutDisplayValue === 'table') {
        declarations.push(...createTableLayoutDeclarations(scope, contentValues, recomposeInheritedValues));
    }
    declarations.push(...createBlockLayoutDeclarations(scope, isBlockLayout, textAlign, serializeBlockValues));

    return declarations;
}

/**
 * Gates layout-family declarations behind a bound display value.
 *
 * The legacy runtime resolved `display` first and only applied the matching flex/grid/block/table
 * declarations. Conditional CSS variables preserve that behavior while keeping runtime styles out
 * of the DOM. This is required for components such as ww-flexbox whose allowed display values span
 * several layout families.
 */
function createConditionalLayoutFamilyDeclarations(
    scope: DeclarationScope,
    display: StyleDynamicVariableReference,
    allowedDisplayValues: readonly string[],
    compilation: LayoutCompilationContext
) {
    const declarationsByTarget = new Map<
        string,
        { declaration: CompiledStyleDeclaration; references: StyleDynamicVariableReference[] }
    >();
    const processedFamilies = new Set<string>();

    for (const allowedDisplayValue of allowedDisplayValues) {
        const family = getLayoutFamily(allowedDisplayValue);
        if (!family || processedFamilies.has(family)) continue;

        processedFamilies.add(family);
        const familyDisplayValues = allowedDisplayValues.filter(value => getLayoutFamily(value) === family);
        const familyDeclarations = createLayoutFamilyDeclarations(scope, allowedDisplayValue, compilation);

        for (const declaration of familyDeclarations) {
            if (!declaration) continue;

            const key = createLayoutDeclarationTargetKey(declaration);
            const reference = createConditionalLayoutDeclarationReference(
                scope,
                declaration,
                display,
                family,
                familyDisplayValues
            );
            const group = declarationsByTarget.get(key);
            if (group) {
                group.references.push(reference);
            } else {
                declarationsByTarget.set(key, { declaration, references: [reference] });
            }
        }
    }

    const declarations: CompiledStyleDeclaration[] = [];
    for (const { declaration, references } of declarationsByTarget.values()) {
        let value = 'revert-layer';
        for (let index = references.length - 1; index >= 0; index -= 1) {
            value = `${references[index].withCssFallback(value)}`;
        }
        declarations.push({ ...declaration, value });
    }

    return declarations;
}

function createLayoutDeclarationTargetKey(declaration: CompiledStyleDeclaration) {
    const rule = declaration.rule;
    return [declaration.property, rule?.keySuffix || '', rule?.selector || '', rule?.mediaQuery || ''].join('\u001f');
}

function createConditionalLayoutDeclarationReference(
    scope: DeclarationScope,
    declaration: CompiledStyleDeclaration,
    display: StyleDynamicVariableReference,
    family: string,
    familyDisplayValues: readonly string[]
) {
    const dynamicValue = isStyleDynamicVariableReference(declaration.value) ? declaration.value : null;
    const existingConditions = dynamicValue?.variable.condition
        ? Array.isArray(dynamicValue.variable.condition)
            ? dynamicValue.variable.condition
            : [dynamicValue.variable.condition]
        : [];

    return createConditionalDynamicCssVariableReference({
        input: scope.input,
        surface: scope.surface,
        sourceUid: scope.source.uid(),
        domain: 'content',
        property: declaration.property,
        outputKey: `layout-${family}`,
        valueNormalizer: dynamicValue?.variable.valueNormalizer,
        state: scope.state,
        breakpoint: scope.breakpoint,
        value: dynamicValue?.variable.value ?? declaration.value,
        condition: [
            ...existingConditions,
            whenAllowed(display.variable.value, familyDisplayValues, display.variable.valueNormalizer),
        ],
        cssFallbackValue: 'revert-layer',
    });
}

/**
 * Resolves the layout family behind a display declaration.
 *
 * A dynamic display can still use static layout declarations when the component constrains every
 * runtime value to the same layout family (for example `flex`, `inline-flex`, or `none`). Without
 * those constraints, emitting flex/grid/block declarations would guess how the formula resolves.
 */
function getLayoutDisplayValue(
    displayValue: string | StyleDynamicVariableReference,
    allowedDisplayValues: readonly string[],
    restrictToAllowedValues: boolean
) {
    if (!isDynamicCssVariableReference(displayValue)) return displayValue;
    if (!restrictToAllowedValues) return undefined;

    const [firstAllowedDisplayValue] = allowedDisplayValues;
    const layoutFamily = getLayoutFamily(firstAllowedDisplayValue);
    if (!layoutFamily) return undefined;

    for (const allowedDisplayValue of allowedDisplayValues) {
        if (getLayoutFamily(allowedDisplayValue) !== layoutFamily) return undefined;
    }

    return firstAllowedDisplayValue;
}

function getLayoutFamily(displayValue: string | undefined) {
    if (displayValue === 'flex' || displayValue === 'inline-flex') return 'flex';
    if (displayValue === 'grid' || displayValue === 'inline-grid') return 'grid';
    if (displayValue === 'block' || displayValue === 'inline-block') return 'block';
    if (displayValue === 'table') return 'table';

    return undefined;
}

/**
 * Returns whether the current state/breakpoint slot changes the layout surface.
 *
 * `display` is intentionally included even though it comes from style rather than layout content:
 * a more-specific base `.ww-layout` rule would otherwise mask responsive or state display changes
 * emitted only on the element root.
 */
function hasCurrentLayoutInput({
    currentDisplay,
    contentValues,
}: {
    currentDisplay: unknown;
    contentValues: LayoutContentValues;
}) {
    return hasResolvedValue(currentDisplay) || hasCurrentLayoutContentValue(contentValues);
}

/**
 * Returns whether this slot must serialize a complete effective layout rather than sparse values.
 *
 * An instance-owned display override lives above its concrete definition. Every inherited state and
 * breakpoint in that instance layer must therefore recompose the root content selected by display.
 */
function shouldEmitEffectiveLayoutValues(
    scope: DeclarationScope,
    currentDisplay: unknown,
    effectiveDisplaySource?: StyleElementReader | StyleSectionReader
) {
    return (
        hasResolvedValue(currentDisplay) ||
        (isRenderlessLibraryInstance(scope.source) &&
            !!effectiveDisplaySource &&
            effectiveDisplaySource.uid() === scope.source.uid())
    );
}

/**
 * Returns whether this slot must emit the legacy block-only declarations in the flat override layer.
 *
 * Normal elements emit a complete value for every exclusive responsive range so a value inherited
 * from a wider breakpoint cannot leak into a narrower one. Renderless instances stay sparse unless
 * they own either the effective display or text alignment; definition rules remain authoritative
 * otherwise and no duplicate instance override is needed.
 */
function shouldEmitEffectiveBlockValues(
    scope: DeclarationScope,
    emitEffectiveLayoutValues: boolean,
    currentTextAlign: unknown,
    effectiveTextAlignSource?: StyleElementReader | StyleSectionReader
) {
    if (!isRenderlessLibraryInstance(scope.source)) return true;

    return (
        emitEffectiveLayoutValues ||
        currentTextAlign !== undefined ||
        (!!effectiveTextAlignSource && effectiveTextAlignSource.uid() === scope.source.uid())
    );
}

/**
 * Emits and clears the properties owned only by the legacy block layout branch.
 *
 * These rules share the flat behavioral layer used by push-last. Zero specificity lets compiler
 * source order decide between definition, instance, state, and breakpoint slots, while
 * `revert-layer` reveals authored component CSS when the active display is no longer block.
 */
function createBlockLayoutDeclarations(
    scope: DeclarationScope,
    isBlockLayout: boolean,
    textAlign: unknown,
    emitEffectiveValues: boolean
) {
    if (!isBlockLayout && !emitEffectiveValues) return [];

    return [
        createDeclaration(
            scope,
            'height',
            isBlockLayout ? '100%' : 'revert-layer',
            undefined,
            createBlockLayoutRuleTarget(scope, 'height')
        ),
        createDeclaration(
            scope,
            'textAlign',
            isBlockLayout ? getLegacyLayoutDeclarationValue(textAlign, textAlign !== undefined) : 'revert-layer',
            undefined,
            createBlockLayoutRuleTarget(scope, 'text-align')
        ),
    ];
}

function createBlockLayoutRuleTarget(
    scope: DeclarationScope,
    property: 'height' | 'text-align'
): CompiledStyleRuleTarget {
    const selectorParts = splitCssSelectorList(scope.selector);
    const descendantLayoutSelectorParts =
        property === 'height' && scope.surface.kind === 'element-layout'
            ? selectorParts.filter(selector => selector.includes('[data-ww-layout-style-scopes~='))
            : selectorParts;
    const selector = descendantLayoutSelectorParts.length ? descendantLayoutSelectorParts.join(',\n') : scope.selector;

    return {
        keySuffix: `layout-block-only-${property}`,
        selector: zeroCssSelectorSpecificity(selector),
        layer: 'layout-override',
        mediaQuery: getStyleBreakpointRangeMediaQuery(scope.breakpoint),
    };
}

function readLayoutContentValues(scope: DeclarationScope, properties: readonly string[]) {
    const values: LayoutContentValues = {
        current: {},
        effective: {},
    };
    // Legacy library instances forwarded only style/rawStyle to their concrete root. Their own
    // content was ignored, while a display override still selected a layout family using the deepest
    // concrete root's content. Keep current values empty for the renderless instance and resolve only
    // the concrete content as the effective input.
    const ignoreCurrentContent = isRenderlessLibraryInstance(scope.source);

    for (const property of properties) {
        const valueNormalizer = getLayoutContentValueNormalizer(property);
        const currentValue = ignoreCurrentContent
            ? undefined
            : readStyleValue(scope, property, 'content', valueNormalizer);
        values.current[property] = currentValue;
        values.effective[property] = readEffectiveStyleValueWithSourceFallback(
            scope,
            property,
            'content',
            valueNormalizer
        );
    }

    return values;
}

function isRenderlessLibraryInstance(source: StyleElementReader | StyleSectionReader) {
    return source.kind() === 'element' && !!(source as StyleElementReader).isLibraryComponentInstance?.();
}

function getLayoutContentValueNormalizer(property: string) {
    if (property === '_ww-grid_columns' || property === '_ww-grid_rows') return LEGACY_GRID_TRACK_LIST_NORMALIZER;
    if (property === '_ww-layout_flexWrap') return FLEX_WRAP_BOOLEAN_NORMALIZER;

    return undefined;
}

function getLayoutContentProperties(displayValue: string) {
    if (displayValue === 'grid' || displayValue === 'inline-grid') return LAYOUT_GRID_CONTENT_PROPERTIES;
    if (displayValue === 'table') return LAYOUT_TABLE_CONTENT_PROPERTIES;
    if (displayValue === 'block' || displayValue === 'inline-block') return [];

    return LAYOUT_FLEX_CONTENT_PROPERTIES;
}

type LayoutContentValues = {
    current: Record<string, unknown>;
    effective: Record<string, unknown>;
};

type ConditionalLayoutValueCondition =
    | {
          value: unknown;
          allowedValues: readonly string[];
          disallowedValues?: readonly string[];
          valueNormalizer?: StyleCssValueNormalizer;
      }
    | { value: unknown; truthy: true };

function whenTruthy(value: unknown): ConditionalLayoutValueCondition {
    return { value, truthy: true };
}

function whenAllowed(
    value: unknown,
    allowedValues: readonly string[],
    valueNormalizer?: StyleCssValueNormalizer
): ConditionalLayoutValueCondition {
    return { value, allowedValues, ...(valueNormalizer ? { valueNormalizer } : {}) };
}

function whenExcluded(
    value: unknown,
    disallowedValues: readonly string[],
    legacyAllowedValues: readonly string[]
): ConditionalLayoutValueCondition {
    return { value, allowedValues: legacyAllowedValues, disallowedValues };
}

type ConditionalLayoutValueCase = {
    outputKey: string;
    value: unknown;
    conditions: readonly ConditionalLayoutValueCondition[];
};

/**
 * Derives one CSS value from static and formula-backed layout inputs.
 *
 * Static conditions are folded during compilation. Dynamic conditions become an ordered CSS
 * variable fallback chain, so mutually exclusive runtime cases can share one declaration without
 * putting layout behavior back into inline Vue styles.
 */
function createConditionalLayoutValue(
    scope: DeclarationScope,
    property: string,
    cases: readonly ConditionalLayoutValueCase[]
) {
    const references: StyleDynamicVariableReference[] = [];
    let fallbackValue: unknown;

    for (const layoutCase of cases) {
        const runtimeConditions: StyleDynamicVariableCondition[] = [];
        let matchesStaticConditions = true;

        for (const condition of layoutCase.conditions) {
            if (!isStyleDynamicVariableReference(condition.value)) {
                const matches = matchesStaticLayoutCondition(condition);
                if (!matches) {
                    matchesStaticConditions = false;
                    break;
                }
                continue;
            }

            const variable = condition.value.variable;
            const existingConditions = variable.condition
                ? Array.isArray(variable.condition)
                    ? variable.condition
                    : [variable.condition]
                : [];
            runtimeConditions.push(...existingConditions);
            if ('truthy' in condition) {
                runtimeConditions.push({ value: variable.value, truthy: condition.truthy });
            } else {
                runtimeConditions.push({
                    value: variable.value,
                    allowedValues: condition.allowedValues,
                    ...(condition.disallowedValues ? { disallowedValues: condition.disallowedValues } : {}),
                    valueNormalizer: condition.valueNormalizer ?? variable.valueNormalizer,
                });
            }
        }

        if (!matchesStaticConditions) continue;

        const dynamicValue = isStyleDynamicVariableReference(layoutCase.value) ? layoutCase.value : null;
        if (runtimeConditions.length === 0 && !dynamicValue) {
            // Keep unconditional cases as the terminal CSS fallback. This lets older fronts retain
            // their truthy-only manifest contract while earlier cases override the default.
            fallbackValue = layoutCase.value;
            break;
        }

        const valueConditions = dynamicValue?.variable.condition
            ? Array.isArray(dynamicValue.variable.condition)
                ? dynamicValue.variable.condition
                : [dynamicValue.variable.condition]
            : [];
        const sourceUid = getConditionalLayoutSourceUid(scope, [
            ...layoutCase.conditions.map(condition => condition.value),
            layoutCase.value,
        ]);
        references.push(
            createConditionalDynamicCssVariableReference({
                input: scope.input,
                surface: scope.surface,
                sourceUid,
                domain: 'content',
                property,
                outputKey: layoutCase.outputKey,
                valueNormalizer: dynamicValue?.variable.valueNormalizer,
                state: scope.state,
                breakpoint: scope.breakpoint,
                value: dynamicValue?.variable.value ?? layoutCase.value,
                condition: [...valueConditions, ...runtimeConditions],
                cssFallbackValue: 'revert-layer',
            })
        );
    }

    if (references.length === 0) return fallbackValue;

    let value = fallbackValue ?? 'revert-layer';
    for (let index = references.length - 1; index >= 0; index -= 1) {
        value = `${references[index].withCssFallback(value)}`;
    }
    return value;
}

function getConditionalLayoutSourceUid(scope: DeclarationScope, values: readonly unknown[]) {
    for (const value of values) {
        if (isStyleDynamicVariableReference(value)) return value.variable.sourceUid;
    }

    return scope.source.uid();
}

function matchesStaticLayoutCondition(condition: ConditionalLayoutValueCondition) {
    if ('truthy' in condition) return !!condition.value === condition.truthy;
    const value = condition.valueNormalizer
        ? normalizeStyleRuntimeValue(condition.value, condition.valueNormalizer)
        : condition.value;
    if (condition.disallowedValues) {
        return typeof value !== 'string' || !condition.disallowedValues.includes(value);
    }

    return typeof value === 'string' && condition.allowedValues.includes(value);
}

function hasCurrentLayoutContentValue(values: LayoutContentValues) {
    for (const value of Object.values(values.current)) {
        if (hasLayoutSlotValue(value)) return true;
    }

    return false;
}

function createFlexLayoutDeclarations(
    scope: DeclarationScope,
    contentValues: LayoutContentValues,
    emitEffectiveValues: boolean
) {
    const { current, effective } = contentValues;
    const flexDirection = effective['_ww-layout_flexDirection'];
    const justifyContent = getLayoutContentValue(contentValues, '_ww-layout_justifyContent', emitEffectiveValues);
    const alignItems = getLayoutContentValue(contentValues, '_ww-layout_alignItems', emitEffectiveValues);
    const alignContent = effective['_ww-layout_alignContent'];
    const rowGap = getLayoutContentValue(contentValues, '_ww-layout_rowGap', emitEffectiveValues);
    const columnGap = getLayoutContentValue(contentValues, '_ww-layout_columnGap', emitEffectiveValues);
    const flexWrap = effective['_ww-layout_flexWrap'];
    const isReversed = effective['_ww-layout_reverse'];
    const declarations: Array<CompiledStyleDeclaration | null> = [];
    const hasFlexDirectionInput = emitEffectiveValues
        ? hasLayoutSlotValue(flexDirection) || hasLayoutSlotValue(isReversed)
        : hasLayoutSlotValue(current['_ww-layout_flexDirection']) || hasLayoutSlotValue(current['_ww-layout_reverse']);

    if (hasFlexDirectionInput) {
        declarations.push(
            createDeclaration(
                scope,
                'flexDirection',
                getLegacyLayoutDeclarationValue(getFlexDirection(scope, flexDirection, isReversed), true)
            )
        );
    }

    declarations.push(createDeclaration(scope, 'justifyContent', getLegacyLayoutDeclarationValue(justifyContent)));
    declarations.push(createDeclaration(scope, 'alignItems', getLegacyLayoutDeclarationValue(alignItems)));

    const hasAlignContentInput = emitEffectiveValues
        ? hasLayoutSlotValue(alignContent) || hasLayoutSlotValue(flexWrap)
        : hasLayoutSlotValue(current['_ww-layout_alignContent']) || hasLayoutSlotValue(current['_ww-layout_flexWrap']);
    if (hasAlignContentInput) {
        declarations.push(createDeclaration(scope, 'alignContent', getAlignContent(scope, alignContent, flexWrap)));
    }

    declarations.push(createDeclaration(scope, 'rowGap', getLegacyLayoutDeclarationValue(rowGap)));
    declarations.push(createDeclaration(scope, 'columnGap', getLegacyLayoutDeclarationValue(columnGap)));

    const hasFlexWrapInput = emitEffectiveValues
        ? hasLayoutSlotValue(flexDirection) || hasLayoutSlotValue(flexWrap)
        : hasLayoutSlotValue(current['_ww-layout_flexDirection']) || hasLayoutSlotValue(current['_ww-layout_flexWrap']);
    if (hasFlexWrapInput) {
        const flexWrapValue = getFlexWrap(scope, flexDirection, flexWrap);
        declarations.push(createDeclaration(scope, 'flexWrap', getLegacyLayoutDeclarationValue(flexWrapValue, true)));
    }

    return declarations;
}

function createGridLayoutDeclarations(
    scope: DeclarationScope,
    contentValues: LayoutContentValues,
    emitEffectiveValues: boolean
) {
    const gridFlowDirection = getLayoutContentValue(contentValues, '_ww-grid_flowDirection', emitEffectiveValues);
    const gridTemplateColumns = getGridTemplateValue(
        getLayoutContentValue(contentValues, '_ww-grid_columns', emitEffectiveValues)
    );
    const gridTemplateRows = getGridTemplateValue(
        getLayoutContentValue(contentValues, '_ww-grid_rows', emitEffectiveValues)
    );
    const gridColumnGap = getLayoutContentValue(contentValues, '_ww-grid_columnGap', emitEffectiveValues);
    const gridRowGap = getLayoutContentValue(contentValues, '_ww-grid_rowGap', emitEffectiveValues);

    return [
        createDeclaration(scope, 'gridAutoFlow', getLegacyLayoutDeclarationValue(gridFlowDirection)),
        createDeclaration(scope, 'gridTemplateColumns', gridTemplateColumns),
        createDeclaration(scope, 'gridTemplateRows', gridTemplateRows),
        createDeclaration(scope, 'columnGap', getLegacyLayoutDeclarationValue(gridColumnGap)),
        createDeclaration(scope, 'rowGap', getLegacyLayoutDeclarationValue(gridRowGap)),
    ];
}

function createTableLayoutDeclarations(
    scope: DeclarationScope,
    contentValues: LayoutContentValues,
    emitEffectiveValues: boolean
) {
    return [
        createDeclaration(
            scope,
            'tableLayout',
            getLegacyLayoutDeclarationValue(
                getLayoutContentValue(contentValues, '_ww-table_layout', emitEffectiveValues)
            )
        ),
        createDeclaration(
            scope,
            'borderCollapse',
            getLegacyLayoutDeclarationValue(
                getLayoutContentValue(contentValues, '_ww-table_borderCollapse', emitEffectiveValues)
            )
        ),
        createDeclaration(
            scope,
            'borderSpacing',
            getLegacyLayoutDeclarationValue(
                getLayoutContentValue(contentValues, '_ww-table_borderSpacing', emitEffectiveValues)
            )
        ),
    ];
}

function createPushLastLayoutDeclarations(
    scope: DeclarationScope,
    contentValues: LayoutContentValues,
    emitEffectiveValues: boolean
) {
    const { current, effective } = contentValues;
    const pushLast = effective['_ww-layout_pushLast'];
    const currentPushLast = current['_ww-layout_pushLast'];
    const hasCurrentPushLast = hasLayoutSlotValue(currentPushLast);
    const hasCurrentDirection = hasLayoutSlotValue(current['_ww-layout_flexDirection']);
    const hasCurrentReverse = hasLayoutSlotValue(current['_ww-layout_reverse']);

    if (!hasLayoutSlotValue(pushLast)) return [];
    if (!emitEffectiveValues && !hasCurrentPushLast && !hasCurrentDirection && !hasCurrentReverse) {
        return [];
    }

    const flexDirection = effective['_ww-layout_flexDirection'];
    const reverse = effective['_ww-layout_reverse'];
    const axes = [
        {
            key: 'row',
            property: 'marginLeft',
            conditions: [whenExcluded(flexDirection, ['column'], LEGACY_NON_COLUMN_FLEX_DIRECTIONS)],
        },
        {
            key: 'column',
            property: 'marginTop',
            conditions: [whenAllowed(flexDirection, ['column'])],
        },
    ] as const;
    const positions = [
        {
            targetPosition: 'first-multiple',
            outputPosition: 'first',
            conditions: [whenTruthy(reverse)],
        },
        {
            targetPosition: 'last-multiple',
            outputPosition: 'last',
            conditions: [whenAllowed(reverse, [LEGACY_FALSY_CONDITION_VALUE], LEGACY_FALSY_CONDITION_NORMALIZER)],
        },
        {
            targetPosition: 'single',
            outputPosition: 'single',
            conditions: [],
        },
    ] as const;
    const pushLastCondition = whenTruthy(pushLast);
    const declarations: Array<CompiledStyleDeclaration | null> = [];

    for (const axis of axes) {
        for (const position of positions) {
            const value = createConditionalLayoutValue(scope, '_ww-layout_pushLast', [
                {
                    outputKey: `${position.outputPosition}-${axis.key}-auto`,
                    value: 'auto',
                    conditions: [pushLastCondition, ...axis.conditions, ...position.conditions],
                },
                {
                    outputKey: `${position.outputPosition}-${axis.key}-reset`,
                    value: 'revert-layer',
                    conditions: [],
                },
            ]);
            declarations.push(
                createDeclaration(
                    scope,
                    axis.property,
                    value,
                    undefined,
                    createPushLastRuleTarget(scope, position.targetPosition)
                )
            );
        }
    }

    return declarations;
}

function getLayoutContentValue(contentValues: LayoutContentValues, property: string, emitEffectiveValues: boolean) {
    return emitEffectiveValues ? contentValues.effective[property] : contentValues.current[property];
}

type PushLastRuleTargetPosition = 'first-multiple' | 'last-multiple' | 'single';

function createPushLastRuleTarget(
    scope: DeclarationScope,
    position: PushLastRuleTargetPosition
): CompiledStyleRuleTarget {
    // Push-last definition, instance, state, and breakpoint rules deliberately share one flat
    // override layer so `revert-layer` can reveal authored child margins. Remove the owner
    // selector's specificity so their compiler-controlled source order remains the deciding factor.
    const layoutOwnerSelector = zeroCssSelectorSpecificity(scope.selector);
    const layoutItemSelector = LAYOUT_ITEM_SELECTOR;
    const markedItemSelector = appendCssSelector(
        layoutOwnerSelector,
        ` > ${createPushLastItemSelector(position, layoutItemSelector)}`
    );
    const legacyLayoutItemSelector = '.ww-element:not(.ww-drag-placeholder)';
    const legacyItemSelector = appendCssSelector(
        layoutOwnerSelector,
        `:not(:has(> ${layoutItemSelector})) > ${createPushLastItemSelector(position, legacyLayoutItemSelector)}`
    );

    return {
        keySuffix: `layout-push-last-${position}`,
        selector: `${markedItemSelector},\n${legacyItemSelector}`,
        layer: 'layout-override',
        mediaQuery: getStyleBreakpointRangeMediaQuery(scope.breakpoint),
    };
}

function createPushLastItemSelector(position: PushLastRuleTargetPosition, itemSelector: string) {
    const first = `:nth-child(1 of ${itemSelector})`;
    const last = `:nth-last-child(1 of ${itemSelector})`;

    switch (position) {
        case 'first-multiple':
            return `${first}:not(${last})`;
        case 'last-multiple':
            return `${last}:not(${first})`;
        case 'single':
            return `${first}${last}`;
    }
}

function getFlexDirection(scope: DeclarationScope, flexDirection: unknown, isReversed: unknown) {
    if (!isDynamicCssVariableReference(flexDirection) && !isDynamicCssVariableReference(isReversed)) {
        // Shared reverse logic (also used by wwLayout drag direction).
        return getFlexDirectionCore(flexDirection, isReversed);
    }

    return createConditionalLayoutValue(scope, '_ww-layout_flexDirection', [
        {
            outputKey: 'row-reverse',
            value: 'row-reverse',
            conditions: [whenAllowed(flexDirection, ['row']), whenTruthy(isReversed)],
        },
        {
            outputKey: 'column-reverse',
            value: 'column-reverse',
            conditions: [whenAllowed(flexDirection, ['column']), whenTruthy(isReversed)],
        },
        {
            outputKey: 'row-forward',
            value: 'row',
            conditions: [whenAllowed(flexDirection, ['row'])],
        },
        {
            outputKey: 'column-forward',
            value: 'column',
            conditions: [whenAllowed(flexDirection, ['column'])],
        },
        {
            outputKey: 'as-authored',
            value: flexDirection,
            conditions: [whenExcluded(flexDirection, ['row', 'column'], LEGACY_AS_AUTHORED_FLEX_DIRECTIONS)],
        },
    ]);
}

function getFlexWrap(scope: DeclarationScope, flexDirection: unknown, flexWrap: unknown) {
    if (flexDirection === 'column') return 'nowrap';
    if (!isDynamicCssVariableReference(flexDirection)) {
        if (isDynamicCssVariableReference(flexWrap)) {
            return createConditionalLayoutValue(scope, '_ww-layout_flexWrap', [
                {
                    outputKey: 'wrap',
                    value: 'wrap',
                    conditions: [whenTruthy(flexWrap)],
                },
            ]);
        }
        if (flexWrap) return 'wrap';
        if (flexWrap === false) return 'nowrap';

        return undefined;
    }

    const cases: ConditionalLayoutValueCase[] = [
        {
            outputKey: 'column',
            value: 'nowrap',
            conditions: [whenAllowed(flexDirection, ['column'])],
        },
    ];
    if (flexWrap !== undefined) {
        cases.push({
            outputKey: 'row-wrap',
            value: 'wrap',
            conditions: [
                whenExcluded(flexDirection, ['column'], LEGACY_NON_COLUMN_FLEX_DIRECTIONS),
                whenTruthy(flexWrap),
            ],
        });
    }

    return createConditionalLayoutValue(scope, '_ww-layout_flexWrap', cases);
}

function getAlignContent(scope: DeclarationScope, alignContent: unknown, flexWrap: unknown) {
    const value = getLegacyLayoutDeclarationValue(alignContent, true);
    if (isDynamicCssVariableReference(flexWrap)) {
        return createConditionalLayoutValue(scope, '_ww-layout_alignContent', [
            {
                outputKey: 'when-wrapped',
                value,
                conditions: [whenTruthy(flexWrap)],
            },
        ]);
    }

    return flexWrap ? value : 'revert-layer';
}

function getGridTemplateValue(value: unknown) {
    if (isDynamicCssVariableReference(value)) return value;
    if (value === undefined) return undefined;
    if (!Array.isArray(value)) return 'revert-layer';

    return value.join(' ') || 'revert-layer';
}

function getLegacyLayoutDeclarationValue(value: unknown, hasInput = hasLayoutSlotValue(value)) {
    if (isDynamicCssVariableReference(value) || value) return value;

    return hasInput ? 'revert-layer' : undefined;
}

function hasLayoutSlotValue(value: unknown) {
    return value !== undefined;
}

function hasResolvedValue(value: unknown) {
    return value !== undefined && value !== null && value !== '';
}

function getDisplayValue(
    displayValue: unknown,
    allowedValues: readonly string[] = DEFAULT_DISPLAY_VALUES,
    restrictToAllowedValues = false
) {
    if (isDynamicCssVariableReference(displayValue)) return displayValue;

    return normalizeDisplayValue(displayValue, allowedValues, restrictToAllowedValues);
}
