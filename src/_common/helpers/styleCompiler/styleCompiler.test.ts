import { describe, expect, it } from 'vitest';
import { effectScope, nextTick, reactive, watchEffect } from 'vue';

import {
    createStringStyleSheetAdapter,
    createStyleCompiler,
    serializeRuntimeCssVariableValue,
    splitLegacyCssPriority,
    splitCssSelectorList,
    STATIC_STYLE_RUNTIME,
    STYLE_RULE_GROUP_LAYERS,
    type StyleBreakpointPropertyReader,
    type StyleClassReader,
    type StyleComponentCapabilities,
    type StyleDiagnostic,
    type StyleDynamicVariable,
    type StyleElementReader,
    type StyleParentRef,
    type StyleReader,
    type StyleReactivityRuntime,
    type StyleScopeDispose,
    type StyleSectionReader,
    type StyleStateDescriptor,
    type StyleStateReader,
    type StyleSurface,
} from './index';

describe('styleCompiler', () => {
    it('uses legacy grid spans when explicit grid placement is empty', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const reader = createReader({
            elements: {
                gridChild: {
                    uid: 'gridChild',
                    styles: {
                        base: {
                            default: {
                                columnSpan: '12',
                                gridColumn: '',
                                rowSpan: '2',
                                gridRow: '',
                            },
                        },
                    },
                },
            },
        });

        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['gridChild'], sectionUids: [], libraryComponentIds: [] },
            reader,
            stylesheet,
        });

        expect(run.result).toContain('grid-column: span 12;');
        expect(run.result).toContain('grid-row: span 2;');
    });

    it('uses legacy grid spans when bound explicit grid placement resolves empty', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const reader = createReader({
            elements: {
                gridChild: {
                    uid: 'gridChild',
                    styles: {
                        base: {
                            default: {
                                columnSpan: '12',
                                gridColumn: {
                                    __wwtype: 'f',
                                    code: 'variables.gridColumn',
                                    staticValue: '',
                                },
                                rowSpan: '2',
                                gridRow: {
                                    __wwtype: 'f',
                                    code: 'variables.gridRow',
                                    staticValue: '',
                                },
                            },
                        },
                    },
                },
            },
        });

        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['gridChild'], sectionUids: [], libraryComponentIds: [] },
            reader,
            stylesheet,
        });

        expect(run.result).toContain('grid-column: var(--ww-style-grid-column, span 12);');
        expect(run.result).toContain('grid-row: var(--ww-style-grid-row, span 2);');
    });

    it('preserves bound legacy grid spans as fallbacks for bound grid placement', () => {
        const variables: StyleDynamicVariable[] = [];
        const stylesheet = createDynamicVariableStringStyleSheetAdapter(variables);
        const columnSpan = {
            __wwtype: 'f',
            code: 'variables.columnSpan',
            staticValue: '12',
        };
        const rowSpan = {
            __wwtype: 'f',
            code: 'variables.rowSpan',
            staticValue: '2',
        };
        const reader = createReader({
            elements: {
                gridChild: {
                    uid: 'gridChild',
                    styles: {
                        base: {
                            default: {
                                columnSpan,
                                gridColumn: {
                                    __wwtype: 'f',
                                    code: 'variables.gridColumn',
                                    staticValue: '',
                                },
                                rowSpan,
                                gridRow: {
                                    __wwtype: 'f',
                                    code: 'variables.gridRow',
                                    staticValue: '',
                                },
                            },
                        },
                    },
                },
            },
        });

        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['gridChild'], sectionUids: [], libraryComponentIds: [] },
            reader,
            stylesheet,
        });

        expect(run.result).toContain('grid-column: var(--ww-style-grid-column, span 12);');
        expect(run.result).toContain('grid-row: var(--ww-style-grid-row, span 2);');
        expect(variables.map(variable => variable.property)).toEqual(['gridColumn', 'gridRow']);
        expect(variables[0]?.runtimeFallback).toEqual({
            type: 'when-empty',
            value: columnSpan,
            valueNormalizer: { type: 'prefix-if-truthy', prefix: 'span ' },
        });
        expect(variables[1]?.runtimeFallback).toEqual({
            type: 'when-empty',
            value: rowSpan,
            valueNormalizer: { type: 'prefix-if-truthy', prefix: 'span ' },
        });
    });

    it('keeps ordered grid fallbacks runtime-only when neither formula has a static value', () => {
        const variables: StyleDynamicVariable[] = [];
        const stylesheet = createDynamicVariableStringStyleSheetAdapter(variables);
        const reader = createReader({
            elements: {
                gridChild: {
                    uid: 'gridChild',
                    styles: {
                        base: {
                            default: {
                                columnSpan: { __wwtype: 'f', code: 'variables.columnSpan' },
                                gridColumn: { __wwtype: 'f', code: 'variables.gridColumn' },
                            },
                        },
                    },
                },
            },
        });

        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['gridChild'], sectionUids: [], libraryComponentIds: [] },
            reader,
            stylesheet,
        });

        expect(run.result).toContain('grid-column: var(--ww-style-grid-column);');
        expect(variables.map(variable => variable.property)).toEqual(['gridColumn']);
        expect(variables[0]?.runtimeFallback).toEqual({
            type: 'when-empty',
            value: { __wwtype: 'f', code: 'variables.columnSpan' },
            valueNormalizer: { type: 'prefix-if-truthy', prefix: 'span ' },
        });
    });

    it('does not resolve a legacy span fallback while grid placement has a usable static fallback', () => {
        const variables: StyleDynamicVariable[] = [];
        const resolvedFallbacks: unknown[] = [];
        const columnSpan = { __wwtype: 'f', code: 'variables.columnSpan' };
        const stylesheet = createDynamicVariableStringStyleSheetAdapter(variables);
        const reader = createReader({
            elements: {
                gridChild: {
                    uid: 'gridChild',
                    styles: {
                        base: {
                            default: {
                                columnSpan,
                                gridColumn: {
                                    __wwtype: 'f',
                                    code: 'variables.gridColumn',
                                    staticValue: '2 / 8',
                                },
                            },
                        },
                    },
                },
            },
        });

        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['gridChild'], sectionUids: [], libraryComponentIds: [] },
            reader,
            stylesheet,
            resolveFormulaFallback(formula) {
                resolvedFallbacks.push(formula);
                return { status: 'resolved', value: '12' };
            },
        });

        expect(run.result).toContain('grid-column: var(--ww-style-grid-column, 2 / 8);');
        expect(resolvedFallbacks).toEqual([]);
        expect(variables[0]?.runtimeFallback).toEqual({
            type: 'when-empty',
            value: columnSpan,
            valueNormalizer: { type: 'prefix-if-truthy', prefix: 'span ' },
        });
    });

    it('prefers explicit grid placement over legacy grid spans', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const reader = createReader({
            elements: {
                gridChild: {
                    uid: 'gridChild',
                    styles: {
                        base: {
                            default: {
                                columnSpan: '12',
                                gridColumn: '2 / 8',
                                rowSpan: '2',
                                gridRow: '3 / 5',
                            },
                        },
                    },
                },
            },
        });

        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['gridChild'], sectionUids: [], libraryComponentIds: [] },
            reader,
            stylesheet,
        });

        expect(run.result).toContain('grid-column: 2 / 8;');
        expect(run.result).toContain('grid-row: 3 / 5;');
        expect(run.result).not.toContain('grid-column: span 12;');
        expect(run.result).not.toContain('grid-row: span 2;');
    });

    it('does not register a bound legacy span when explicit grid placement is static', () => {
        const variables: StyleDynamicVariable[] = [];
        const stylesheet = createDynamicVariableStringStyleSheetAdapter(variables);
        const reader = createReader({
            elements: {
                gridChild: {
                    uid: 'gridChild',
                    styles: {
                        base: {
                            default: {
                                columnSpan: {
                                    __wwtype: 'f',
                                    code: 'variables.columnSpan',
                                    staticValue: '12',
                                },
                                gridColumn: '2 / 8',
                            },
                        },
                    },
                },
            },
        });

        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['gridChild'], sectionUids: [], libraryComponentIds: [] },
            reader,
            stylesheet,
        });

        expect(run.result).toContain('grid-column: 2 / 8;');
        expect(run.result).not.toContain('--ww-style-grid-column');
        expect(variables).toEqual([]);
    });

    it('preserves legacy auto sizing and centering for direct roots of stretched column sections', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const reader = createReader({
            elements: {
                root: {
                    uid: 'root',
                    parentRef: { uid: 'sectionA' },
                    isDirectSectionChild: true,
                },
            },
            sections: {
                sectionA: {
                    uid: 'sectionA',
                    content: {
                        base: {
                            default: {
                                '_ww-layout_flexDirection': 'column',
                                '_ww-layout_alignItems': 'stretch',
                            },
                        },
                    },
                },
            },
        });

        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['root'], sectionUids: ['sectionA'], libraryComponentIds: [] },
            reader,
            stylesheet,
        });

        expect(run.result).toContain('--ww-section-root-auto-align: center;');
        expect(run.result).toContain('--ww-section-root-auto-width: 100%;');
        expect(run.result).toContain('align-self: var(--ww-section-root-auto-align, unset);');
        expect(run.result).toContain('width: var(--ww-section-root-auto-width, revert-layer);');
    });

    it('treats an explicit auto width as empty for regular roots of stretched column sections', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const reader = createReader({
            elements: {
                root: {
                    uid: 'root',
                    parentRef: { uid: 'sectionA' },
                    isDirectSectionChild: true,
                    styles: { base: { default: { width: 'auto' } } },
                },
            },
            sections: {
                sectionA: {
                    uid: 'sectionA',
                    content: {
                        base: {
                            default: {
                                '_ww-layout_flexDirection': 'column',
                                '_ww-layout_alignItems': 'stretch',
                            },
                        },
                    },
                },
            },
        });

        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['root'], sectionUids: ['sectionA'], libraryComponentIds: [] },
            reader,
            stylesheet,
        });

        expect(run.result).toContain('width: var(--ww-section-root-auto-width, revert-layer);');
    });

    it('keeps auto-by-content section roots content-sized', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const reader = createReader({
            elements: {
                button: {
                    uid: 'button',
                    parentRef: { uid: 'sectionA' },
                    isDirectSectionChild: true,
                    capabilities: { autoByContent: true },
                    styles: { base: { default: { width: 'auto' } } },
                },
            },
            sections: {
                sectionA: {
                    uid: 'sectionA',
                    content: {
                        base: {
                            default: {
                                '_ww-layout_flexDirection': 'column',
                                '_ww-layout_alignItems': 'stretch',
                            },
                        },
                    },
                },
            },
        });

        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['button'], sectionUids: ['sectionA'], libraryComponentIds: [] },
            reader,
            stylesheet,
        });

        expect(run.result).toContain('align-self: var(--ww-section-root-auto-align, unset);');
        expect(run.result).toContain('width: auto;');
        expect(run.result).not.toContain('width: var(--ww-section-root-auto-width, revert-layer);');
    });

    it('uses the legacy stretched alignment default when a column section omits align-items', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const reader = createReader({
            sections: {
                sectionA: {
                    uid: 'sectionA',
                    content: {
                        base: {
                            default: {
                                '_ww-layout_flexDirection': 'column',
                            },
                        },
                    },
                },
            },
        });

        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: [], sectionUids: ['sectionA'], libraryComponentIds: [] },
            reader,
            stylesheet,
        });

        expect(run.result).toContain('--ww-section-root-auto-align: center;');
        expect(run.result).toContain('--ww-section-root-auto-width: 100%;');
    });

    it('does not apply section-root fallbacks to nested elements', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const reader = createReader({
            elements: {
                nested: {
                    uid: 'nested',
                    // Serialized nested elements retain their containing section id, so the
                    // parent reference alone cannot identify a direct section child.
                    parentRef: { uid: 'sectionA' },
                },
            },
            sections: { sectionA: { uid: 'sectionA' } },
        });

        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['nested'], sectionUids: ['sectionA'], libraryComponentIds: [] },
            reader,
            stylesheet,
        });

        expect(run.result).toContain('align-self: unset;');
        expect(run.result).not.toContain('--ww-section-root-auto');
    });

    it('keeps explicit section-root alignment and width values', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const reader = createReader({
            elements: {
                root: {
                    uid: 'root',
                    parentRef: { uid: 'sectionA' },
                    isDirectSectionChild: true,
                    styles: {
                        base: {
                            default: {
                                align: 'flex-start',
                                width: '320px',
                            },
                        },
                    },
                },
            },
            sections: { sectionA: { uid: 'sectionA' } },
        });

        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['root'], sectionUids: ['sectionA'], libraryComponentIds: [] },
            reader,
            stylesheet,
        });

        expect(run.result).toContain('align-self: flex-start;');
        expect(run.result).toContain('width: 320px;');
    });

    it.each([
        { label: 'null', value: null },
        { label: 'false', value: false },
        { label: 'an empty string', value: '' },
        { label: 'zero', value: 0 },
    ])('restores automatic section-root alignment for $label', ({ value }) => {
        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['root'], sectionUids: ['sectionA'], libraryComponentIds: [] },
            reader: createReader({
                elements: {
                    root: {
                        uid: 'root',
                        parentRef: { uid: 'sectionA' },
                        isDirectSectionChild: true,
                        styles: { base: { default: { align: value } } },
                    },
                },
                sections: {
                    sectionA: {
                        uid: 'sectionA',
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_flexDirection': 'column',
                                    '_ww-layout_alignItems': 'stretch',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });

        expect(run.result).toContain('align-self: var(--ww-section-root-auto-align, unset);');
    });

    it('restores automatic section-root alignment when a responsive value is cleared', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['root'], sectionUids: ['sectionA'], libraryComponentIds: [] },
            reader: createReader({
                elements: {
                    root: {
                        uid: 'root',
                        parentRef: { uid: 'sectionA' },
                        isDirectSectionChild: true,
                        styles: { base: { default: { align: 'flex-start' }, tablet: { align: null } } },
                    },
                },
                sections: {
                    sectionA: {
                        uid: 'sectionA',
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_flexDirection': 'column',
                                    '_ww-layout_alignItems': 'stretch',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const tabletCss = run.result.slice(run.result.indexOf('@media (max-width: 991px)'));

        expect(tabletCss).toContain('align-self: var(--ww-section-root-auto-align, unset);');
    });

    it('restores automatic section-root alignment when a state value is cleared', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['root'], sectionUids: ['sectionA'], libraryComponentIds: [] },
            reader: createReader({
                elements: {
                    root: {
                        uid: 'root',
                        parentRef: { uid: 'sectionA' },
                        isDirectSectionChild: true,
                        stateNames: ['_wwHover'],
                        styles: {
                            base: { default: { align: 'flex-start' } },
                            _wwHover: { default: { align: false } },
                        },
                    },
                },
                sections: {
                    sectionA: {
                        uid: 'sectionA',
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_flexDirection': 'column',
                                    '_ww-layout_alignItems': 'stretch',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const hoverCss = run.result.slice(run.result.indexOf('.ww-element-root:hover'));

        expect(hoverCss).toContain('align-self: var(--ww-section-root-auto-align, unset);');
    });

    it('clears inherited alignment outside section roots when a responsive value is falsy', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['nested'], sectionUids: [], libraryComponentIds: [] },
            reader: createReader({
                elements: {
                    nested: {
                        uid: 'nested',
                        styles: { base: { default: { align: 'flex-start' }, tablet: { align: '' } } },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const tabletCss = run.result.slice(run.result.indexOf('@media (max-width: 991px)'));

        expect(tabletCss).toContain('align-self: unset;');
    });

    it('uses unset when a non-section-root alignment formula resolves falsy', () => {
        const variables: StyleDynamicVariable[] = [];
        const alignFormula = { __wwtype: 'f', code: 'alignment' };
        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['nested'], sectionUids: [], libraryComponentIds: [] },
            reader: createReader({
                elements: {
                    nested: {
                        uid: 'nested',
                        styles: { base: { default: { align: alignFormula } } },
                    },
                },
            }),
            stylesheet: createDynamicVariableStringStyleSheetAdapter(variables),
        });
        const alignVariable = variables.find(variable => variable.property === 'align');

        expect(run.result).toContain('align-self: var(--ww-style-align, unset);');
        expect(alignVariable?.valueNormalizer).toEqual({ type: 'empty-if-falsy' });
    });

    it('removes the automatic width when a section root gains an explicit alignment', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const reader = createReader({
            elements: {
                root: {
                    uid: 'root',
                    parentRef: { uid: 'sectionA' },
                    isDirectSectionChild: true,
                    styles: { base: { default: { width: 'auto' }, tablet: { align: 'flex-start' } } },
                },
            },
            sections: {
                sectionA: {
                    uid: 'sectionA',
                    content: {
                        base: {
                            default: {
                                '_ww-layout_flexDirection': 'column',
                                '_ww-layout_alignItems': 'stretch',
                            },
                        },
                    },
                },
            },
        });

        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['root'], sectionUids: ['sectionA'], libraryComponentIds: [] },
            reader,
            stylesheet,
        });
        const tabletCss = run.result.slice(run.result.indexOf('@media (max-width: 991px)'));

        expect(tabletCss).toContain('align-self: flex-start;');
        expect(tabletCss).toContain('width: revert-layer;');
    });

    it('clears inherited section-root compatibility when the section layout changes responsively', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const reader = createReader({
            sections: {
                sectionA: {
                    uid: 'sectionA',
                    content: {
                        base: {
                            default: {
                                '_ww-layout_flexDirection': 'column',
                                '_ww-layout_alignItems': 'stretch',
                            },
                            tablet: {
                                '_ww-layout_alignItems': 'center',
                            },
                        },
                    },
                },
            },
        });

        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: [], sectionUids: ['sectionA'], libraryComponentIds: [] },
            reader,
            stylesheet,
        });
        const tabletCss = run.result.slice(run.result.indexOf('@media (max-width: 991px)'));

        expect(run.result).toContain('--ww-section-root-auto-align: center;');
        expect(tabletCss).toContain('--ww-section-root-auto-align: initial;');
        expect(tabletCss).toContain('--ww-section-root-auto-width: initial;');
    });

    it('clears inherited section-root compatibility in section states', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const reader = createReader({
            sections: {
                sectionA: {
                    uid: 'sectionA',
                    stateNames: ['_wwHover'],
                    content: {
                        base: {
                            default: {
                                '_ww-layout_flexDirection': 'column',
                                '_ww-layout_alignItems': 'stretch',
                            },
                        },
                        _wwHover: {
                            default: {
                                '_ww-layout_alignItems': 'center',
                            },
                        },
                    },
                },
            },
        });

        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: [], sectionUids: ['sectionA'], libraryComponentIds: [] },
            reader,
            stylesheet,
        });
        const hoverCss = run.result.slice(run.result.indexOf('.ww-section-sectionA > .ww-section-element:hover'));

        expect(hoverCss).toContain('--ww-section-root-auto-align: initial;');
        expect(hoverCss).toContain('--ww-section-root-auto-width: initial;');
    });

    it('registers section-root compatibility formulas in the compiler runtime', () => {
        const variables: StyleDynamicVariable[] = [];
        const stylesheet = createDynamicVariableStringStyleSheetAdapter(variables);
        const directionFormula = { __wwtype: 'f', code: 'direction' };
        const sectionAlignFormula = { __wwtype: 'f', code: 'sectionAlign' };
        const elementAlignFormula = { __wwtype: 'f', code: 'elementAlign' };
        const widthFormula = { __wwtype: 'f', code: 'width' };
        const reader = createReader({
            elements: {
                root: {
                    uid: 'root',
                    parentRef: { uid: 'sectionA' },
                    isDirectSectionChild: true,
                    styles: {
                        base: {
                            default: {
                                align: elementAlignFormula,
                                width: widthFormula,
                            },
                        },
                    },
                },
            },
            sections: {
                sectionA: {
                    uid: 'sectionA',
                    content: {
                        base: {
                            default: {
                                '_ww-layout_flexDirection': directionFormula,
                                '_ww-layout_alignItems': sectionAlignFormula,
                            },
                        },
                    },
                },
            },
        });

        createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['root'], sectionUids: ['sectionA'], libraryComponentIds: [] },
            reader,
            stylesheet,
        });

        const sectionVariable = variables.find(variable => variable.outputKey === 'auto-align');
        expect(sectionVariable?.sourceUid).toBe('sectionA');
        expect(sectionVariable?.condition).toEqual([
            { value: directionFormula, allowedValues: ['column'] },
            { value: sectionAlignFormula, allowedValues: ['stretch'] },
        ]);

        const elementAlignVariable = variables.find(
            variable => variable.sourceUid === 'root' && variable.property === 'align'
        );
        expect(elementAlignVariable?.valueNormalizer).toEqual({ type: 'empty-if-falsy' });
        expect(elementAlignVariable?.runtimeFallback).toEqual({
            type: 'when-empty',
            value: 'var(--ww-section-root-auto-align, unset)',
        });

        const elementWidthVariable = variables.find(
            variable =>
                variable.sourceUid === 'root' && variable.property === 'width' && variable.outputKey === 'section-root'
        );
        expect(elementWidthVariable?.valueNormalizer).toEqual({ type: 'component-size' });
        expect(elementWidthVariable?.runtimeFallback).toEqual({
            type: 'when-all-empty',
            dependencies: [elementAlignFormula],
            value: 'var(--ww-section-root-auto-width, revert-layer)',
        });
    });

    it('compiles class, responsive, and native state CSS in cascade insertion order', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const reader = createReader({
            elements: {
                elementA: {
                    uid: 'elementA',
                    capabilities: {
                        css({ breakpoint, content, state, style }) {
                            const suffix =
                                state === 'base' && breakpoint === 'default'
                                    ? 'base-default'
                                    : `${state}-${breakpoint}`;

                            return [
                                { property: '--ww-element-transition', value: style.transition },
                                { property: '--placeholder-color', value: content.placeholderColor },
                                { property: `--slot-${suffix}`, value: content.placeholderColor },
                            ];
                        },
                    },
                    stateNames: ['_wwHover'],
                    selector: '.element-a',
                    classIds: { base: ['classA'] },
                    subClassIds: { base: { classA: ['subA'] } },
                    styles: {
                        base: {
                            default: {
                                padding: '8px',
                                pointerEvents: 'none',
                                transition: 'color 120ms ease',
                            },
                            tablet: {
                                width: '80px',
                            },
                        },
                        _wwHover: {
                            default: {
                                width: '40px',
                            },
                        },
                    },
                    content: {
                        base: {
                            default: {
                                placeholderColor: '#ff00aa',
                            },
                            tablet: {
                                placeholderColor: '#00ffaa',
                            },
                        },
                        _wwHover: {
                            default: {
                                placeholderColor: '#aa00ff',
                            },
                        },
                    },
                },
            },
            classes: {
                classA: {
                    uid: 'classA',
                    styles: {
                        base: {
                            default: {
                                width: '90px',
                            },
                        },
                    },
                    subClasses: {
                        subA: {
                            uid: 'subA',
                            styles: {
                                base: {
                                    default: {
                                        width: '85px',
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader,
            stylesheet,
        });

        expect(run.result).toContain('.element-a');
        expect(run.result).toContain('padding: 8px;');
        expect(run.result).toContain('pointer-events: none;');
        expect(run.result).toContain('width: 85px;');
        expect(run.result).toContain('transition: color 120ms ease;');
        expect(run.result).toContain('--ww-element-transition: color 120ms ease;');
        expect(run.result).toContain('--placeholder-color: #ff00aa;');
        expect(run.result).toContain('--placeholder-color: #00ffaa;');
        expect(run.result).toContain('--placeholder-color: #aa00ff;');
        expect(run.result).toContain('--slot-base-default: #ff00aa;');
        expect(run.result).toContain('--slot-base-tablet: #00ffaa;');
        expect(run.result).toContain('--slot-_wwHover-default: #aa00ff;');
        expect(run.result).not.toContain('  placeholder-color: #ff00aa;');
        expect(run.result).toContain('@media (max-width: 991px)');
        expect(run.result).toContain('width: 80px;');
        expect(run.result).toContain('.element-a:hover');
        expect(run.result).not.toContain('[data-ww-states~="_wwHover"]');
    });

    it('compiles animation longhands, a derived animation-name, and the scoped @keyframes block', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const reader = createReader({
            elements: {
                animated: {
                    uid: 'animated',
                    selector: '.animated',
                    styles: {
                        base: {
                            default: {
                                animationDuration: '2s',
                                animationDelay: '100ms',
                                animationIterationCount: 'infinite',
                                animationTimingFunction: 'ease-in-out',
                                animationFillMode: 'forwards',
                                animationDirection: 'alternate',
                                animationPlayState: 'running',
                                animationKeyframes: '@keyframes myAnim { 0% { opacity: 0; } 100% { opacity: 1; } }',
                            },
                        },
                    },
                },
            },
        });

        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['animated'], sectionUids: [], libraryComponentIds: [] },
            reader,
            stylesheet,
        });

        expect(run.result).toContain('animation-duration: 2s;');
        expect(run.result).toContain('animation-delay: 100ms;');
        expect(run.result).toContain('animation-iteration-count: infinite;');
        expect(run.result).toContain('animation-timing-function: ease-in-out;');
        expect(run.result).toContain('animation-fill-mode: forwards;');
        expect(run.result).toContain('animation-direction: alternate;');
        expect(run.result).toContain('animation-play-state: running;');
        // Name is scoped to the rendered surface (surface.key) + slot so it is globally unique per
        // instance and per state/breakpoint; animation-name matches the emitted @keyframes block.
        expect(run.result).toContain('animation-name: ww-keyframes-element-animated-base-default;');
        expect(run.result).toContain('@keyframes ww-keyframes-element-animated-base-default');
        expect(run.result).not.toContain('@keyframes myAnim');
    });

    it('preserves the legacy infinite iteration default for configured animations', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['animated'], sectionUids: [], libraryComponentIds: [] },
            reader: createReader({
                elements: {
                    animated: {
                        uid: 'animated',
                        styles: {
                            base: {
                                default: {
                                    animationDuration: '1s',
                                    animationKeyframes:
                                        '@keyframes spinner { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });

        expect(run.result).toContain('animation-iteration-count: infinite;');
    });

    it('preserves the legacy infinite iteration default when a binding resolves empty', () => {
        const variables: StyleDynamicVariable[] = [];
        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['animated'], sectionUids: [], libraryComponentIds: [] },
            reader: createReader({
                elements: {
                    animated: {
                        uid: 'animated',
                        styles: {
                            base: {
                                default: {
                                    animationDuration: '1s',
                                    animationIterationCount: { __wwtype: 'f', code: 'variables.iterations' },
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createDynamicVariableStringStyleSheetAdapter(variables),
        });

        expect(run.result).toContain('animation-iteration-count: var(--ww-style-animation-iteration-count, infinite);');
        expect(variables).toContainEqual(
            expect.objectContaining({
                property: 'animationIterationCount',
                valueNormalizer: { type: 'falsy-fallback', fallbackValue: 'infinite' },
            })
        );
    });

    it('applies the legacy iteration default when a state introduces an animation', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['animated'], sectionUids: [], libraryComponentIds: [] },
            reader: createReader({
                elements: {
                    animated: {
                        uid: 'animated',
                        states: [{ id: '_wwHover', selectors: [':hover'] }],
                        styles: {
                            _wwHover: {
                                default: {
                                    animationDuration: '1s',
                                    animationKeyframes:
                                        '@keyframes spinner { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const hoverRule = run.result.match(/\.ww-element-animated:hover\s*\{[^}]*\}/)?.[0] || '';

        expect(hoverRule).toContain('animation-iteration-count: infinite;');
    });

    it('does not emit an animation iteration default without a configured animation', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['plain'], sectionUids: [], libraryComponentIds: [] },
            reader: createReader({ elements: { plain: { uid: 'plain' } } }),
            stylesheet: createStringStyleSheetAdapter(),
        });

        expect(run.result).not.toContain('animation-iteration-count:');
    });

    it('emits distinct static keyframes and registers bound keyframes for the runtime', () => {
        const variables: StyleDynamicVariable[] = [];
        const stylesheet = createDynamicVariableStringStyleSheetAdapter(variables);
        const reader = createReader({
            elements: {
                animated: {
                    uid: 'animated',
                    selector: '.animated',
                    stateNames: ['_wwHover'],
                    styles: {
                        base: {
                            default: {
                                animationDuration: '2s',
                                animationKeyframes: '@keyframes a { 0% { opacity: 0; } 100% { opacity: 1; } }',
                            },
                        },
                        _wwHover: {
                            default: {
                                animationKeyframes: '@keyframes a { 0% { opacity: 1; } 100% { opacity: 0; } }',
                            },
                        },
                    },
                },
                dynamic: {
                    uid: 'dynamic',
                    selector: '.dynamic',
                    styles: {
                        base: {
                            default: {
                                animationDuration: '1s',
                                // A formula/binding value — resolved as a dynamic reference, not a string.
                                animationKeyframes: { __wwtype: 'f', code: 'someFormula' },
                            },
                        },
                    },
                },
            },
        });

        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['animated', 'dynamic'], sectionUids: [], libraryComponentIds: [] },
            reader,
            stylesheet,
        });

        // Base and hover own different keyframes → distinct slot-scoped names + blocks.
        expect(run.result).toContain('animation-name: ww-keyframes-element-animated-base-default;');
        expect(run.result).toContain('@keyframes ww-keyframes-element-animated-base-default');
        expect(run.result).toContain('animation-name: ww-keyframes-element-animated-_wwHover-default;');
        expect(run.result).toContain('@keyframes ww-keyframes-element-animated-_wwHover-default');
        // Bound keyframes use a runtime-owned name so each rendered instance can resolve a different
        // formula value without sharing one global @keyframes definition.
        expect(run.result).toContain('animation-name: var(--ww-style-animation-keyframes);');
        expect(variables).toContainEqual(
            expect.objectContaining({
                kind: 'keyframes',
                property: 'animationKeyframes',
                keyframesName: 'ww-keyframes-element-dynamic-base-default',
                cssProperty: 'animation-name',
            })
        );
    });

    it('coerces legacy boolean animation direction/play-state to CSS keywords', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const reader = createReader({
            elements: {
                legacy: {
                    uid: 'legacy',
                    selector: '.legacy',
                    styles: {
                        base: {
                            default: {
                                animationDuration: '1s',
                                animationDirection: true,
                                animationPlayState: false,
                            },
                        },
                    },
                },
            },
        });

        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['legacy'], sectionUids: [], libraryComponentIds: [] },
            reader,
            stylesheet,
        });

        expect(run.result).toContain('animation-direction: alternate;');
        expect(run.result).toContain('animation-play-state: paused;');
    });

    it('omits animation-name and @keyframes when the element defines no keyframes', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const reader = createReader({
            elements: {
                plain: {
                    uid: 'plain',
                    selector: '.plain',
                    styles: { base: { default: { animationDuration: '3s' } } },
                },
            },
        });

        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['plain'], sectionUids: [], libraryComponentIds: [] },
            reader,
            stylesheet,
        });

        expect(run.result).toContain('animation-duration: 3s;');
        expect(run.result).not.toContain('animation-name:');
        expect(run.result).not.toContain('@keyframes');
    });

    it('resolves class CSS inside each source target and keeps direct styles as overrides', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA', 'elementB'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        classIds: { base: ['classA'] },
                        styles: {
                            base: {
                                default: {
                                    width: '120px',
                                },
                            },
                        },
                    },
                    elementB: {
                        uid: 'elementB',
                        classIds: { base: ['classA'] },
                    },
                },
                classes: {
                    classA: {
                        uid: 'classA',
                        styles: {
                            base: {
                                default: {
                                    width: '90px',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });
        const elementARule = run.result.match(/\.ww-element-elementA\s*\{[^}]*\}/)?.[0] || '';
        const elementBRule = run.result.match(/\.ww-element-elementB\s*\{[^}]*\}/)?.[0] || '';

        expect(elementARule).toContain('width: 120px;');
        expect(elementBRule).toContain('width: 90px;');
        expect(run.result).not.toContain('ww-style-class');
    });

    it('resolves class display before falling back to source defaults', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        classIds: { base: ['classA'] },
                    },
                },
                classes: {
                    classA: {
                        uid: 'classA',
                        styles: {
                            base: {
                                default: {
                                    display: 'flex',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });
        const elementRule = run.result.match(/\.ww-element-elementA\s*\{[^}]*\}/)?.[0] || '';

        expect(elementRule).toContain('display: flex;');
        expect(elementRule).not.toContain('display: block;');
    });

    it('keeps class order source-local when resolving target CSS', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA', 'elementB'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        classIds: { base: ['classA', 'classB'] },
                    },
                    elementB: {
                        uid: 'elementB',
                        classIds: { base: ['classB', 'classA'] },
                    },
                },
                classes: {
                    classA: {
                        uid: 'classA',
                        styles: {
                            base: {
                                default: {
                                    width: '100px',
                                },
                            },
                        },
                    },
                    classB: {
                        uid: 'classB',
                        styles: {
                            base: {
                                default: {
                                    width: '200px',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });
        const elementARule = run.result.match(/\.ww-element-elementA\s*\{[^}]*\}/)?.[0] || '';
        const elementBRule = run.result.match(/\.ww-element-elementB\s*\{[^}]*\}/)?.[0] || '';

        expect(elementARule).toContain('width: 200px;');
        expect(elementBRule).toContain('width: 100px;');
    });

    it('resolves subclass CSS after its parent class', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        classIds: { base: ['classA'] },
                        subClassIds: { base: { classA: ['subA'] } },
                    },
                },
                classes: {
                    classA: {
                        uid: 'classA',
                        styles: {
                            base: {
                                default: {
                                    borderRadius: '4px',
                                },
                            },
                        },
                        subClasses: {
                            subA: {
                                uid: 'subA',
                                styles: {
                                    base: {
                                        default: {
                                            borderRadius: '12px',
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });
        const elementRule = run.result.match(/\.ww-element-elementA\s*\{[^}]*\}/)?.[0] || '';

        expect(elementRule).toContain('border-radius: 12px;');
        expect(elementRule).not.toContain('border-radius: 4px;');
    });

    it('re-emits inherited border longhands after a state border shorthand', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        stateNames: ['error'],
                        styles: {
                            base: {
                                default: {
                                    borderLeft: '0px',
                                },
                            },
                            error: {
                                default: {
                                    border: '1px solid red',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const errorRule = run.result.match(/\.ww-element-elementA\[data-ww-states~="error"\]\s*\{[^}]*\}/)?.[0] || '';

        expect(errorRule).toContain('border: 1px solid red;');
        expect(errorRule).toContain('border-left: 0px;');
        expect(errorRule.indexOf('border:')).toBeLessThan(errorRule.indexOf('border-left:'));
    });

    it('resolves section class CSS into container and inner section surfaces', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: [],
                sectionUids: ['sectionA'],
                libraryComponentIds: [],
            },
            reader: createReader({
                sections: {
                    sectionA: {
                        uid: 'sectionA',
                        classIds: { base: ['classA'] },
                    },
                },
                classes: {
                    classA: {
                        uid: 'classA',
                        styles: {
                            base: {
                                default: {
                                    height: '300px',
                                    width: '960px',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });
        const containerRule = run.result.match(/\.ww-section-sectionA\s*\{[^}]*\}/)?.[0] || '';
        const elementRule = run.result.match(/\.ww-section-sectionA > \.ww-section-element\s*\{[^}]*\}/)?.[0] || '';

        expect(containerRule).toContain('height: 300px;');
        expect(elementRule).toContain('width: 960px;');
    });

    it('preserves the legacy full width for an auto-sized section inner surface', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: [],
                sectionUids: ['sectionA'],
                libraryComponentIds: [],
            },
            reader: createReader({
                sections: {
                    sectionA: {
                        uid: 'sectionA',
                        styles: { base: { default: { width: 'auto' } } },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const elementRule = run.result.match(/\.ww-section-sectionA > \.ww-section-element\s*\{[^}]*\}/)?.[0] || '';

        expect(elementRule).toContain('width: 100%;');
    });

    it('preserves the legacy full-width fallback for a bound section inner surface', () => {
        const variables: StyleDynamicVariable[] = [];
        const widthFormula = { __wwtype: 'f', code: 'variables.width' };
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: [],
                sectionUids: ['sectionA'],
                libraryComponentIds: [],
            },
            reader: createReader({
                sections: {
                    sectionA: {
                        uid: 'sectionA',
                        styles: { base: { default: { width: widthFormula } } },
                    },
                },
            }),
            stylesheet: createDynamicVariableStringStyleSheetAdapter(variables),
        });
        const elementRule = run.result.match(/\.ww-section-sectionA > \.ww-section-element\s*\{[^}]*\}/)?.[0] || '';
        const widthVariable = variables.find(variable => variable.property === 'width');

        expect(elementRule).toContain('width: var(--ww-style-width, 100%);');
        expect(widthVariable?.valueNormalizer).toEqual({
            type: 'component-size',
            fallbackValue: '100%',
        });
    });

    it('keeps a resolved formula fallback ahead of the legacy component-size fallback', () => {
        const variables: StyleDynamicVariable[] = [];
        const widthFormula = { __wwtype: 'f', code: 'variables.width' };
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: [],
                sectionUids: ['sectionA'],
                libraryComponentIds: [],
            },
            reader: createReader({
                sections: {
                    sectionA: {
                        uid: 'sectionA',
                        styles: { base: { default: { width: widthFormula } } },
                    },
                },
            }),
            stylesheet: createDynamicVariableStringStyleSheetAdapter(variables),
            resolveFormulaFallback: () => ({ status: 'resolved', value: '320px' }),
        });
        const elementRule = run.result.match(/\.ww-section-sectionA > \.ww-section-element\s*\{[^}]*\}/)?.[0] || '';

        expect(elementRule).toContain('width: var(--ww-style-width, 320px);');
    });

    it('preserves the legacy section inner width fallback in responsive and state slots', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: [],
                sectionUids: ['sectionA'],
                libraryComponentIds: [],
            },
            reader: createReader({
                sections: {
                    sectionA: {
                        uid: 'sectionA',
                        stateNames: ['_wwHover'],
                        styles: {
                            base: {
                                default: { width: '320px' },
                                tablet: { width: 'auto' },
                            },
                            _wwHover: { default: { width: 'auto' } },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const tabletCss = run.result.slice(run.result.indexOf('@media (max-width: 991px)'));
        const hoverRule = run.result.match(/\.ww-section-sectionA > \.ww-section-element:hover\s*\{[^}]*\}/)?.[0] || '';

        expect(tabletCss).toContain('width: 100%;');
        expect(hoverRule).toContain('width: 100%;');
    });

    it('resets an auto section inner max-width to the legacy unset value', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: [],
                sectionUids: ['sectionA'],
                libraryComponentIds: [],
            },
            reader: createReader({
                sections: {
                    sectionA: {
                        uid: 'sectionA',
                        styles: { base: { default: { maxWidth: 'auto' } } },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const elementRule = run.result.match(/\.ww-section-sectionA > \.ww-section-element\s*\{[^}]*\}/)?.[0] || '';

        expect(elementRule).toContain('max-width: unset;');
        expect(elementRule).not.toContain('max-width: auto;');
    });

    it.each([
        ['minWidth', 'min-width'],
        ['minHeight', 'min-height'],
        ['maxHeight', 'max-height'],
    ])('resets an auto section inner %s to the legacy unset value', (property, cssProperty) => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: [],
                sectionUids: ['sectionA'],
                libraryComponentIds: [],
            },
            reader: createReader({
                sections: {
                    sectionA: {
                        uid: 'sectionA',
                        styles: { base: { default: { [property]: 'auto' } } },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const elementRule = run.result.match(/\.ww-section-sectionA > \.ww-section-element\s*\{[^}]*\}/)?.[0] || '';

        expect(elementRule).toContain(`${cssProperty}: unset;`);
        expect(elementRule).not.toContain(`${cssProperty}: auto;`);
    });

    it.each([
        ['maxWidth', 'max-width'],
        ['minWidth', 'min-width'],
        ['maxHeight', 'max-height'],
        ['minHeight', 'min-height'],
    ])('resets an auto element %s to the legacy unset value', (property, cssProperty) => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: { base: { default: { [property]: 'auto' } } },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const elementRule = run.result.match(/\.ww-element-elementA\s*\{[^}]*\}/)?.[0] || '';

        expect(elementRule).toContain(`${cssProperty}: unset;`);
        expect(elementRule).not.toContain(`${cssProperty}: auto;`);
    });

    it.each([
        ['height', null, 'height', 'auto'],
        ['minHeight', 'auto', 'min-height', 'unset'],
        ['maxHeight', 'auto', 'max-height', 'unset'],
    ])('preserves the legacy section container fallback for %s', (property, value, cssProperty, expectedValue) => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: [],
                sectionUids: ['sectionA'],
                libraryComponentIds: [],
            },
            reader: createReader({
                sections: {
                    sectionA: {
                        uid: 'sectionA',
                        styles: { base: { default: { [property]: value } } },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const containerRule = run.result.match(/\.ww-section-sectionA\s*\{[^}]*\}/)?.[0] || '';

        expect(containerRule).toContain(`${cssProperty}: ${expectedValue};`);
    });

    it('reveals lower-layer component sizing for a regular element width stored as auto', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: { base: { default: { width: 'auto' } } },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const elementRule = run.result.match(/\.ww-element-elementA\s*\{[^}]*\}/)?.[0] || '';

        expect(elementRule).toContain('width: revert-layer;');
        expect(elementRule).not.toContain('width: auto;');
    });

    it('clears a bound regular element width with legacy component-size semantics', () => {
        const variables: StyleDynamicVariable[] = [];
        const widthFormula = { __wwtype: 'f', code: 'variables.width' };
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: { base: { default: { width: widthFormula } } },
                    },
                },
            }),
            stylesheet: createDynamicVariableStringStyleSheetAdapter(variables),
        });
        const elementRule = run.result.match(/\.ww-element-elementA\s*\{[^}]*\}/)?.[0] || '';
        const widthVariable = variables.find(variable => variable.property === 'width');

        expect(elementRule).toContain('width: var(--ww-style-width);');
        expect(widthVariable?.valueNormalizer).toEqual({ type: 'component-size' });
    });

    it('preserves legacy falsy defaults for element and section declarations', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: ['sectionA'],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: { base: { default: { margin: null, padding: false, zIndex: 0 } } },
                    },
                },
                sections: {
                    sectionA: {
                        uid: 'sectionA',
                        styles: { base: { default: { zIndex: 0 } } },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const elementRule = run.result.match(/\.ww-element-elementA\s*\{[^}]*\}/)?.[0] || '';
        const sectionRule = run.result.match(/\.ww-section-sectionA\s*\{[^}]*\}/)?.[0] || '';

        expect(elementRule).toContain('margin: 0;');
        expect(elementRule).toContain('padding: 0;');
        expect(elementRule).toContain('z-index: unset;');
        expect(sectionRule).toContain('z-index: unset;');
    });

    it('preserves the legacy auto fallback for a bound element height', () => {
        const variables: StyleDynamicVariable[] = [];
        const heightFormula = { __wwtype: 'f', code: 'variables.height' };
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: { base: { default: { height: heightFormula } } },
                    },
                },
            }),
            stylesheet: createDynamicVariableStringStyleSheetAdapter(variables),
        });
        const elementRule = run.result.match(/\.ww-element-elementA\s*\{[^}]*\}/)?.[0] || '';
        const heightVariable = variables.find(variable => variable.property === 'height');

        expect(elementRule).toContain('height: var(--ww-style-height, auto);');
        expect(heightVariable?.valueNormalizer).toEqual({
            type: 'falsy-fallback',
            fallbackValue: 'auto',
        });
    });

    it('preserves legacy falsy fallbacks for bound margin, padding, and z-index', () => {
        const variables: StyleDynamicVariable[] = [];
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: {
                            base: {
                                default: {
                                    margin: { __wwtype: 'f', code: 'variables.margin' },
                                    padding: { __wwtype: 'f', code: 'variables.padding' },
                                    zIndex: { __wwtype: 'f', code: 'variables.zIndex' },
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createDynamicVariableStringStyleSheetAdapter(variables),
        });
        const elementRule = run.result.match(/\.ww-element-elementA\s*\{[^}]*\}/)?.[0] || '';

        expect(elementRule).toContain('margin: var(--ww-style-margin, 0);');
        expect(elementRule).toContain('padding: var(--ww-style-padding, 0);');
        expect(elementRule).toContain('z-index: var(--ww-style-z-index, unset);');
        expect(variables).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    property: 'margin',
                    valueNormalizer: { type: 'falsy-fallback', fallbackValue: '0' },
                }),
                expect.objectContaining({
                    property: 'padding',
                    valueNormalizer: { type: 'falsy-fallback', fallbackValue: '0' },
                }),
                expect.objectContaining({
                    property: 'zIndex',
                    valueNormalizer: { type: 'falsy-fallback', fallbackValue: 'unset' },
                }),
            ])
        );
    });

    it('emits CSS variables on the source when a class value is formula-backed', () => {
        const variables: StyleDynamicVariable[] = [];
        const stylesheet = createDynamicVariableStringStyleSheetAdapter(variables);
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        classIds: { base: ['classA'] },
                    },
                },
                classes: {
                    classA: {
                        uid: 'classA',
                        styles: {
                            base: {
                                default: {
                                    width: { __wwtype: 'f', code: 'variables.width' },
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });

        expect(run.result).toContain('@property --ww-style-width');
        expect(run.result).toContain('width: var(--ww-style-width);');
        expect(variables).toEqual([
            expect.objectContaining({
                name: '--ww-style-width',
                group: 'element',
                sourceUid: 'elementA',
                property: 'width',
                cssProperty: 'width',
                validationProperty: 'width',
                selector: '.ww-element-elementA',
                domain: 'style',
            }),
        ]);
    });

    it('uses formula static values as property-aware CSS variable fallbacks', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: {
                            base: {
                                default: {
                                    width: { __wwtype: 'f', code: 'variables.width', staticValue: 160 },
                                    opacity: { __wwtype: 'f', code: 'variables.opacity', staticValue: 0.5 },
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });

        expect(run.result).toContain('width: var(--ww-style-width, 160px);');
        expect(run.result).toContain('opacity: var(--ww-style-opacity, 0.5);');
    });

    it('ignores formula defaults and uses the static formula resolver', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: {
                            base: {
                                default: {
                                    width: {
                                        __wwtype: 'f',
                                        code: 'variables.width',
                                        defaultValue: 160,
                                    },
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
            resolveFormulaFallback(formula, request) {
                expect(formula).toEqual(expect.objectContaining({ code: 'variables.width' }));
                expect(request).toEqual(expect.objectContaining({ property: 'width', sourceUid: 'elementA' }));
                return { status: 'resolved', value: 240 };
            },
        });

        expect(run.result).toContain('width: var(--ww-style-width, 240px);');
    });

    it('does not emit a CSS fallback from a formula default', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: {
                            base: {
                                default: {
                                    width: { __wwtype: 'f', code: 'variables.width', defaultValue: 160 },
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });

        expect(run.result).toContain('width: var(--ww-style-width);');
        expect(run.result).not.toContain('160px');
    });

    it('keeps state-specific class activation in per-target rules', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        stateNames: ['_wwHover'],
                        classIds: { _wwHover: ['classA'] },
                    },
                },
                classes: {
                    classA: {
                        uid: 'classA',
                        styles: {
                            base: {
                                default: {
                                    opacity: '0.5',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });
        const hoverRule = run.result.match(/\.ww-element-elementA:hover\s*\{[^}]*\}/)?.[0] || '';

        expect(hoverRule).toContain('opacity: 0.5;');
        expect(run.result).not.toContain('ww-style-class');
    });

    it('emits the default display fallback when display is not configured', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        capabilities: {
                            inherits: ['ww-layout'],
                        },
                        styles: {
                            base: {
                                default: {},
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });

        expect(run.result).toContain('display: block;');
        expect(run.result).not.toContain('--ww-element-transition');
    });

    it('restricts display values when component capabilities define allowed values', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['restrictedElement', 'defaultRestrictedElement', 'genericElement'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    restrictedElement: {
                        uid: 'restrictedElement',
                        capabilities: {
                            displayAllowedValues: ['flex', 'inline-flex'],
                        },
                        styles: {
                            base: {
                                default: {
                                    display: 'grid',
                                },
                            },
                        },
                    },
                    defaultRestrictedElement: {
                        uid: 'defaultRestrictedElement',
                        capabilities: {
                            displayAllowedValues: ['block', 'inline-block'],
                        },
                        styles: {
                            base: {
                                default: {
                                    display: 'flex',
                                },
                            },
                        },
                    },
                    genericElement: {
                        uid: 'genericElement',
                        styles: {
                            base: {
                                default: {
                                    display: 'grid',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const restrictedRule = run.result.match(/\.ww-element-restrictedElement\s*\{[^}]*\}/)?.[0] || '';
        const defaultRestrictedRule = run.result.match(/\.ww-element-defaultRestrictedElement\s*\{[^}]*\}/)?.[0] || '';
        const genericRule = run.result.match(/\.ww-element-genericElement\s*\{[^}]*\}/)?.[0] || '';

        expect(restrictedRule).toContain('display: flex;');
        expect(defaultRestrictedRule).toContain('display: block;');
        expect(genericRule).toContain('display: grid;');
    });

    it('normalizes dynamic display formula values at runtime', () => {
        const variables: StyleDynamicVariable[] = [];
        const stylesheet = createDynamicVariableStringStyleSheetAdapter(variables);
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        capabilities: {
                            displayAllowedValues: ['flex', 'inline-flex'],
                        },
                        styles: {
                            base: {
                                default: {
                                    display: { __wwtype: 'f', code: 'variables.visible' },
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });
        const displayVariable = variables.find(variable => variable.property === 'display');

        expect(run.result).toContain('display: var(--ww-style-display);');
        expect(displayVariable).toEqual(
            expect.objectContaining({
                name: '--ww-style-display',
                cssProperty: 'display',
                valueNormalizer: {
                    type: 'display',
                    allowedValues: ['flex', 'inline-flex'],
                    restrictToAllowedValues: true,
                },
            })
        );
        expect(
            serializeRuntimeCssVariableValue('display', false, {
                valueNormalizer: displayVariable?.valueNormalizer,
            })
        ).toBe('none');
        expect(
            serializeRuntimeCssVariableValue('display', null, {
                valueNormalizer: displayVariable?.valueNormalizer,
            })
        ).toBe('none');
        expect(
            serializeRuntimeCssVariableValue('display', undefined, {
                valueNormalizer: displayVariable?.valueNormalizer,
            })
        ).toBe('none');
        expect(
            serializeRuntimeCssVariableValue('display', true, {
                valueNormalizer: displayVariable?.valueNormalizer,
            })
        ).toBe('flex');
        expect(
            serializeRuntimeCssVariableValue('display', 'grid', {
                valueNormalizer: displayVariable?.valueNormalizer,
            })
        ).toBe('flex');
        expect(
            serializeRuntimeCssVariableValue('display', 'inline-flex', {
                valueNormalizer: displayVariable?.valueNormalizer,
            })
        ).toBe('inline-flex');
    });

    it('uses the concrete display fallback for unresolved library instance style overrides', () => {
        const variables: StyleDynamicVariable[] = [];
        const formula = { __wwtype: 'f', code: '', defaultValue: false };
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['libraryInstance'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    libraryInstance: {
                        uid: 'libraryInstance',
                        capabilities: {
                            displayAllowedValues: ['flex', 'inline-flex'],
                            omitUndefinedDynamicValues: true,
                        },
                        styles: {
                            base: {
                                default: { display: formula },
                            },
                        },
                    },
                },
            }),
            stylesheet: createDynamicVariableStringStyleSheetAdapter(variables),
        });

        expect(run.result).toContain('display: var(--ww-style-display, flex);');
        expect(run.result).not.toContain('display: var(--ww-style-display, none);');
        expect(variables.find(variable => variable.property === 'display')).toEqual(
            expect.objectContaining({ omitWhenUndefined: true })
        );
    });

    it('compiles flex layout declarations when display is dynamic', () => {
        const variables: StyleDynamicVariable[] = [];
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        capabilities: {
                            inherits: ['ww-layout'],
                            displayAllowedValues: ['flex', 'inline-flex'],
                        },
                        styles: {
                            base: {
                                default: {
                                    display: { __wwtype: 'f', code: 'variables.visible' },
                                },
                            },
                        },
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_flexDirection': 'row',
                                    '_ww-layout_justifyContent': 'space-between',
                                    '_ww-layout_alignItems': 'center',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createDynamicVariableStringStyleSheetAdapter(variables),
        });
        const layoutRule =
            run.result.match(
                /\.ww-element-elementA\.ww-layout,\n\s*\.ww-element-elementA \[data-ww-layout-style-scopes~="elementA"\]\s*\{[^}]*\}/
            )?.[0] || '';

        expect(layoutRule).toContain('display: var(--ww-style-display);');
        expect(layoutRule).toContain('flex-direction: row;');
        expect(layoutRule).toContain('justify-content: space-between;');
        expect(layoutRule).toContain('align-items: center;');
    });

    it('conditionally compiles layout declarations when bound display supports several families', () => {
        const variables: StyleDynamicVariable[] = [];
        const displayFormula = { __wwtype: 'f', code: 'variables.display' };
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        capabilities: {
                            inherits: ['ww-layout'],
                            displayAllowedValues: ['flex', 'block', 'grid', 'inline-flex'],
                        },
                        styles: {
                            base: {
                                default: {
                                    display: displayFormula,
                                },
                            },
                        },
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_flexDirection': 'row',
                                    '_ww-layout_justifyContent': 'center',
                                    '_ww-layout_alignItems': 'stretch',
                                    '_ww-layout_rowGap': '8px',
                                    '_ww-grid_columns': ['1fr', '1fr'],
                                    '_ww-grid_rowGap': '12px',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createDynamicVariableStringStyleSheetAdapter(variables),
        });
        const layoutRule =
            run.result.match(
                /\.ww-element-elementA\.ww-layout,\n\s*\.ww-element-elementA \[data-ww-layout-style-scopes~="elementA"\]\s*\{[^}]*\}/
            )?.[0] || '';
        const justifyContentVariable = variables.find(variable => variable.cssProperty === 'justify-content');
        const gridColumnsVariable = variables.find(variable => variable.cssProperty === 'grid-template-columns');
        const rowGapVariables = variables.filter(variable => variable.cssProperty === 'row-gap');

        expect(layoutRule).toContain('display: var(--ww-style-display);');
        expect(layoutRule).toContain('justify-content: var(--ww-content-justify-content-layout-flex, revert-layer);');
        expect(layoutRule).toContain(
            'grid-template-columns: var(--ww-content-grid-template-columns-layout-grid, revert-layer);'
        );
        expect(layoutRule).toContain(
            'row-gap: var(--ww-content-row-gap-layout-flex, var(--ww-content-row-gap-layout-grid, revert-layer));'
        );
        expect(justifyContentVariable).toEqual(
            expect.objectContaining({
                value: 'center',
                condition: [
                    expect.objectContaining({
                        value: displayFormula,
                        allowedValues: ['flex', 'inline-flex'],
                        valueNormalizer: expect.objectContaining({ type: 'display' }),
                    }),
                ],
            })
        );
        expect(gridColumnsVariable).toEqual(
            expect.objectContaining({
                value: '1fr 1fr',
                condition: [
                    expect.objectContaining({
                        value: displayFormula,
                        allowedValues: ['grid'],
                    }),
                ],
            })
        );
        expect(rowGapVariables).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    value: '8px',
                    condition: [expect.objectContaining({ allowedValues: ['flex', 'inline-flex'] })],
                }),
                expect.objectContaining({
                    value: '12px',
                    condition: [expect.objectContaining({ allowedValues: ['grid'] })],
                }),
            ])
        );
        expect(rowGapVariables).toHaveLength(2);
    });

    it('serializes formula-backed grid tracks for static fallbacks and runtime writers', () => {
        const variables: StyleDynamicVariable[] = [];
        const gridColumnsFormula = {
            __wwtype: 'f',
            code: '["70px", "1fr", "80px"]',
        };
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['gridElement'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    gridElement: {
                        uid: 'gridElement',
                        capabilities: {
                            inherits: ['ww-layout'],
                            displayAllowedValues: ['grid'],
                        },
                        styles: {
                            base: {
                                default: { display: 'grid' },
                            },
                        },
                        content: {
                            base: {
                                default: { '_ww-grid_columns': gridColumnsFormula },
                            },
                        },
                    },
                },
            }),
            stylesheet: createDynamicVariableStringStyleSheetAdapter(variables),
            resolveFormulaFallback: formula =>
                formula === gridColumnsFormula
                    ? { status: 'resolved', value: ['70px', '1fr', '80px'] }
                    : { status: 'unresolved', reason: 'unsupported-type' },
        });
        const gridColumnsVariable = variables.find(variable => variable.cssProperty === 'grid-template-columns');

        expect(run.result).toContain('grid-template-columns: var(--ww-content-ww-grid-columns, 70px 1fr 80px);');
        expect(gridColumnsVariable).toEqual(
            expect.objectContaining({
                value: gridColumnsFormula,
                valueNormalizer: {
                    type: 'space-separated-list',
                    fallbackValue: 'revert-layer',
                },
            })
        );
        expect(
            serializeRuntimeCssVariableValue(gridColumnsVariable!.cssProperty, ['70px', '1fr', '80px'], {
                valueNormalizer: gridColumnsVariable!.valueNormalizer,
            })
        ).toBe('70px 1fr 80px');
    });

    it('serializes formulas nested in grid track lists', () => {
        const variables: StyleDynamicVariable[] = [];
        const gridColumnFormula = {
            __wwtype: 'f',
            code: '"repeat(auto-fit, minmax(256px, 1fr))"',
        };
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['gridElement'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    gridElement: {
                        uid: 'gridElement',
                        capabilities: {
                            inherits: ['ww-layout'],
                            displayAllowedValues: ['grid'],
                        },
                        styles: {
                            base: {
                                default: { display: 'grid' },
                            },
                        },
                        content: {
                            base: {
                                default: { '_ww-grid_columns': [gridColumnFormula] },
                            },
                        },
                    },
                },
            }),
            stylesheet: createDynamicVariableStringStyleSheetAdapter(variables),
        });
        const gridColumnsVariable = variables.find(variable => variable.cssProperty === 'grid-template-columns');

        expect(run.result).toContain('grid-template-columns: var(--ww-content-ww-grid-columns);');
        expect(gridColumnsVariable).toEqual(
            expect.objectContaining({
                value: [gridColumnFormula],
                valueNormalizer: {
                    type: 'space-separated-list',
                    fallbackValue: 'revert-layer',
                },
            })
        );
        expect(
            serializeRuntimeCssVariableValue(
                gridColumnsVariable!.cssProperty,
                ['repeat(auto-fit, minmax(256px, 1fr))'],
                {
                    valueNormalizer: gridColumnsVariable!.valueNormalizer,
                }
            )
        ).toBe('repeat(auto-fit, minmax(256px, 1fr))');
    });

    it('skips style declarations disabled by component capabilities', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        capabilities: {
                            ignoredStyleProperties: ['background', 'border', 'overflow', 'position', 'aspectRatio'],
                        },
                        styles: {
                            base: {
                                default: {
                                    backgroundColor: '#f00',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    position: 'absolute',
                                    top: '12px',
                                    aspectRatio: '16 / 9',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });

        expect(run.result).not.toContain('background-color: #f00;');
        expect(run.result).not.toContain('border-radius: 8px;');
        expect(run.result).not.toContain('overflow: hidden;');
        expect(run.result).not.toContain('position: absolute;');
        expect(run.result).not.toContain('top: 12px;');
        expect(run.result).not.toContain('aspect-ratio: 16 / 9;');
    });

    it('compiles text content CSS only for text-inheriting components', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['textElement', 'plainElement'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    textElement: {
                        uid: 'textElement',
                        capabilities: {
                            inherits: ['ww-text'],
                        },
                        styles: {
                            base: {
                                default: {
                                    transition: 'color 120ms ease',
                                },
                            },
                        },
                        content: {
                            base: {
                                default: {
                                    '_ww-text_fontSize': '16px',
                                    '_ww-text_color': '#123456',
                                    '_ww-text_nowrap': true,
                                    '_ww-text_ellipsis': true,
                                    backgroundColor: '#abcdef',
                                },
                            },
                        },
                    },
                    plainElement: {
                        uid: 'plainElement',
                        styles: {
                            base: {
                                default: {
                                    transition: 'color 240ms ease',
                                },
                            },
                        },
                        content: {
                            base: {
                                default: {
                                    '_ww-text_fontSize': '20px',
                                    '_ww-text_color': '#654321',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const textRule = run.result.match(/\.ww-element-textElement\s*\{[^}]*\}/)?.[0] || '';
        const plainRule = run.result.match(/\.ww-element-plainElement\s*\{[^}]*\}/)?.[0] || '';

        expect(textRule).toContain('font-family: var(--ww-default-font-family);');
        expect(textRule).toContain('font-size: 16px;');
        expect(textRule).toContain('color: #123456;');
        expect(textRule).toContain('white-space-collapse: preserve;');
        expect(textRule).not.toContain('--ww-text-background-color: #abcdef;');
        expect(textRule).not.toContain('--ww-text-white-space: nowrap;');
        expect(textRule).not.toContain('--ww-text-overflow: hidden;');
        expect(textRule).not.toContain('--ww-text-text-overflow: ellipsis;');
        expect(textRule).not.toContain('--ww-element-transition: color 120ms ease;');
        expect(plainRule).not.toContain('font-size: 20px;');
        expect(plainRule).not.toContain('color: #654321;');
        expect(plainRule).not.toContain('--ww-element-transition: color 240ms ease;');
    });

    it('emits the legacy default font family only when no text font owns the base slot', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['defaultText', 'emptyText', 'explicitText', 'typographyText', 'excludedText'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    defaultText: {
                        uid: 'defaultText',
                        capabilities: { inherits: ['ww-text'] },
                        content: {
                            base: {
                                default: { '_ww-text_fontSize': '16px' },
                                tablet: { '_ww-text_fontSize': '14px' },
                            },
                        },
                    },
                    emptyText: {
                        uid: 'emptyText',
                        capabilities: { inherits: ['ww-text'] },
                        content: { base: { default: { '_ww-text_fontFamily': '' } } },
                    },
                    explicitText: {
                        uid: 'explicitText',
                        capabilities: { inherits: ['ww-text'] },
                        content: { base: { default: { '_ww-text_fontFamily': 'Georgia, serif' } } },
                    },
                    typographyText: {
                        uid: 'typographyText',
                        capabilities: { inherits: ['ww-text'] },
                        content: {
                            base: { default: { '_ww-text_font': "400 16px/20px 'Inter', sans-serif" } },
                        },
                    },
                    excludedText: {
                        uid: 'excludedText',
                        capabilities: { inherits: [{ type: 'ww-text', exclude: ['fontFamily'] }] },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const rulesFor = (uid: string) =>
            [...run.result.matchAll(new RegExp(`\\.ww-element-${uid}\\s*\\{[^}]*\\}`, 'g'))].map(match => match[0]);
        const [defaultRule, ...defaultResponsiveRules] = rulesFor('defaultText');
        const [emptyRule] = rulesFor('emptyText');
        const [explicitRule] = rulesFor('explicitText');
        const [typographyRule] = rulesFor('typographyText');
        const [excludedRule] = rulesFor('excludedText');

        expect(defaultRule).toContain('font-family: var(--ww-default-font-family);');
        expect(defaultResponsiveRules.every(rule => !rule.includes('font-family:'))).toBe(true);
        expect(emptyRule).toContain('font-family: var(--ww-default-font-family);');
        expect(explicitRule).toContain('font-family: Georgia, serif;');
        expect(explicitRule).not.toContain('var(--ww-default-font-family)');
        expect(typographyRule).toContain("font: 400 16px/20px 'Inter', sans-serif;");
        expect(typographyRule).not.toContain('font-family:');
        expect(excludedRule).not.toContain('font-family:');
    });

    it('emits typography longhand overrides after the font shorthand', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['textElement'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    textElement: {
                        uid: 'textElement',
                        capabilities: {
                            inherits: ['ww-text'],
                        },
                        stateNames: ['_wwLinkActive'],
                        content: {
                            base: {
                                default: {
                                    '_ww-text_font': "400 14px/20px 'Inter', sans-serif",
                                    '_ww-text_fontSize': '16px',
                                    '_ww-text_fontWeight': '500',
                                },
                            },
                            _wwLinkActive: {
                                default: {
                                    '_ww-text_fontWeight': '600',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const baseRule = run.result.match(/\.ww-element-textElement\s*\{[^}]*\}/)?.[0] || '';
        const activeRule =
            run.result.match(/\.ww-element-textElement\[data-ww-states~="_wwLinkActive"\]\s*\{[^}]*\}/)?.[0] || '';

        expect(baseRule).toContain("font: 400 14px/20px 'Inter', sans-serif;");
        expect(baseRule).toContain('font-size: 16px;');
        expect(baseRule).toContain('font-weight: 500;');
        expect(baseRule.indexOf('font:')).toBeLessThan(baseRule.indexOf('font-size:'));
        expect(baseRule.indexOf('font:')).toBeLessThan(baseRule.indexOf('font-weight:'));
        expect(activeRule).toContain('font-weight: 600;');
        expect(activeRule).not.toContain('font:');
    });

    it('ignores redundant class typography longhands owned by the selected font token', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['textElement'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    textElement: {
                        uid: 'textElement',
                        capabilities: {
                            inherits: ['ww-text'],
                        },
                        classIds: { base: ['titleClass'] },
                    },
                },
                classes: {
                    titleClass: {
                        uid: 'titleClass',
                        content: {
                            base: {
                                default: {
                                    '_ww-text_font': "var(--title-typography, 700 30px/36px 'Antonio', sans-serif)",
                                    '_ww-text_fontSize': '48px',
                                    '_ww-text_fontFamily': "'League Gothic', sans-serif",
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const textRule = run.result.match(/\.ww-element-textElement\s*\{[^}]*\}/)?.[0] || '';

        expect(textRule).toContain("font: var(--title-typography, 700 30px/36px 'Antonio', sans-serif);");
        expect(textRule).not.toContain('font-size: 48px;');
        expect(textRule).not.toContain("font-family: 'League Gothic', sans-serif;");
    });

    it('ignores redundant source longhands stored beside a typography token', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['textElement'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    textElement: {
                        uid: 'textElement',
                        capabilities: {
                            inherits: ['ww-text'],
                        },
                        content: {
                            base: {
                                default: {
                                    '_ww-text_font': "var(--title-typography, 500 64px/60px 'Inter', sans-serif)",
                                    '_ww-text_fontSize': '64px',
                                    '_ww-text_lineHeight': '60px',
                                    '_ww-text_fontWeight': '500',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const textRule = run.result.match(/\.ww-element-textElement\s*\{[^}]*\}/)?.[0] || '';

        expect(textRule).toContain("font: var(--title-typography, 500 64px/60px 'Inter', sans-serif);");
        expect(textRule).not.toContain('font-size: 64px;');
        expect(textRule).not.toContain('line-height: 60px;');
        expect(textRule).not.toContain('font-weight: 500;');
    });

    it('restores effective font longhands when a responsive breakpoint clears the typography token', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['textElement'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    textElement: {
                        uid: 'textElement',
                        capabilities: {
                            inherits: ['ww-text'],
                        },
                        content: {
                            base: {
                                default: {
                                    '_ww-text_font': "var(--button-typography, 900 14px/1.4 'Roboto', sans-serif)",
                                    '_ww-text_fontSize': '16px',
                                    '_ww-text_lineHeight': '18px',
                                    '_ww-text_fontWeight': '900',
                                },
                                mobile: {
                                    '_ww-text_font': null,
                                    '_ww-text_fontSize': '12px',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const baseRule = run.result.match(/\.ww-element-textElement\s*\{[^}]*\}/)?.[0] || '';
        const mobileRules = run.result.match(/@media \(max-width: 767px\)\s*\{([\s\S]*?)\n\}/)?.[1] || '';

        expect(baseRule).toContain("font: var(--button-typography, 900 14px/1.4 'Roboto', sans-serif);");
        expect(baseRule).not.toContain('line-height: 18px;');
        expect(mobileRules).toContain('font-size: 12px;');
        expect(mobileRules).toContain('line-height: 18px;');
        expect(mobileRules).toContain('font-weight: 900;');
    });

    it('keeps direct typography longhands over a class font token', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['textElement'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    textElement: {
                        uid: 'textElement',
                        capabilities: {
                            inherits: ['ww-text'],
                        },
                        classIds: { base: ['titleClass'] },
                        content: {
                            base: {
                                default: {
                                    '_ww-text_fontSize': '32px',
                                },
                            },
                        },
                    },
                },
                classes: {
                    titleClass: {
                        uid: 'titleClass',
                        content: {
                            base: {
                                default: {
                                    '_ww-text_font': "700 30px/36px 'Antonio', sans-serif",
                                    '_ww-text_fontSize': '48px',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const textRule = run.result.match(/\.ww-element-textElement\s*\{[^}]*\}/)?.[0] || '';

        expect(textRule).toContain("font: 700 30px/36px 'Antonio', sans-serif;");
        expect(textRule).toContain('font-size: 32px;');
        expect(textRule).not.toContain('font-size: 48px;');
    });

    it('lets adapters compose inherited and component-specific CSS factories', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['buttonElement'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    buttonElement: {
                        uid: 'buttonElement',
                        capabilities: {
                            inherits: ['ww-text'],
                            css: [
                                ({ content, style }) => [
                                    {
                                        property: '--ww-text-background-color',
                                        value: content.backgroundColor,
                                    },
                                    {
                                        property: '--ww-element-transition',
                                        value: style.transition,
                                    },
                                ],
                                ({ content }) => [
                                    {
                                        property: '--placeholder-color',
                                        value: content.placeholderColor,
                                    },
                                ],
                            ],
                        },
                        styles: {
                            base: {
                                default: {
                                    transition: 'color 120ms ease',
                                },
                            },
                        },
                        content: {
                            base: {
                                default: {
                                    backgroundColor: '#abcdef',
                                    placeholderColor: '#fedcba',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const buttonRule = run.result.match(/\.ww-element-buttonElement\s*\{[^}]*\}/)?.[0] || '';

        expect(buttonRule).toContain('--ww-text-background-color: #abcdef;');
        expect(buttonRule).toContain('--ww-element-transition: color 120ms ease;');
        expect(buttonRule).toContain('--placeholder-color: #fedcba;');
    });

    it('supports excluded properties in object-form inheritance capabilities', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['textElement'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    textElement: {
                        uid: 'textElement',
                        capabilities: {
                            inherits: [{ type: 'ww-text', exclude: ['color'] }],
                        },
                        content: {
                            base: {
                                default: {
                                    '_ww-text_fontSize': '16px',
                                    '_ww-text_color': '#123456',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const textRule = run.result.match(/\.ww-element-textElement\s*\{[^}]*\}/)?.[0] || '';

        expect(textRule).toContain('font-size: 16px;');
        expect(textRule).not.toContain('color: #123456;');
    });

    it('uses parent refs for parent state selectors', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['child'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    child: {
                        uid: 'child',
                        parentRef: { uid: 'parent', selector: '.scoped-parent' },
                        states: [
                            {
                                id: '_wwParent_parent__wwHover',
                                parent: {
                                    uid: 'parent',
                                    stateId: '_wwHover',
                                },
                            },
                        ],
                        styles: {
                            _wwParent_parent__wwHover: {
                                default: {
                                    opacity: '0.5',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });

        expect(run.result).toContain('.scoped-parent:hover .ww-element-child');
        expect(run.result).toContain('opacity: 0.5;');
    });

    it('uses parent forced-state selectors for editor parent state preview', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['child'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    child: {
                        uid: 'child',
                        parentRef: { uid: 'parent', selector: '.scoped-parent' },
                        states: [
                            {
                                id: '_wwParent_parent__wwHover',
                                parent: {
                                    uid: 'parent',
                                    stateId: '_wwHover',
                                },
                            },
                        ],
                        styles: {
                            _wwParent_parent__wwHover: {
                                default: {
                                    opacity: '0.5',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
            mode: 'editor',
        });

        expect(run.result).toContain(':where(#app.-ww-preview) .scoped-parent:hover .ww-element-child');
        expect(run.result).toContain('.scoped-parent[data-ww-forced-states~="_wwHover"] .ww-element-child');
        expect(run.result).toContain('opacity: 0.5;');
    });

    it('uses structured parent configured selectors for parent state selectors', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['child'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    child: {
                        uid: 'child',
                        states: [
                            {
                                id: '_wwParent_parent_stored-focus-id',
                                parent: {
                                    uid: 'parent',
                                    stateId: 'stored-focus-id',
                                    selector: '.scoped-parent',
                                    selectors: ['&:focus-within, &:has(input:focus)'],
                                },
                            },
                        ],
                        styles: {
                            '_wwParent_parent_stored-focus-id': {
                                default: {
                                    opacity: '0.5',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
            mode: 'editor',
        });

        expect(run.result).toContain(':where(#app.-ww-preview) .scoped-parent:focus-within .ww-element-child');
        expect(run.result).toContain(':where(#app.-ww-preview) .scoped-parent:has(input:focus) .ww-element-child');
        expect(run.result).toContain('.scoped-parent[data-ww-forced-states~="stored-focus-id"] .ww-element-child');
        expect(run.result).toContain('opacity: 0.5;');
    });

    it('uses parent state attributes for structured parent custom states without selectors', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['child'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    child: {
                        uid: 'child',
                        states: [
                            {
                                id: '_wwParent_parent_open',
                                parent: {
                                    uid: 'parent',
                                    stateId: 'open',
                                    selector: '.scoped-parent',
                                },
                            },
                        ],
                        styles: {
                            _wwParent_parent_open: {
                                default: {
                                    opacity: '0.5',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
            mode: 'editor',
        });

        expect(run.result).toMatch(
            /\.scoped-parent\[data-ww-states~="open"\] \.ww-element-child,\n\s*\.scoped-parent\[data-ww-forced-states~="open"\] \.ww-element-child/
        );
        expect(run.result).toContain('opacity: 0.5;');
    });

    it('lets CSS cascade handle inherited state and breakpoint values for normal declarations', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        stateNames: ['_wwHover'],
                        styles: {
                            base: {
                                default: {
                                    width: '100px',
                                    padding: '8px',
                                },
                                tablet: {
                                    width: '80px',
                                },
                            },
                            _wwHover: {
                                default: {
                                    opacity: '0.5',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });
        const tabletCss = run.result.slice(run.result.indexOf('@media (max-width: 991px)'));
        const hoverRule = run.result.match(/\.ww-element-elementA:hover\s*\{[^}]*\}/)?.[0] || '';

        expect(run.result).toContain('width: 100px;');
        expect(tabletCss).toContain('width: 80px;');
        expect(tabletCss).not.toContain('padding: 8px;');
        expect(run.result).not.toContain('@media (max-width: 767px)');
        expect(hoverRule).toContain('opacity: 0.5;');
        expect(hoverRule).not.toContain('width:');
        expect(hoverRule).not.toContain('display:');
    });

    it('emits current breakpoint offsets without copying inherited position declarations', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: {
                            base: {
                                default: {
                                    position: 'absolute',
                                },
                                tablet: {
                                    top: '24px',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });
        const tabletCss = run.result.slice(run.result.indexOf('@media (max-width: 991px)'));

        expect(run.result).toContain('position: absolute;');
        expect(tabletCss).toContain('top: 24px;');
        expect(tabletCss).not.toContain('position: absolute;');
    });

    it('ignores offsets that have no effective user position', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: {
                            base: {
                                default: {
                                    bottom: '60px',
                                    right: '0px',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });

        expect(run.result).not.toContain('bottom: 60px;');
        expect(run.result).not.toContain('right: 0px;');
    });

    it('clears inherited positioning when a breakpoint switches back to relative flow', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: {
                            base: {
                                default: {
                                    position: 'absolute',
                                    bottom: '60px',
                                },
                                tablet: {
                                    position: 'relative',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });
        const tabletCss = run.result.slice(run.result.indexOf('@media (max-width: 991px)'));

        expect(tabletCss).toContain('position: revert-layer;');
        expect(tabletCss).toContain('bottom: revert-layer;');
    });

    it('gates bound position offsets behind runtime CSS variables', () => {
        const variables: StyleDynamicVariable[] = [];
        const positionFormula = {
            __wwtype: 'f',
            code: 'variables.position',
            staticValue: 'absolute',
        };
        const stylesheet = createDynamicVariableStringStyleSheetAdapter(variables);
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: {
                            base: {
                                default: {
                                    position: positionFormula,
                                    bottom: '60px',
                                    right: '0px',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });

        expect(run.result).toContain('position: var(--ww-style-position, revert-layer);');
        expect(run.result).toContain('bottom: var(--ww-style-bottom-positioned, revert-layer);');
        expect(run.result).toContain('right: var(--ww-style-right-positioned, revert-layer);');
        expect(variables).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: '--ww-style-position',
                    property: 'position',
                    value: positionFormula,
                    condition: {
                        value: positionFormula,
                        allowedValues: ['absolute', 'fixed', 'sticky'],
                    },
                }),
                expect.objectContaining({
                    name: '--ww-style-bottom-positioned',
                    property: 'bottom',
                    value: '60px',
                    condition: {
                        value: positionFormula,
                        allowedValues: ['absolute', 'fixed', 'sticky'],
                    },
                }),
            ])
        );
    });

    it('defers the default top offset until bound offsets are resolved', () => {
        const variables: StyleDynamicVariable[] = [];
        const bottomFormula = { __wwtype: 'f', code: 'variables.bottom' };
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: {
                            base: {
                                default: {
                                    position: 'absolute',
                                    bottom: bottomFormula,
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createDynamicVariableStringStyleSheetAdapter(variables),
        });

        expect(run.result).toContain('top: var(--ww-style-top-positioned-fallback, revert-layer);');
        expect(variables).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: '--ww-style-top-positioned-fallback',
                    property: 'top',
                    value: undefined,
                    runtimeFallback: {
                        type: 'when-all-empty',
                        dependencies: [undefined, bottomFormula, undefined],
                        value: '0px',
                    },
                }),
            ])
        );
    });

    it('gates the runtime top fallback behind a bound position', () => {
        const variables: StyleDynamicVariable[] = [];
        const positionFormula = { __wwtype: 'f', code: 'variables.position' };
        const bottomFormula = { __wwtype: 'f', code: 'variables.bottom' };
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: {
                            base: {
                                default: {
                                    position: positionFormula,
                                    bottom: bottomFormula,
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createDynamicVariableStringStyleSheetAdapter(variables),
        });

        expect(run.result).toContain('top: var(--ww-style-top-positioned-fallback, revert-layer);');
        expect(variables).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: '--ww-style-top-positioned-fallback',
                    property: 'top',
                    value: undefined,
                    condition: {
                        value: positionFormula,
                        allowedValues: ['absolute', 'fixed', 'sticky'],
                    },
                    runtimeFallback: {
                        type: 'when-all-empty',
                        dependencies: [undefined, bottomFormula, undefined],
                        value: '0px',
                    },
                }),
            ])
        );
    });

    it('gates a positioned section width behind its bound position', () => {
        const variables: StyleDynamicVariable[] = [];
        const positionFormula = { __wwtype: 'f', code: 'variables.position' };
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: [],
                sectionUids: ['sectionA'],
                libraryComponentIds: [],
            },
            reader: createReader({
                sections: {
                    sectionA: {
                        uid: 'sectionA',
                        styles: {
                            base: {
                                default: {
                                    position: positionFormula,
                                    width: '320px',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createDynamicVariableStringStyleSheetAdapter(variables),
        });
        const containerRule = run.result.match(/\.ww-section-sectionA\s*\{[^}]*\}/)?.[0] || '';

        expect(containerRule).toContain('width: var(--ww-style-width-positioned, revert-layer);');
        expect(variables).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: '--ww-style-width-positioned',
                    property: 'width',
                    value: '320px',
                    condition: {
                        value: positionFormula,
                        allowedValues: ['absolute', 'fixed', 'sticky'],
                    },
                }),
            ])
        );
    });

    it('normalizes a bound positioned section width with legacy component-size semantics', () => {
        const variables: StyleDynamicVariable[] = [];
        const positionFormula = { __wwtype: 'f', code: 'variables.position' };
        const widthFormula = { __wwtype: 'f', code: 'variables.width' };
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: [],
                sectionUids: ['sectionA'],
                libraryComponentIds: [],
            },
            reader: createReader({
                sections: {
                    sectionA: {
                        uid: 'sectionA',
                        styles: {
                            base: {
                                default: {
                                    position: positionFormula,
                                    width: widthFormula,
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createDynamicVariableStringStyleSheetAdapter(variables),
        });
        const containerRule = run.result.match(/\.ww-section-sectionA\s*\{[^}]*\}/)?.[0] || '';
        const widthVariable = variables.find(variable => variable.name === '--ww-style-width-positioned');

        expect(containerRule).toContain('width: var(--ww-style-width-positioned, revert-layer);');
        expect(widthVariable).toEqual(
            expect.objectContaining({
                value: widthFormula,
                valueNormalizer: { type: 'component-size' },
            })
        );
    });

    it('updates a positioned section width across a breakpoint with an inherited bound position', () => {
        const variables: StyleDynamicVariable[] = [];
        const positionFormula = { __wwtype: 'f', code: 'variables.position' };
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: [],
                sectionUids: ['sectionA'],
                libraryComponentIds: [],
            },
            reader: createReader({
                sections: {
                    sectionA: {
                        uid: 'sectionA',
                        styles: {
                            base: {
                                default: {
                                    position: positionFormula,
                                    width: '320px',
                                },
                                tablet: {
                                    width: '280px',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createDynamicVariableStringStyleSheetAdapter(variables),
        });
        const tabletCss = run.result.slice(run.result.indexOf('@media (max-width: 991px)'));

        expect(tabletCss).toContain('width: var(--ww-style-width-positioned, revert-layer);');
        expect(variables).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: '--ww-style-width-positioned',
                    breakpoint: 'tablet',
                    value: '280px',
                    condition: {
                        value: positionFormula,
                        allowedValues: ['absolute', 'fixed', 'sticky'],
                    },
                }),
            ])
        );
    });

    it('clears a positioned section width when a breakpoint returns to normal flow', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: [],
                sectionUids: ['sectionA'],
                libraryComponentIds: [],
            },
            reader: createReader({
                sections: {
                    sectionA: {
                        uid: 'sectionA',
                        styles: {
                            base: {
                                default: {
                                    position: 'absolute',
                                    width: '320px',
                                },
                                tablet: {
                                    position: '',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const tabletCss = run.result.slice(run.result.indexOf('@media (max-width: 991px)'));

        expect(tabletCss).toContain('position: revert-layer;');
        expect(tabletCss).toContain('width: revert-layer;');
    });

    it('clears an inherited sticky section width when a breakpoint adds an offset', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: [],
                sectionUids: ['sectionA'],
                libraryComponentIds: [],
            },
            reader: createReader({
                sections: {
                    sectionA: {
                        uid: 'sectionA',
                        styles: {
                            base: {
                                default: {
                                    position: 'sticky',
                                    width: '320px',
                                },
                                tablet: {
                                    top: '24px',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const tabletCss = run.result.slice(run.result.indexOf('@media (max-width: 991px)'));

        expect(tabletCss).toContain('top: 24px;');
        expect(tabletCss).toContain('width: revert-layer;');
    });

    it('uses runtime states for custom states and forced states for editor preview selectors', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const reader = createReader({
            elements: {
                elementA: {
                    uid: 'elementA',
                    stateNames: ['_wwLinkActive', '_wwHover'],
                    selector: '.element-a',
                    styles: {
                        _wwLinkActive: {
                            default: {
                                opacity: '0.5',
                            },
                        },
                        _wwHover: {
                            default: {
                                opacity: '0.75',
                            },
                        },
                    },
                },
            },
        });

        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader,
            stylesheet,
            mode: 'editor',
        });

        expect(run.result).toContain('.element-a[data-ww-states~="_wwLinkActive"]');
        expect(run.result).toContain('.element-a[data-ww-forced-states~="_wwLinkActive"]');
        expect(run.result).toContain(':where(#app.-ww-preview) .element-a:hover');
        expect(run.result).toContain('.element-a[data-ww-forced-states~="_wwHover"]');
        expect(run.result).not.toContain('.element-a[data-ww-states~="_wwHover"]');
    });

    it('uses configured state selectors while preserving persisted state ids', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        selector: '.element-a',
                        states: [
                            {
                                id: 'stored-focus-id',
                                label: 'focus',
                                selectors: ['&:focus-within', '&:has(input:focus)'],
                            },
                        ],
                        styles: {
                            'stored-focus-id': {
                                default: {
                                    opacity: '0.5',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
            mode: 'editor',
        });

        expect(run.result).toContain(':where(#app.-ww-preview) .element-a:focus-within');
        expect(run.result).toContain(':where(#app.-ww-preview) .element-a:has(input:focus)');
        expect(run.result).toContain('.element-a[data-ww-forced-states~="stored-focus-id"]');
        expect(run.result).not.toContain('.element-a[data-ww-states~="stored-focus-id"]');
        expect(run.result).toContain('opacity: 0.5;');
    });

    it('keeps structural configured selectors active on the editing canvas', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        selector: '.element-a',
                        states: [
                            {
                                id: 'stored-structural-id',
                                selectors: ['&:disabled', '&[aria-selected="true"]'],
                            },
                        ],
                        styles: {
                            'stored-structural-id': {
                                default: {
                                    opacity: '0.5',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
            mode: 'editor',
        });

        expect(run.result).toContain('.element-a:disabled');
        expect(run.result).toContain('.element-a[aria-selected="true"]');
        expect(run.result).not.toContain(':where(#app.-ww-preview) .element-a:disabled');
        expect(run.result).not.toContain(':where(#app.-ww-preview) .element-a[aria-selected="true"]');
        expect(run.result).toContain('.element-a[data-ww-forced-states~="stored-structural-id"]');
    });

    it('gates transient and structural selector alternatives independently', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        selector: '.element-a',
                        states: [{ id: 'mixed-state', selectors: ['&:focus, &:disabled'] }],
                        styles: {
                            'mixed-state': {
                                default: {
                                    opacity: '0.5',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
            mode: 'editor',
        });

        expect(run.result).toContain(':where(#app.-ww-preview) .element-a:focus');
        expect(run.result).toContain('.element-a:disabled');
        expect(run.result).not.toContain(':where(#app.-ww-preview) .element-a:disabled');
    });

    it('keeps plain component states as runtime states unless they define selectors', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        selector: '.element-a',
                        stateNames: ['active'],
                        styles: {
                            active: {
                                default: {
                                    opacity: '0.5',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });

        expect(run.result).toContain('.element-a[data-ww-states~="active"]');
        expect(run.result).not.toContain('.element-a:active');
    });

    it('registers dynamic variables without emitting static CSS in runtime mode', () => {
        const variables: StyleDynamicVariable[] = [];
        const stylesheet = createDynamicVariableStringStyleSheetAdapter(variables);
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        stateNames: ['_wwLinkActive', '_wwHover'],
                        selector: '.element-a',
                        styles: {
                            base: {
                                default: {
                                    width: { __wwtype: 'f', code: 'variables.width' },
                                },
                            },
                            _wwLinkActive: {
                                default: {
                                    opacity: '0.5',
                                },
                            },
                            _wwHover: {
                                default: {
                                    opacity: '0.75',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
            mode: 'runtime',
        });

        expect(run.result).toBe('');
        expect(variables).toEqual([
            expect.objectContaining({
                name: '--ww-style-width',
                property: 'width',
                cssProperty: 'width',
                selector: '.element-a',
                state: 'base',
                breakpoint: 'default',
            }),
        ]);
        expect(run.result).not.toContain('data-ww-forced-states');
    });

    it('cleans up target scopes when the compiler run stops', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const manualRuntime = createManualStyleReactivityRuntime();

        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: {
                            base: {
                                default: {
                                    width: '120px',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
            runtime: manualRuntime.runtime,
        });

        expect(run.result).toContain('width: 120px;');
        expect(manualRuntime.scopes.map(scope => scope.runCount)).toEqual([1, 1]);

        run.stop();

        expect(stylesheet.result()).toBe('');
        expect(manualRuntime.scopes.map(scope => scope.stopCount)).toEqual([1, 1]);
    });

    it('reconciles target scopes without rebuilding unchanged targets', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const manualRuntime = createManualStyleReactivityRuntime();
        const compileScope = {
            elementUids: ['elementA', 'elementB'],
            sectionUids: [],
            libraryComponentIds: [],
        };

        const run = createStyleCompiler().compileStylesheet({
            scope: compileScope,
            reader: createReader({
                elements: {
                    elementA: createWidthElement('elementA', '100px'),
                    elementB: createWidthElement('elementB', '200px'),
                    elementC: createWidthElement('elementC', '300px'),
                },
            }),
            stylesheet,
            runtime: manualRuntime.runtime,
        });

        expect(manualRuntime.scopes.map(scope => scope.runCount)).toEqual([1, 1, 1]);

        compileScope.elementUids.reverse();
        manualRuntime.scopes[0].rerun();

        expect(manualRuntime.scopes).toHaveLength(3);
        expect(manualRuntime.scopes.map(scope => scope.runCount)).toEqual([2, 1, 1]);
        expect(manualRuntime.scopes.map(scope => scope.stopCount)).toEqual([0, 0, 0]);

        compileScope.elementUids.push('elementC');
        manualRuntime.scopes[0].rerun();

        expect(manualRuntime.scopes).toHaveLength(4);
        expect(manualRuntime.scopes.map(scope => scope.runCount)).toEqual([3, 1, 1, 1]);

        compileScope.elementUids = compileScope.elementUids.filter(uid => uid !== 'elementA');
        manualRuntime.scopes[0].rerun();

        expect(manualRuntime.scopes.map(scope => scope.runCount)).toEqual([4, 1, 1, 1]);
        expect(manualRuntime.scopes[1].stopCount).toBe(1);
        expect(stylesheet.result()).not.toContain('.ww-element-elementA');
        expect(stylesheet.result()).toContain('.ww-element-elementB');
        expect(stylesheet.result()).toContain('.ww-element-elementC');

        run.stop();
    });

    it('reruns one target chunk by disposing and reinserting its rules after existing targets', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const manualRuntime = createManualStyleReactivityRuntime();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA', 'elementB'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        stateNames: ['_wwHover'],
                        styles: {
                            base: {
                                default: {
                                    width: '100px',
                                },
                                tablet: {
                                    width: '80px',
                                },
                            },
                            _wwHover: {
                                default: {
                                    opacity: '0.5',
                                },
                            },
                        },
                    },
                    elementB: createWidthElement('elementB', '200px'),
                },
            }),
            stylesheet,
            runtime: manualRuntime.runtime,
        });

        expectTargetChunkOrder(stylesheet.result(), 'elementA');

        manualRuntime.scopes[1].rerun();
        const rerunCss = stylesheet.result();

        expect(rerunCss.indexOf('.ww-element-elementB')).toBeLessThan(rerunCss.indexOf('.ww-element-elementA'));
        expectTargetChunkOrder(rerunCss, 'elementA');

        run.stop();
    });

    it('keeps library rules before element rules when a library chunk reruns', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const manualRuntime = createManualStyleReactivityRuntime();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: ['libraryA'],
            },
            reader: createReader({
                elements: {
                    libraryRoot: createWidthElement('libraryRoot', '100px'),
                    elementA: createWidthElement('elementA', '200px'),
                },
                libraryComponents: {
                    libraryA: { rootElementUid: 'libraryRoot' },
                },
            }),
            stylesheet,
            runtime: manualRuntime.runtime,
        });

        expect(stylesheet.result().indexOf('.ww-element-libraryRoot')).toBeLessThan(
            stylesheet.result().indexOf('.ww-element-elementA')
        );

        manualRuntime.scopes[1].rerun();
        const rerunCss = stylesheet.result();

        expect(rerunCss.indexOf('.ww-element-libraryRoot')).toBeLessThan(rerunCss.indexOf('.ww-element-elementA'));

        run.stop();
    });

    it('orders nested library component root targets dependency-first', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: [],
                sectionUids: [],
                libraryComponentIds: ['libraryC', 'libraryA', 'libraryB'],
            },
            reader: createReader({
                elements: {
                    libraryRootA: createWidthElement('libraryRootA', '100px'),
                    libraryRootB: createWidthElement('libraryRootB', '200px'),
                    libraryRootC: createWidthElement('libraryRootC', '300px'),
                },
                libraryComponents: {
                    libraryA: { rootElementUid: 'libraryRootA', childLibraryComponentIds: ['libraryB'] },
                    libraryB: { rootElementUid: 'libraryRootB' },
                    libraryC: { rootElementUid: 'libraryRootC' },
                },
            }),
            stylesheet,
        });

        const css = run.result;

        expect(css.indexOf('.ww-element-libraryRootC')).toBeLessThan(css.indexOf('.ww-element-libraryRootB'));
        expect(css.indexOf('.ww-element-libraryRootB')).toBeLessThan(css.indexOf('.ww-element-libraryRootA'));

        run.stop();
    });

    it('places renderless library instance overrides above concrete root layout declarations', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: [],
                sectionUids: [],
                libraryElementUids: ['buttonInstance'],
                libraryComponentIds: ['button'],
            },
            reader: createReader({
                elements: {
                    concreteRoot: {
                        uid: 'concreteRoot',
                        capabilities: {
                            inherits: ['ww-layout'],
                            displayAllowedValues: ['flex', 'inline-flex'],
                        },
                        styles: {
                            base: {
                                default: {
                                    display: 'flex',
                                },
                            },
                        },
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_flexDirection': 'row',
                                },
                            },
                        },
                    },
                    buttonInstance: {
                        uid: 'buttonInstance',
                        libraryComponentBaseId: 'button',
                        capabilities: {
                            displayAllowedValues: ['flex', 'inline-flex'],
                        },
                        emitDefaultDeclarations: false,
                        styles: {
                            base: {
                                default: {
                                    display: false,
                                },
                            },
                        },
                    },
                },
                libraryComponents: {
                    button: { rootElementUid: 'concreteRoot' },
                },
            }),
            stylesheet,
            runtime: STATIC_STYLE_RUNTIME,
        });
        const css = run.result;
        const definitionLayerIndex = css.indexOf('@layer definition');
        const rootLayoutRuleIndex = css.indexOf('.ww-element-concreteRoot.ww-layout');
        const instanceLayerIndex = css.indexOf('@layer instance');
        const instanceRuleIndex = css.indexOf('.ww-element-buttonInstance');

        expect(css).toContain('@layer definition, instance;');
        expect(definitionLayerIndex).toBeGreaterThanOrEqual(0);
        expect(rootLayoutRuleIndex).toBeGreaterThan(definitionLayerIndex);
        expect(instanceLayerIndex).toBeGreaterThan(rootLayoutRuleIndex);
        expect(instanceRuleIndex).toBeGreaterThan(instanceLayerIndex);
        expect(css).toMatch(/\.ww-element-buttonInstance\s*\{[^}]*display: none;/);
        expect(css).not.toContain('.ww-element-buttonInstance.ww-layout');

        run.stop();
    });

    it('keeps nested renderless library roots dependency-first inside the instance layer', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: [],
                sectionUids: [],
                libraryComponentIds: ['outer', 'concrete', 'inner'],
            },
            reader: createReader({
                elements: {
                    concreteRoot: createWidthElement('concreteRoot', '100px'),
                    innerInstance: {
                        ...createWidthElement('innerInstance', '200px'),
                        libraryComponentBaseId: 'concrete',
                        emitDefaultDeclarations: false,
                    },
                    outerInstance: {
                        ...createWidthElement('outerInstance', '300px'),
                        libraryComponentBaseId: 'inner',
                        emitDefaultDeclarations: false,
                    },
                },
                libraryComponents: {
                    concrete: { rootElementUid: 'concreteRoot' },
                    inner: { rootElementUid: 'innerInstance', childLibraryComponentIds: ['concrete'] },
                    outer: { rootElementUid: 'outerInstance', childLibraryComponentIds: ['inner'] },
                },
            }),
            stylesheet,
            runtime: STATIC_STYLE_RUNTIME,
        });
        const css = run.result;
        const definitionLayerIndex = css.indexOf('@layer definition');
        const concreteRootIndex = css.indexOf('.ww-element-concreteRoot');
        const instanceLayerIndex = css.indexOf('@layer instance');
        const innerInstanceIndex = css.indexOf('.ww-element-innerInstance');
        const outerInstanceIndex = css.indexOf('.ww-element-outerInstance');

        expect(concreteRootIndex).toBeGreaterThan(definitionLayerIndex);
        expect(instanceLayerIndex).toBeGreaterThan(concreteRootIndex);
        expect(innerInstanceIndex).toBeGreaterThan(instanceLayerIndex);
        expect(outerInstanceIndex).toBeGreaterThan(innerInstanceIndex);

        run.stop();
    });

    it('rebuilds library target scopes when dependency order changes', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const manualRuntime = createManualStyleReactivityRuntime();
        const libraryComponents = {
            libraryA: { rootElementUid: 'libraryRootA', childLibraryComponentIds: [] as string[] },
            libraryB: { rootElementUid: 'libraryRootB' },
        };
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: [],
                sectionUids: [],
                libraryComponentIds: ['libraryA', 'libraryB'],
            },
            reader: createReader({
                elements: {
                    libraryRootA: createWidthElement('libraryRootA', '100px'),
                    libraryRootB: createWidthElement('libraryRootB', '200px'),
                },
                libraryComponents,
            }),
            stylesheet,
            runtime: manualRuntime.runtime,
        });

        expect(stylesheet.result().indexOf('.ww-element-libraryRootA')).toBeLessThan(
            stylesheet.result().indexOf('.ww-element-libraryRootB')
        );

        libraryComponents.libraryA.childLibraryComponentIds = ['libraryB'];
        manualRuntime.scopes[0].rerun();

        const rerunCss = stylesheet.result();

        expect(rerunCss.indexOf('.ww-element-libraryRootB')).toBeLessThan(rerunCss.indexOf('.ww-element-libraryRootA'));
        expect(manualRuntime.scopes[1].stopCount).toBe(1);
        expect(manualRuntime.scopes[2].stopCount).toBe(1);
        expect(manualRuntime.scopes).toHaveLength(5);

        run.stop();
    });

    it('does not emit library definition roots again in the element layer', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['rootElementA'],
                sectionUids: [],
                libraryComponentIds: ['libraryA'],
            },
            reader: createReader({
                elements: {
                    rootElementA: createWidthElement('rootElementA', '100px'),
                },
                libraryComponents: {
                    libraryA: { rootElementUid: 'rootElementA' },
                },
            }),
            stylesheet,
            runtime: STATIC_STYLE_RUNTIME,
        });

        expect(run.result.match(/\.ww-element-rootElementA\s*\{/g)).toHaveLength(1);

        run.stop();
    });

    it('compiles library definition children in the library layer only', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['libraryChild', 'pageElement'],
                sectionUids: [],
                libraryElementUids: ['libraryChild'],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    libraryChild: createWidthElement('libraryChild', '100px'),
                    pageElement: createWidthElement('pageElement', '200px'),
                },
            }),
            stylesheet,
            runtime: STATIC_STYLE_RUNTIME,
        });

        expect(run.result.match(/\.ww-element-libraryChild\s*\{/g)).toHaveLength(1);
        expect(run.result).toContain('.ww-element-pageElement');
        expect(run.result.indexOf('.ww-element-libraryChild')).toBeLessThan(
            run.result.indexOf('.ww-element-pageElement')
        );

        run.stop();
    });

    it('does not emit default declarations for library component root instances', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['cardInstance'],
                sectionUids: [],
                libraryComponentIds: ['libraryA'],
            },
            reader: createReader({
                elements: {
                    libraryRoot: {
                        uid: 'libraryRoot',
                        styles: {
                            base: {
                                default: {
                                    height: '100%',
                                    padding: '5px',
                                },
                            },
                        },
                    },
                    cardInstance: {
                        uid: 'cardInstance',
                        emitDefaultDeclarations: false,
                        styles: {
                            base: {
                                default: {
                                    height: null,
                                },
                            },
                        },
                    },
                },
                libraryComponents: {
                    libraryA: { rootElementUid: 'libraryRoot' },
                },
            }),
            stylesheet,
            runtime: STATIC_STYLE_RUNTIME,
        });
        const libraryRule = run.result.match(/\.ww-element-libraryRoot\s*\{[^}]*\}/)?.[0] || '';
        const instanceRule = run.result.match(/\.ww-element-cardInstance\s*\{[^}]*\}/)?.[0] || '';

        expect(libraryRule).toContain('height: 100%;');
        expect(libraryRule).toContain('padding: 5px;');
        expect(instanceRule).toContain('height: auto;');
        expect(instanceRule).not.toContain('padding: 0;');

        run.stop();
    });

    it('resets an auto library component instance max-width in the instance layer', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['cardInstance'],
                sectionUids: [],
                libraryComponentIds: ['libraryA'],
            },
            reader: createReader({
                elements: {
                    libraryRoot: {
                        uid: 'libraryRoot',
                        styles: { base: { default: { maxWidth: '640px' } } },
                    },
                    cardInstance: {
                        uid: 'cardInstance',
                        emitDefaultDeclarations: false,
                        styles: { base: { default: { maxWidth: 'auto' } } },
                    },
                },
                libraryComponents: {
                    libraryA: { rootElementUid: 'libraryRoot' },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
            runtime: STATIC_STYLE_RUNTIME,
        });
        const libraryRule = run.result.match(/\.ww-element-libraryRoot\s*\{[^}]*\}/)?.[0] || '';
        const instanceRule = run.result.match(/\.ww-element-cardInstance\s*\{[^}]*\}/)?.[0] || '';

        expect(libraryRule).toContain('max-width: 640px;');
        expect(instanceRule).toContain('max-width: unset;');
        expect(run.result.indexOf(instanceRule)).toBeGreaterThan(run.result.indexOf(libraryRule));

        run.stop();
    });

    it('keeps bound library component instance heights dynamic', () => {
        const variables: StyleDynamicVariable[] = [];
        const stylesheet = createDynamicVariableStringStyleSheetAdapter(variables);
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['cardInstance'],
                sectionUids: [],
                libraryComponentIds: ['libraryA'],
            },
            reader: createReader({
                elements: {
                    libraryRoot: {
                        uid: 'libraryRoot',
                        styles: { base: { default: { height: '100%' } } },
                    },
                    cardInstance: {
                        uid: 'cardInstance',
                        emitDefaultDeclarations: false,
                        styles: {
                            base: {
                                default: {
                                    height: { __wwtype: 'f', code: 'variables.height' },
                                },
                            },
                        },
                    },
                },
                libraryComponents: {
                    libraryA: { rootElementUid: 'libraryRoot' },
                },
            }),
            stylesheet,
            runtime: STATIC_STYLE_RUNTIME,
        });
        const libraryRule = run.result.match(/\.ww-element-libraryRoot\s*\{[^}]*\}/)?.[0] || '';
        const instanceRule = run.result.match(/\.ww-element-cardInstance\s*\{[^}]*\}/)?.[0] || '';

        expect(libraryRule).toContain('height: 100%;');
        expect(instanceRule).toContain('height: var(--ww-style-height, auto);');
        expect(instanceRule).not.toContain('height: auto;');
        expect(variables).toEqual([
            expect.objectContaining({
                property: 'height',
                cssProperty: 'height',
                valueNormalizer: { type: 'falsy-fallback', fallbackValue: 'auto' },
            }),
        ]);

        run.stop();
    });

    it('compiles slotted children as normal element targets without childrenData-scoped selectors', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['slottedChild'],
                sectionUids: [],
                libraryComponentIds: ['libraryA'],
            },
            reader: createReader({
                elements: {
                    libraryRoot: {
                        uid: 'libraryRoot',
                        styles: {
                            base: {
                                default: {
                                    padding: '12px',
                                },
                            },
                        },
                    },
                    slottedChild: {
                        uid: 'slottedChild',
                        styles: {
                            base: {
                                default: {
                                    width: '220px',
                                },
                            },
                        },
                    },
                },
                libraryComponents: {
                    libraryA: { rootElementUid: 'libraryRoot' },
                },
            }),
            stylesheet,
        });
        const libraryRule = run.result.match(/\.ww-element-libraryRoot\s*\{[^}]*\}/)?.[0] || '';
        const slottedChildRule = run.result.match(/\.ww-element-slottedChild\s*\{[^}]*\}/)?.[0] || '';

        expect(libraryRule).toContain('padding: 12px;');
        expect(slottedChildRule).toContain('width: 220px;');
        expect(run.result).not.toContain('.ww-element-cardInstance .ww-element-dropzone');
    });

    it('keeps Vue target scopes alive after the target-list scope reruns', async () => {
        const stylesheet = createStringStyleSheetAdapter();
        const data = reactive({
            scope: {
                elementUids: ['elementA', 'elementB'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            elements: {
                elementA: createWidthElement('elementA', '100px'),
                elementB: createWidthElement('elementB', '200px'),
            },
        });
        const run = createStyleCompiler().compileStylesheet({
            scope: data.scope,
            reader: createReader({
                elements: data.elements,
            }),
            stylesheet,
            runtime: createVueStyleCompilerTestRuntime(),
        });

        await nextTick();
        expect(stylesheet.result()).toContain('width: 100px;');

        data.scope.elementUids.reverse();
        await nextTick();

        expect(stylesheet.result()).toContain('.ww-element-elementA');
        expect(stylesheet.result()).toContain('.ww-element-elementB');

        data.elements.elementA.styles!.base.default.width = '150px';
        await nextTick();

        expect(stylesheet.result()).toContain('width: 150px;');
        expect(stylesheet.result()).not.toContain('width: 100px;');

        run.stop();
        expect(stylesheet.result()).toBe('');
    });

    it('serializes custom CSS and reports unsafe declaration diagnostics', () => {
        const diagnostics: StyleDiagnostic[] = [];
        const stylesheet = createDiagnosticStringStyleSheetAdapter(diagnostics);
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: {
                            base: {
                                default: {
                                    customCss: {
                                        '--accent': '#09f',
                                        color: 'red; background: blue',
                                        'bad;property': 'red',
                                    },
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });

        expect(run.result).toContain('--accent: #09f;');
        expect(run.result).not.toContain('red; background');
        expect(run.result).not.toContain('bad;property');
        expect(diagnostics).toEqual([
            expect.objectContaining({ code: 'css-value-fallback', property: 'color' }),
            expect.objectContaining({ code: 'css-property-fallback', property: 'bad;property' }),
        ]);
    });

    it('applies section Custom CSS only to the legacy outer container surface', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: [],
                sectionUids: ['sectionA'],
                libraryComponentIds: [],
            },
            reader: createReader({
                sections: {
                    sectionA: {
                        uid: 'sectionA',
                        styles: {
                            base: {
                                default: {
                                    customCss: {
                                        backgroundImage: 'linear-gradient(red, blue)',
                                        backgroundSize: '50px 50px',
                                    },
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const containerRule = run.result.match(/\.ww-section-sectionA\s*\{[^}]*background-image[^}]*\}/)?.[0] || '';
        const elementRule =
            run.result.match(/\.ww-section-sectionA > \.ww-section-element\s*\{[^}]*background-image[^}]*\}/)?.[0] ||
            '';

        expect(containerRule).toContain('background-image: linear-gradient(red, blue);');
        expect(containerRule).toContain('background-size: 50px 50px;');
        expect(elementRule).toBe('');
    });

    it('keeps custom CSS above generated declarations across responsive rules', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: {
                            base: {
                                default: {
                                    padding: '104px 56px',
                                    customCss: {
                                        paddingLeft: 'max(56px, calc((100vw - 1180px) / 2))',
                                    },
                                },
                                tablet: {
                                    padding: '72px 32px',
                                },
                                mobile: {
                                    padding: '44px 24px 48px 24px',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const normalLayerIndex = run.result.indexOf('@layer normal');
        const customLayerIndex = run.result.indexOf('@layer custom');

        expect(run.result).toContain('@layer normal, custom;');
        expect(normalLayerIndex).toBeGreaterThanOrEqual(0);
        expect(customLayerIndex).toBeGreaterThan(normalLayerIndex);
        expect(run.result.slice(normalLayerIndex, customLayerIndex)).toContain('padding: 44px 24px 48px 24px;');
        expect(run.result.slice(customLayerIndex)).toContain('padding-left: max(56px, calc((100vw - 1180px) / 2));');
    });

    it('clears inherited custom CSS when a responsive breakpoint stores an empty map', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: {
                            base: {
                                default: {
                                    customCss: {
                                        'background-color': 'rgba(255, 255, 255, 0.1) !important',
                                        overflow: 'hidden !important',
                                    },
                                },
                                tablet: {
                                    customCss: {},
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const customLayer = run.result.slice(run.result.indexOf('@layer custom'));

        expect(customLayer).toContain('@media (min-width: 992px)');
        expect(customLayer).not.toContain('@media (min-width: 768px) and (max-width: 991px)');
        expect(customLayer.match(/background-color:/g)).toHaveLength(1);
        expect(customLayer.match(/overflow:/g)).toHaveLength(1);
    });

    it('replaces the whole inherited custom CSS map at responsive breakpoints', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: {
                            base: {
                                default: {
                                    customCss: {
                                        'background-color': 'red !important',
                                        overflow: 'hidden',
                                    },
                                },
                                tablet: {
                                    customCss: {
                                        color: 'blue',
                                    },
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const customLayer = run.result.slice(run.result.indexOf('@layer custom'));
        const desktopIndex = customLayer.indexOf('@media (min-width: 992px)');
        const tabletIndex = customLayer.indexOf('@media (min-width: 768px) and (max-width: 991px)');
        const mobileIndex = customLayer.indexOf('@media (max-width: 767px)');
        const desktopCss = customLayer.slice(desktopIndex, tabletIndex);
        const tabletCss = customLayer.slice(tabletIndex, mobileIndex);
        const mobileCss = customLayer.slice(mobileIndex);

        expect(desktopCss).toContain('background-color: red !important;');
        expect(desktopCss).toContain('overflow: hidden;');
        expect(desktopCss).not.toContain('color: blue;');
        expect(tabletCss).toContain('color: blue;');
        expect(tabletCss).not.toContain('background-color:');
        expect(tabletCss).not.toContain('overflow:');
        expect(mobileCss).toContain('color: blue;');
        expect(mobileCss).not.toContain('background-color:');
        expect(mobileCss).not.toContain('overflow:');
    });

    it('lets a state custom CSS map replace important and removed base declarations', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        stateNames: ['_wwHover'],
                        styles: {
                            base: {
                                default: {
                                    customCss: {
                                        color: 'red !important',
                                        overflow: 'hidden',
                                    },
                                },
                            },
                            _wwHover: {
                                default: {
                                    customCss: {
                                        color: 'blue',
                                    },
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const hoverRule = run.result.match(/\.ww-element-elementA:hover\s*\{[^}]*\}/)?.[0] || '';

        expect(hoverRule).toContain('color: blue !important;');
        expect(hoverRule).toContain('overflow: revert-layer;');
    });

    it('applies Custom CSS to native text above generated text declarations', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['textElement'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    textElement: {
                        uid: 'textElement',
                        capabilities: { inherits: ['ww-text'] },
                        styles: {
                            base: {
                                default: {
                                    customCss: {
                                        letterSpacing: '0.07em',
                                        textTransform: 'uppercase',
                                    },
                                },
                            },
                        },
                        content: {
                            base: {
                                default: {
                                    '_ww-text_font': "700 11px/1.3 'Public Sans', sans-serif",
                                    '_ww-text_letterSpacing': '-0.012em',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const customLayer = run.result.slice(run.result.indexOf('@layer custom'));

        expect(run.result).toContain('letter-spacing: -0.012em;');
        expect(customLayer).toContain('letter-spacing: 0.07em;');
        expect(customLayer).toContain('text-transform: uppercase;');
    });

    it('compiles section container and inner element declarations from the same source reader', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: [],
                sectionUids: ['sectionA'],
                libraryComponentIds: [],
            },
            reader: createReader({
                sections: {
                    sectionA: {
                        uid: 'sectionA',
                        capabilities: {
                            inherits: ['ww-layout'],
                        },
                        styles: {
                            base: {
                                default: {
                                    margin: '16px 0',
                                    minHeight: '320px',
                                    display: 'flex',
                                    width: '960px',
                                    padding: '32px',
                                    borderRadius: '8px',
                                },
                            },
                        },
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_rowGap': '12px',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });

        expect(run.result).toContain('.ww-section-sectionA');
        expect(run.result).toContain('margin: 16px 0;');
        expect(run.result).toContain('min-height: 320px;');
        expect(run.result).toContain('> .ww-section-element');
        expect(run.result).toContain('> .ww-section-element.ww-layout');
        expect(run.result).not.toContain('> .ww-section-element .ww-layout');
        expect(run.result).toContain('row-gap: 12px;');
        expect(run.result).toContain('width: 960px;');
        expect(run.result).toContain('padding: 32px;');
        expect(run.result).toContain('border-radius: 8px;');
    });

    it('emits background longhands and lets CSS cascade responsive pieces', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        capabilities: {
                            inherits: ['ww-layout'],
                        },
                        styles: {
                            base: {
                                default: {
                                    backgroundColor: 'red',
                                    backgroundImage: 'image.png',
                                    backgroundPositionX: 'left',
                                    backgroundPositionY: 'top',
                                    backgroundSize: 'contain',
                                    backgroundRepeat: 'repeat-x',
                                    backgroundAttachment: 'fixed',
                                },
                                tablet: {
                                    backgroundColor: 'blue',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });
        const tabletCss = run.result.slice(run.result.indexOf('@media (max-width: 991px)'));

        expect(run.result).not.toContain('background:');
        expect(run.result).toContain('background-color: red;');
        expect(run.result).toContain("background-image: url('image.png');");
        expect(run.result).toContain('background-position-x: left;');
        expect(run.result).toContain('background-position-y: top;');
        expect(run.result).toContain('background-size: contain;');
        expect(run.result).toContain('background-repeat: repeat-x;');
        expect(run.result).toContain('background-attachment: fixed;');
        expect(tabletCss).toContain('background-color: blue;');
        expect(tabletCss).not.toContain('background-image:');
        expect(tabletCss).not.toContain('background-size:');
    });

    it('keeps a lone legacy background gradient in the shorthand grammar', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: {
                            base: {
                                default: {
                                    backgroundGradient: 'var(--theme-background, #747878)',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });

        expect(run.result).toContain('background: var(--theme-background, #747878);');
        expect(run.result).not.toContain('background-image: var(--theme-background, #747878);');
    });

    it('resolves relative background images against the configured asset base URL', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: {
                            base: {
                                default: {
                                    backgroundImage: 'designs/project/sections/hero.png',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
            assetBaseUrl: 'https://cdn.weweb-staging.io/',
        });

        expect(run.result).toContain(
            "background-image: url('https://cdn.weweb-staging.io/designs/project/sections/hero.png');"
        );
    });

    it('resets formula-backed background pieces when runtime resolves an empty value', () => {
        const variables: StyleDynamicVariable[] = [];
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: {
                            base: {
                                default: {
                                    backgroundColor: {
                                        __wwtype: 'f',
                                        code: 'variables.color',
                                        staticValue: 'red',
                                    },
                                    backgroundGradient: {
                                        __wwtype: 'f',
                                        code: 'variables.gradient',
                                        staticValue: 'linear-gradient(black, white)',
                                    },
                                    backgroundImage: {
                                        __wwtype: 'f',
                                        code: 'variables.image',
                                        staticValue: 'image.png',
                                    },
                                    backgroundPositionX: {
                                        __wwtype: 'f',
                                        code: 'variables.positionX',
                                        staticValue: 'left',
                                    },
                                    backgroundPositionY: {
                                        __wwtype: 'f',
                                        code: 'variables.positionY',
                                        staticValue: 'top',
                                    },
                                    backgroundSize: {
                                        __wwtype: 'f',
                                        code: 'variables.size',
                                        staticValue: 'contain',
                                    },
                                    backgroundRepeat: {
                                        __wwtype: 'f',
                                        code: 'variables.repeat',
                                        staticValue: 'repeat-x',
                                    },
                                    backgroundAttachment: {
                                        __wwtype: 'f',
                                        code: 'variables.attachment',
                                        staticValue: 'fixed',
                                    },
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createDynamicVariableStringStyleSheetAdapter(variables),
            assetBaseUrl: 'https://cdn.weweb-staging.io/',
        });
        const emptyFallbacks = {
            backgroundColor: 'transparent',
            backgroundGradient: 'none',
            backgroundImage: 'none',
            backgroundPositionX: 'center',
            backgroundPositionY: 'center',
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'scroll',
        };
        const validationProperties = {
            backgroundColor: 'background',
            backgroundGradient: 'background',
            backgroundImage: 'background-image',
            backgroundPositionX: 'background-position',
            backgroundPositionY: 'background-position',
            backgroundSize: 'background-size',
            backgroundRepeat: 'background-repeat',
            backgroundAttachment: 'background-attachment',
        };

        expect(run.result).toContain(
            "background: var(--ww-style-background-gradient, linear-gradient(black, white)), var(--ww-style-background-image, url('https://cdn.weweb-staging.io/image.png')) var(--ww-style-background-position-x, left) var(--ww-style-background-position-y, top) / var(--ww-style-background-size, contain) var(--ww-style-background-repeat, repeat-x) var(--ww-style-background-attachment, fixed), var(--ww-style-background-color, red);"
        );
        for (const [property, expectedValue] of Object.entries(emptyFallbacks)) {
            const variable = variables.find(variable => variable.property === property);
            expect(variable).toBeDefined();
            expect(variable?.cssProperty).toBe('background');
            expect(variable?.validationProperty).toBe(
                validationProperties[property as keyof typeof validationProperties]
            );
            if (property === 'backgroundImage') {
                expect(variable?.valueNormalizer).toEqual({
                    type: 'background-image',
                    assetBaseUrl: 'https://cdn.weweb-staging.io/',
                    fallbackValue: 'none',
                });
            }
            expect(
                serializeRuntimeCssVariableValue(variable!.cssProperty, '', {
                    valueNormalizer: variable!.valueNormalizer,
                })
            ).toBe(expectedValue);
        }
    });

    it('preserves legacy shorthand semantics for formula-bound background colors', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: {
                            base: {
                                default: {
                                    backgroundColor: {
                                        __wwtype: 'f',
                                        code: 'variables.color',
                                        staticValue: '#FB1818',
                                    },
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });

        expect(run.result).toContain('background: var(--ww-style-background-color, #FB1818);');
        expect(run.result).not.toContain('background-color: var(--ww-style-background-color');
    });

    it('keeps every ordered background layer when the background color is formula-bound', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: {
                            base: {
                                default: {
                                    backgroundColor: {
                                        __wwtype: 'f',
                                        code: 'variables.color',
                                        staticValue: '#FB1818',
                                    },
                                    backgroundGradient: 'linear-gradient(black, white)',
                                    backgroundImage: 'image.png',
                                    backgroundPositionX: 'left',
                                    backgroundPositionY: 'top',
                                    backgroundSize: 'contain',
                                    backgroundRepeat: 'repeat-x',
                                    backgroundAttachment: 'fixed',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });

        expect(run.result).toContain(
            "background: linear-gradient(black, white), url('image.png') left top / contain repeat-x fixed, var(--ww-style-background-color, #FB1818);"
        );
    });

    it('keeps formula-bound background colors in their authored layer order', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: {
                            base: {
                                default: {
                                    backgroundOrder: 'col,img,grad',
                                    backgroundColor: {
                                        __wwtype: 'f',
                                        code: 'variables.color',
                                        staticValue: '#FB1818',
                                    },
                                    backgroundImage: 'image.png',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });

        expect(run.result).toContain(
            "background: linear-gradient(0deg, var(--ww-style-background-color, #FB1818), var(--ww-style-background-color, #FB1818)), url('image.png') center center / cover no-repeat scroll;"
        );
    });

    it('rebuilds formula-bound composite backgrounds for responsive states', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        states: [{ id: '_wwHover', selectors: [':hover'] }],
                        styles: {
                            base: {
                                default: {
                                    backgroundColor: {
                                        __wwtype: 'f',
                                        code: 'variables.color',
                                        staticValue: '#FB1818',
                                    },
                                    backgroundImage: 'base.png',
                                },
                                tablet: {
                                    backgroundImage: 'tablet.png',
                                },
                            },
                            _wwHover: {
                                default: {
                                    backgroundGradient: 'linear-gradient(black, white)',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const tabletCss = run.result.slice(run.result.indexOf('@media (max-width: 991px)'));
        const hoverRule = run.result.match(/\.ww-element-elementA:hover\s*\{[^}]*\}/)?.[0] || '';

        expect(tabletCss).toContain(
            "background: url('tablet.png') center center / cover no-repeat scroll, var(--ww-style-background-color, #FB1818);"
        );
        expect(hoverRule).toContain(
            "background: linear-gradient(black, white), url('base.png') center center / cover no-repeat scroll, var(--ww-style-background-color, #FB1818);"
        );
    });

    it('keeps formula-bound composite backgrounds in the library layer', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: [],
                sectionUids: [],
                libraryComponentIds: ['libraryA'],
            },
            reader: createReader({
                elements: {
                    libraryRoot: {
                        uid: 'libraryRoot',
                        styles: {
                            base: {
                                default: {
                                    backgroundColor: {
                                        __wwtype: 'f',
                                        code: 'variables.color',
                                        staticValue: '#FB1818',
                                    },
                                },
                            },
                        },
                    },
                },
                libraryComponents: {
                    libraryA: { rootElementUid: 'libraryRoot' },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const libraryCss = run.result.slice(
            run.result.indexOf('@layer ww-style-library'),
            run.result.indexOf('@layer ww-style-section')
        );

        expect(libraryCss).toContain('.ww-element-libraryRoot');
        expect(libraryCss).toContain('background: var(--ww-style-background-color, #FB1818);');
    });

    it('uses effective background values only when a layer-aware background piece changes', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: {
                            base: {
                                default: {
                                    backgroundColor: 'rgba(255, 0, 0, 0.5)',
                                    backgroundImage: 'image.png',
                                },
                                tablet: {
                                    backgroundOrder: 'col,img,grad',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });
        const tabletCss = run.result.slice(run.result.indexOf('@media (max-width: 991px)'));

        expect(tabletCss).toContain('background-color: transparent;');
        expect(tabletCss).toContain(
            "background-image: linear-gradient(0deg, rgba(255, 0, 0, 0.5), rgba(255, 0, 0, 0.5)), url('image.png');"
        );
    });

    it('keeps non-last background colors as ordered image layers', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: {
                            base: {
                                default: {
                                    backgroundOrder: 'col,img,grad',
                                    backgroundColor: 'rgba(255, 0, 0, 0.5)',
                                    backgroundImage: 'image.png',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });

        expect(run.result).toContain('background-color: transparent;');
        expect(run.result).toContain(
            "background-image: linear-gradient(0deg, rgba(255, 0, 0, 0.5), rgba(255, 0, 0, 0.5)), url('image.png');"
        );
        expect(run.result).toContain('background-position-x: 0%, center;');
        expect(run.result).toContain('background-position-y: 0%, center;');
        expect(run.result).toContain('background-size: auto, cover;');
        expect(run.result).toContain('background-repeat: repeat, no-repeat;');
        expect(run.result).toContain('background-attachment: scroll, scroll;');
    });

    it('compiles wwLayout flex CSS from content properties', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        capabilities: {
                            inherits: ['ww-layout'],
                        },
                        styles: {
                            base: {
                                default: {
                                    display: 'flex',
                                },
                            },
                        },
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_flexDirection': 'row',
                                    '_ww-layout_reverse': true,
                                    '_ww-layout_justifyContent': 'space-between',
                                    '_ww-layout_alignItems': 'center',
                                    '_ww-layout_rowGap': '8px',
                                    '_ww-layout_columnGap': '12px',
                                    '_ww-layout_flexWrap': true,
                                    '_ww-layout_alignContent': 'stretch',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });

        expect(run.result).toContain('.ww-element-elementA.ww-layout');
        expect(run.result).toContain('.ww-element-elementA [data-ww-layout-style-scopes~="elementA"]');
        expect(run.result).not.toContain('.ww-element-elementA .ww-layout');
        expect(run.result).toContain('display: flex;');
        expect(run.result).toContain('flex-direction: row-reverse;');
        expect(run.result).toContain('justify-content: space-between;');
        expect(run.result).toContain('align-items: center;');
        expect(run.result).toContain('row-gap: 8px;');
        expect(run.result).toContain('column-gap: 12px;');
        expect(run.result).toContain('flex-wrap: wrap;');
        expect(run.result).toContain('align-content: stretch;');
    });

    it('uses the component default display when compiling wwLayout content CSS', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        capabilities: {
                            inherits: ['ww-layout'],
                            displayAllowedValues: ['flex', 'inline-flex'],
                        },
                        styles: {
                            base: {
                                default: {},
                            },
                        },
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_flexDirection': 'column',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });

        const layoutRule =
            run.result.match(
                /\.ww-element-elementA\.ww-layout,\n\s*\.ww-element-elementA \[data-ww-layout-style-scopes~="elementA"\]\s*\{[^}]*\}/
            )?.[0] || '';

        expect(layoutRule).toContain('display: flex;');
        expect(layoutRule).toContain('flex-direction: column;');
    });

    it('uses the component display when responsive wwLayout content changes without an explicit display', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        capabilities: {
                            inherits: ['ww-layout'],
                            displayAllowedValues: ['flex'],
                        },
                        styles: {
                            base: {
                                default: {},
                            },
                        },
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_flexDirection': 'row',
                                },
                                tablet: {
                                    '_ww-layout_flexDirection': 'column',
                                    '_ww-layout_justifyContent': 'space-between',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const tabletCss = run.result.slice(run.result.indexOf('@media (max-width: 991px)'));

        expect(tabletCss).toContain('display: flex;');
        expect(tabletCss).toContain('flex-direction: column;');
        expect(tabletCss).toContain('justify-content: space-between;');
    });

    it('clears inherited grid layout values when a responsive slot explicitly empties them', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        capabilities: {
                            inherits: ['ww-layout'],
                            displayAllowedValues: ['grid'],
                        },
                        styles: {
                            base: {
                                default: { display: 'grid' },
                            },
                        },
                        content: {
                            base: {
                                default: {
                                    '_ww-grid_columns': ['1fr', '0.5fr', '0.3fr'],
                                    '_ww-grid_rows': ['auto', '1fr'],
                                    '_ww-grid_columnGap': '10px',
                                    '_ww-grid_rowGap': '12px',
                                },
                                mobile: {
                                    '_ww-grid_columns': [],
                                    '_ww-grid_rows': [],
                                    '_ww-grid_columnGap': null,
                                    '_ww-grid_rowGap': 0,
                                    '_ww-grid_flowDirection': 'row',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const mobileCss = run.result.slice(run.result.indexOf('@media (max-width: 767px)'));

        expect(mobileCss).toContain('grid-template-columns: revert-layer;');
        expect(mobileCss).toContain('grid-template-rows: revert-layer;');
        expect(mobileCss).toContain('column-gap: revert-layer;');
        expect(mobileCss).toContain('row-gap: revert-layer;');
    });

    it('clears inherited flex and table values with legacy falsy semantics', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['flexElement', 'tableElement'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    flexElement: {
                        uid: 'flexElement',
                        capabilities: {
                            inherits: ['ww-layout'],
                            displayAllowedValues: ['flex'],
                        },
                        styles: { base: { default: { display: 'flex' } } },
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_justifyContent': 'center',
                                    '_ww-layout_alignItems': 'center',
                                    '_ww-layout_alignContent': 'space-between',
                                    '_ww-layout_rowGap': '10px',
                                    '_ww-layout_columnGap': '12px',
                                    '_ww-layout_flexWrap': true,
                                },
                                tablet: {
                                    '_ww-layout_justifyContent': null,
                                    '_ww-layout_alignItems': '',
                                    '_ww-layout_rowGap': 0,
                                    '_ww-layout_columnGap': null,
                                    '_ww-layout_flexWrap': false,
                                },
                            },
                        },
                    },
                    tableElement: {
                        uid: 'tableElement',
                        capabilities: {
                            inherits: ['ww-layout'],
                            displayAllowedValues: ['table'],
                        },
                        styles: { base: { default: { display: 'table' } } },
                        content: {
                            base: {
                                default: {
                                    '_ww-table_layout': 'fixed',
                                    '_ww-table_borderCollapse': 'collapse',
                                    '_ww-table_borderSpacing': '2px',
                                },
                                tablet: {
                                    '_ww-table_layout': null,
                                    '_ww-table_borderCollapse': '',
                                    '_ww-table_borderSpacing': 0,
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const tabletCss = run.result.slice(run.result.indexOf('@media (max-width: 991px)'));

        expect(tabletCss).toContain('justify-content: revert-layer;');
        expect(tabletCss).toContain('align-items: revert-layer;');
        expect(tabletCss).toContain('align-content: revert-layer;');
        expect(tabletCss).toContain('row-gap: revert-layer;');
        expect(tabletCss).toContain('column-gap: revert-layer;');
        expect(tabletCss).toContain('flex-wrap: nowrap;');
        expect(tabletCss).toContain('table-layout: revert-layer;');
        expect(tabletCss).toContain('border-collapse: revert-layer;');
        expect(tabletCss).toContain('border-spacing: revert-layer;');
    });

    it('applies content classes and subclasses to wwLayout declarations', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        capabilities: {
                            inherits: ['ww-layout'],
                        },
                        classIds: { base: ['classA'] },
                        subClassIds: { base: { classA: ['subA'] } },
                        styles: {
                            base: {
                                default: {
                                    display: 'flex',
                                },
                            },
                        },
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_columnGap': '16px',
                                },
                            },
                        },
                    },
                },
                classes: {
                    classA: {
                        uid: 'classA',
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_rowGap': '8px',
                                },
                            },
                        },
                        subClasses: {
                            subA: {
                                uid: 'subA',
                                content: {
                                    base: {
                                        default: {
                                            '_ww-layout_rowGap': '12px',
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });

        expect(run.result).toContain('row-gap: 12px;');
        expect(run.result).toContain('column-gap: 16px;');
        expect(run.result.indexOf('row-gap: 8px;')).toBeLessThan(run.result.indexOf('row-gap: 12px;'));
    });

    it('resolves class wwLayout content in the source layout rule', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        capabilities: {
                            inherits: ['ww-layout'],
                        },
                        classIds: { base: ['classA'] },
                        styles: {
                            base: {
                                default: {
                                    display: 'flex',
                                },
                            },
                        },
                    },
                },
                classes: {
                    classA: {
                        uid: 'classA',
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_rowGap': '8px',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });
        const layoutRule =
            run.result.match(
                /\.ww-element-elementA\.ww-layout,\n\s*\.ww-element-elementA \[data-ww-layout-style-scopes~="elementA"\]\s*\{[^}]*\}/
            )?.[0] || '';

        expect(layoutRule).toContain('display: flex;');
        expect(layoutRule).toContain('row-gap: 8px;');
        expect(run.result).not.toContain('ww-style-class');
    });

    it('compiles responsive and stateful wwLayout content CSS', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        capabilities: {
                            inherits: ['ww-layout'],
                        },
                        styles: {
                            base: {
                                default: {
                                    display: 'flex',
                                },
                            },
                        },
                        content: {
                            base: {
                                tablet: {
                                    '_ww-layout_rowGap': '20px',
                                },
                            },
                            _wwHover: {
                                default: {
                                    '_ww-layout_alignItems': 'flex-end',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });
        const tabletCss = run.result.slice(run.result.indexOf('@media (max-width: 991px)'));

        expect(tabletCss).toContain('.ww-element-elementA.ww-layout');
        expect(tabletCss).toContain('row-gap: 20px;');
        expect(run.result).toMatch(
            /\.ww-element-elementA\.ww-layout:hover,\n\s*\.ww-element-elementA \[data-ww-layout-style-scopes~="elementA"\]:hover/
        );
        expect(run.result).toContain('align-items: flex-end;');
    });

    it('emits effective layout declarations when responsive and state changes activate layout families', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        capabilities: {
                            inherits: ['ww-layout'],
                            displayAllowedValues: ['flex', 'block', 'grid', 'inline-flex'],
                        },
                        stateNames: ['_wwHover'],
                        styles: {
                            base: {
                                default: {
                                    display: 'none',
                                },
                                tablet: {
                                    display: 'flex',
                                },
                            },
                            _wwHover: {
                                default: {
                                    display: 'grid',
                                },
                            },
                        },
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_flexDirection': 'column',
                                    '_ww-layout_alignItems': 'flex-start',
                                    '_ww-grid_columns': ['1fr', '2fr'],
                                    '_ww-grid_rowGap': '12px',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const tabletCss = run.result.slice(run.result.indexOf('@media (max-width: 991px)'));
        const baseLayoutRule =
            run.result.match(
                /\.ww-element-elementA\.ww-layout,\n\s*\.ww-element-elementA \[data-ww-layout-style-scopes~="elementA"\]\s*\{[^}]*\}/
            )?.[0] || '';
        const tabletLayoutRule =
            [
                ...tabletCss.matchAll(
                    /\.ww-element-elementA\.ww-layout,\n\s*\.ww-element-elementA \[data-ww-layout-style-scopes~="elementA"\]\s*\{[^}]*\}/g
                ),
            ]
                .map(match => match[0])
                .find(rule => rule.includes('display: flex;')) || '';
        const hoverLayoutRule =
            run.result.match(
                /\.ww-element-elementA\.ww-layout:hover,\n\s*\.ww-element-elementA \[data-ww-layout-style-scopes~="elementA"\]:hover\s*\{[^}]*\}/
            )?.[0] || '';

        expect(baseLayoutRule).toContain('display: none;');
        expect(tabletLayoutRule).toContain('display: flex;');
        expect(tabletLayoutRule).toContain('flex-direction: column;');
        expect(tabletLayoutRule).toContain('align-items: flex-start;');
        expect(hoverLayoutRule).toContain('display: grid;');
        expect(hoverLayoutRule).toContain('grid-template-columns: 1fr 2fr;');
        expect(hoverLayoutRule).toContain('row-gap: 12px;');
    });

    it('emits inherited flex declarations when a state activates the flex layout family', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        capabilities: {
                            inherits: ['ww-layout'],
                            displayAllowedValues: ['flex', 'block', 'grid', 'inline-flex'],
                        },
                        stateNames: ['open'],
                        styles: {
                            base: {
                                default: {
                                    display: false,
                                },
                            },
                            open: {
                                default: {
                                    display: true,
                                },
                            },
                        },
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_flexDirection': 'column',
                                    '_ww-layout_alignItems': 'flex-start',
                                    '_ww-layout_flexWrap': true,
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const openLayoutRule =
            run.result.match(
                /\.ww-element-elementA\.ww-layout\[data-ww-states~="open"\],\n\s*\.ww-element-elementA \[data-ww-layout-style-scopes~="elementA"\]\[data-ww-states~="open"\][^{]*\{[^}]*\}/
            )?.[0] || '';

        expect(openLayoutRule).toContain('display: flex;');
        expect(openLayoutRule).toContain('flex-direction: column;');
        expect(openLayoutRule).toContain('align-items: flex-start;');
        expect(openLayoutRule).toContain('flex-wrap: nowrap;');
    });

    it('emits display-only responsive changes on the section layout surface', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: [],
                sectionUids: ['sectionA'],
                libraryComponentIds: [],
            },
            reader: createReader({
                sections: {
                    sectionA: {
                        uid: 'sectionA',
                        capabilities: {
                            inherits: ['ww-layout'],
                        },
                        styles: {
                            base: {
                                default: {
                                    display: 'none',
                                },
                                tablet: {
                                    display: 'flex',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const tabletCss = run.result.slice(run.result.indexOf('@media (max-width: 991px)'));
        const baseLayoutRule =
            run.result.match(/\.ww-section-sectionA > \.ww-section-element\.ww-layout\s*\{[^}]*\}/)?.[0] || '';
        const tabletLayoutRule =
            [...tabletCss.matchAll(/\.ww-section-sectionA > \.ww-section-element\.ww-layout\s*\{[^}]*\}/g)]
                .map(match => match[0])
                .find(rule => rule.includes('display: flex;')) || '';

        expect(baseLayoutRule).toContain('display: none;');
        expect(tabletLayoutRule).toContain('display: flex;');
    });

    it('uses effective content pieces for responsive flex layout composites', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        capabilities: {
                            inherits: ['ww-layout'],
                        },
                        styles: {
                            base: {
                                default: {
                                    display: 'flex',
                                },
                            },
                        },
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_flexDirection': 'row',
                                    '_ww-layout_flexWrap': true,
                                },
                                tablet: {
                                    '_ww-layout_reverse': true,
                                    '_ww-layout_alignContent': 'space-between',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });
        const tabletCss = run.result.slice(run.result.indexOf('@media (max-width: 991px)'));

        expect(tabletCss).toContain('flex-direction: row-reverse;');
        expect(tabletCss).toContain('align-content: space-between;');
    });

    it('compiles text-align-only block wwLayout CSS', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        capabilities: {
                            inherits: ['ww-layout'],
                        },
                        styles: {
                            base: {
                                default: {
                                    display: 'block',
                                    textAlign: 'center',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });

        expect(run.result).toContain('.ww-element-elementA.ww-layout');
        expect(run.result).toContain('display: block;');
        expect(run.result).toContain('height: 100%;');
        expect(run.result).toContain('text-align: center;');
    });

    it('does not let internal block layout height override the element root height', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        capabilities: {
                            inherits: ['ww-layout'],
                        },
                        styles: {
                            base: {
                                default: {
                                    display: 'block',
                                    height: '240px',
                                },
                                tablet: {
                                    height: '120px',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const rootRule = run.result.match(/\.ww-element-elementA\s*\{[^}]*\}/)?.[0] || '';
        const layoutRule =
            run.result.match(
                /\.ww-element-elementA\.ww-layout,\n\s*\.ww-element-elementA \[data-ww-layout-style-scopes~="elementA"\]\s*\{[^}]*\}/
            )?.[0] || '';
        const internalLayoutRule =
            [...run.result.matchAll(/\.ww-element-elementA \[data-ww-layout-style-scopes~="elementA"\]\s*\{[^}]*\}/g)]
                .map(match => match[0])
                .find(rule => rule.includes('height: 100%;')) || '';
        const tabletCss = run.result.slice(run.result.indexOf('@media (max-width: 991px)'));

        expect(rootRule).toContain('height: 240px;');
        expect(layoutRule).toContain('display: block;');
        expect(layoutRule).not.toContain('height: 100%;');
        expect(internalLayoutRule).toContain('height: 100%;');
        expect(tabletCss).toContain('height: 120px;');
    });

    it('does not override child margins when wwLayout push-last is disabled', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        capabilities: {
                            inherits: ['ww-layout'],
                            displayAllowedValues: ['flex'],
                        },
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_flexDirection': 'column',
                                    '_ww-layout_pushLast': false,
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });

        expect(run.result).not.toContain('margin-left: unset;');
        expect(run.result).not.toContain('margin-top: unset;');
        expect(run.result).not.toContain('margin-left: auto;');
        expect(run.result).not.toContain('margin-top: auto;');
    });

    it('scopes wwLayout push-last to mutually exclusive responsive ranges', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        capabilities: {
                            inherits: ['ww-layout'],
                        },
                        styles: {
                            base: {
                                default: {
                                    display: 'flex',
                                },
                            },
                        },
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_flexDirection': 'row',
                                    '_ww-layout_pushLast': true,
                                },
                                tablet: {
                                    '_ww-layout_flexDirection': 'column',
                                    '_ww-layout_pushLast': false,
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });

        expect(run.result).toContain('@media (min-width: 992px)');
        expect(run.result).toContain('margin-left: auto;');
        expect(run.result).not.toContain('margin-top: auto;');
        expect(run.result).not.toContain('margin-left: unset;');
        expect(run.result).not.toContain('margin-top: unset;');
    });

    it('emits inherited wwLayout push-last behavior for every responsive range', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        capabilities: {
                            inherits: ['ww-layout'],
                            displayAllowedValues: ['flex'],
                        },
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_flexDirection': 'row',
                                    '_ww-layout_pushLast': true,
                                },
                                tablet: {
                                    '_ww-layout_flexDirection': 'column',
                                },
                                mobile: {
                                    '_ww-layout_reverse': true,
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });

        expect(run.result).toContain('@media (min-width: 992px)');
        expect(run.result).toContain('@media (min-width: 768px) and (max-width: 991px)');
        expect(run.result).toContain('@media (max-width: 767px)');
        expect(run.result.match(/margin-left: auto;/g)).toHaveLength(1);
        expect(run.result.match(/margin-top: auto;/g)).toHaveLength(2);
        expect(run.result).toContain('> :nth-child(1 of .ww-element)');
    });

    it('emits CSS variables for dynamic wwLayout content values', () => {
        const variables: StyleDynamicVariable[] = [];
        const stylesheet = createDynamicVariableStringStyleSheetAdapter(variables);
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        capabilities: {
                            inherits: ['ww-layout'],
                        },
                        styles: {
                            base: {
                                default: {
                                    display: 'flex',
                                },
                            },
                        },
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_rowGap': { __wwtype: 'f', code: 'variables.gap' },
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });

        expect(run.result).not.toContain('[object Object]');
        expect(run.result).toContain('@property --ww-content-ww-layout-row-gap');
        expect(run.result).toContain('row-gap: var(--ww-content-ww-layout-row-gap);');
        expect(variables).toEqual([
            expect.objectContaining({
                name: '--ww-content-ww-layout-row-gap',
                property: '_ww-layout_rowGap',
                cssProperty: 'row-gap',
                domain: 'content',
                state: 'base',
                breakpoint: 'default',
            }),
        ]);
    });

    it('emits CSS variables for dynamic style values without serializing formula objects', () => {
        const variables: StyleDynamicVariable[] = [];
        const stylesheet = createDynamicVariableStringStyleSheetAdapter(variables);
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        capabilities: {
                            inherits: ['ww-layout'],
                        },
                        styles: {
                            base: {
                                default: {
                                    width: { __wwtype: 'f', code: 'variables.width' },
                                    padding: '12px',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });

        expect(run.result).toContain('padding: 12px;');
        expect(run.result).not.toContain('[object Object]');
        expect(run.result).toContain('@property --ww-style-width');
        expect(run.result).toContain('width: var(--ww-style-width);');
        expect(variables).toEqual([
            expect.objectContaining({
                name: '--ww-style-width',
                property: 'width',
                cssProperty: 'width',
                domain: 'style',
                state: 'base',
                breakpoint: 'default',
            }),
        ]);
    });

    it('serializes numeric runtime formula values with property-aware units', () => {
        expect(serializeRuntimeCssVariableValue('width', 200)).toBe('200px');
        expect(serializeRuntimeCssVariableValue('padding-top', 12)).toBe('12px');
        expect(serializeRuntimeCssVariableValue('opacity', 0.5)).toBe('0.5');
        expect(serializeRuntimeCssVariableValue('z-index', 10)).toBe('10');
        expect(serializeRuntimeCssVariableValue('--placeholder-color', 200)).toBe('200');
    });

    it('separates legacy important priorities only for standard CSS properties', () => {
        expect(splitLegacyCssPriority('width', '320px !important')).toEqual({
            value: '320px',
            priority: 'important',
        });
        expect(splitLegacyCssPriority('background-color', 'red ! IMPORTANT ')).toEqual({
            value: 'red',
            priority: 'important',
        });
        expect(splitLegacyCssPriority('--theme-color', 'red !important')).toEqual({
            value: 'red !important',
            priority: '',
        });
        expect(splitLegacyCssPriority('content', '"not !important"')).toEqual({
            value: '"not !important"',
            priority: '',
        });
    });

    it('allows data URLs only inside a complete normalized background image URL', () => {
        const valueNormalizer = { type: 'background-image' as const };

        expect(
            serializeRuntimeCssVariableValue('background-image', 'data:image/png;base64,AAAA', {
                valueNormalizer,
            })
        ).toBe("url('data:image/png;base64,AAAA')");
        expect(
            serializeRuntimeCssVariableValue('background-image', "url('/hero.png'); color: red", {
                valueNormalizer,
            })
        ).toBeUndefined();
    });

    it('emits CSS variables for dynamic component CSS output values', () => {
        const variables: StyleDynamicVariable[] = [];
        const stylesheet = createDynamicVariableStringStyleSheetAdapter(variables);
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        capabilities: {
                            css({ breakpoint, content, state }) {
                                if (state !== 'base' || breakpoint !== 'default') return [];

                                return [{ property: '--placeholder-color', value: content.placeholderColor }];
                            },
                        },
                        content: {
                            base: {
                                default: {
                                    placeholderColor: { __wwtype: 'f', code: 'variables.placeholderColor' },
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });

        expect(run.result).not.toContain('[object Object]');
        expect(run.result).toContain('@property --ww-content-placeholder-color');
        expect(run.result).toContain('--placeholder-color: var(--ww-content-placeholder-color);');
        expect(variables).toEqual([
            expect.objectContaining({
                name: '--ww-content-placeholder-color',
                property: 'placeholderColor',
                cssProperty: '--placeholder-color',
                domain: 'content',
                state: 'base',
                breakpoint: 'default',
            }),
        ]);
    });

    it('maps component CSS output values statically and through dynamic runtime variables', () => {
        const variables: StyleDynamicVariable[] = [];
        const stylesheet = createDynamicVariableStringStyleSheetAdapter(variables);
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        capabilities: {
                            css({ content }) {
                                return [
                                    {
                                        property: '--ww-text-white-space',
                                        value: content._mapValue('_ww-text_nowrap', 'white-space', {
                                            trueValue: 'nowrap',
                                            falseValue: 'initial',
                                        }),
                                    },
                                    {
                                        property: '--ww-text-overflow',
                                        value: content._mapValue('_ww-text_nowrap', 'overflow', {
                                            trueValue: 'hidden',
                                            falseValue: 'initial',
                                        }),
                                    },
                                    {
                                        property: '--ww-text-text-overflow',
                                        value: content._mapValue('_ww-text_ellipsis', 'text-overflow', {
                                            trueValue: 'ellipsis',
                                            falseValue: 'initial',
                                        }),
                                    },
                                ];
                            },
                        },
                        content: {
                            base: {
                                default: {
                                    '_ww-text_nowrap': { __wwtype: 'f', code: 'variables.nowrap' },
                                    '_ww-text_ellipsis': true,
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });

        expect(run.result).not.toContain('[object Object]');
        expect(run.result).toContain('@property --ww-content-ww-text-nowrap-white-space');
        expect(run.result).toContain('@property --ww-content-ww-text-nowrap-overflow');
        expect(run.result).toContain('--ww-text-white-space: var(--ww-content-ww-text-nowrap-white-space);');
        expect(run.result).toContain('--ww-text-overflow: var(--ww-content-ww-text-nowrap-overflow);');
        expect(run.result).toContain('--ww-text-text-overflow: ellipsis;');
        expect(variables).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: '--ww-content-ww-text-nowrap-white-space',
                    property: '_ww-text_nowrap',
                    outputKey: 'white-space',
                    cssProperty: '--ww-text-white-space',
                    valueNormalizer: {
                        type: 'map',
                        map: {
                            trueValue: 'nowrap',
                            falseValue: 'initial',
                        },
                    },
                }),
                expect.objectContaining({
                    name: '--ww-content-ww-text-nowrap-overflow',
                    property: '_ww-text_nowrap',
                    outputKey: 'overflow',
                    cssProperty: '--ww-text-overflow',
                    valueNormalizer: {
                        type: 'map',
                        map: {
                            trueValue: 'hidden',
                            falseValue: 'initial',
                        },
                    },
                }),
            ])
        );
        const whiteSpaceVariable = variables.find(
            variable => variable.name === '--ww-content-ww-text-nowrap-white-space'
        );
        const overflowVariable = variables.find(variable => variable.name === '--ww-content-ww-text-nowrap-overflow');

        expect(
            serializeRuntimeCssVariableValue('--ww-text-white-space', true, {
                valueNormalizer: whiteSpaceVariable?.valueNormalizer,
            })
        ).toBe('nowrap');
        expect(
            serializeRuntimeCssVariableValue('--ww-text-overflow', false, {
                valueNormalizer: overflowVariable?.valueNormalizer,
            })
        ).toBe('initial');
    });

    it('maps formula fallbacks through component CSS value normalizers', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        capabilities: {
                            css({ content }) {
                                return [
                                    {
                                        property: '--ww-text-white-space',
                                        value: content._mapValue('_ww-text_nowrap', 'white-space', {
                                            trueValue: 'nowrap',
                                            falseValue: 'initial',
                                        }),
                                    },
                                ];
                            },
                        },
                        content: {
                            base: {
                                default: {
                                    '_ww-text_nowrap': { __wwtype: 'f', code: 'variables.nowrap' },
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
            resolveFormulaFallback() {
                return { status: 'resolved', value: true };
            },
        });

        expect(run.result).toContain('--ww-text-white-space: var(--ww-content-ww-text-nowrap-white-space, nowrap);');
    });

    it('registers stringified dynamic component CSS values with the final state selector', () => {
        const variables: StyleDynamicVariable[] = [];
        const stylesheet = createDynamicVariableStringStyleSheetAdapter(variables);
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        capabilities: {
                            css({ style }) {
                                const width = style.width;
                                if (!width) return [];

                                return [{ property: 'width', value: `calc(${width} + 10px)` }];
                            },
                        },
                        styles: {
                            base: {
                                default: {
                                    width: { __wwtype: 'f', code: 'variables.baseWidth' },
                                },
                            },
                            _wwHover: {
                                default: {
                                    width: { __wwtype: 'f', code: 'variables.hoverWidth' },
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });

        expect(run.result).toContain('width: calc(var(--ww-style-width) + 10px);');
        expect(variables).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: '--ww-style-width',
                    selector: '.ww-element-elementA',
                    state: 'base',
                    cssProperty: 'width',
                }),
                expect.objectContaining({
                    name: '--ww-style-width',
                    selector: '.ww-element-elementA:hover',
                    state: '_wwHover',
                    cssProperty: 'width',
                }),
            ])
        );
    });

    it('preserves static formula fallbacks inside stringified CSS expressions', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        capabilities: {
                            css({ style }) {
                                return [{ property: 'width', value: `calc(${style.width} + 10px)` }];
                            },
                        },
                        styles: {
                            base: {
                                default: {
                                    width: { __wwtype: 'f', code: 'variables.width' },
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
            resolveFormulaFallback() {
                return { status: 'resolved', value: 120 };
            },
        });

        expect(run.result).toContain('width: calc(var(--ww-style-width, 120px) + 10px);');
    });

    it('does not recursively compile object values returned by component CSS outputs', () => {
        const diagnostics: StyleDiagnostic[] = [];
        const stylesheet = createDiagnosticStringStyleSheetAdapter(diagnostics);
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        capabilities: {
                            css({ content }) {
                                return [{ property: '--theme-config', value: content.theme }];
                            },
                        },
                        content: {
                            base: {
                                default: {
                                    theme: { color: { __wwtype: 'f', code: 'variables.color' } },
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });

        expect(run.result).not.toContain('--theme-config');
        expect(run.result).not.toContain('[object Object]');
        expect(diagnostics).toEqual([
            expect.objectContaining({ code: 'css-value-fallback', property: '--theme-config' }),
        ]);
    });

    it('does not register dynamic sinks for declarations rejected by the stylesheet adapter', () => {
        const variables: StyleDynamicVariable[] = [];
        const stylesheet = createDynamicVariableStringStyleSheetAdapter(variables);
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        capabilities: {
                            css({ content }) {
                                return [{ property: 'bad;property', value: content.dynamicThing }];
                            },
                        },
                        content: {
                            base: {
                                default: {
                                    dynamicThing: { __wwtype: 'f', code: 'variables.value' },
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });

        expect(run.result).not.toContain('bad;property');
        expect(run.result).not.toContain('@property --ww-content-dynamic-thing');
        expect(variables).toEqual([]);
    });

    it('emits CSS variables for dynamic custom CSS values', () => {
        const variables: StyleDynamicVariable[] = [];
        const stylesheet = createDynamicVariableStringStyleSheetAdapter(variables);
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: {
                            base: {
                                default: {
                                    customCss: {
                                        '--card-width': { __wwtype: 'f', code: 'variables.width' },
                                    },
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });

        expect(run.result).toContain('@property --ww-style-card-width');
        expect(run.result).toContain('--card-width: var(--ww-style-card-width);');
        expect(variables).toEqual([
            expect.objectContaining({
                name: '--ww-style-card-width',
                property: 'customCss.--card-width',
                cssProperty: '--card-width',
                domain: 'style',
                state: 'base',
                breakpoint: 'default',
            }),
        ]);
    });

    it('cleans dynamic variable registrations with the target chunk that emitted them', () => {
        const variables = new Map<string, StyleDynamicVariable>();
        let cleanupCount = 0;
        const stylesheet = createDynamicVariableCleanupStyleSheetAdapter(variables, () => {
            cleanupCount++;
        });
        const manualRuntime = createManualStyleReactivityRuntime();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: {
                            base: {
                                default: {
                                    width: { __wwtype: 'f', code: 'variables.width' },
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
            runtime: manualRuntime.runtime,
        });

        expect(variables.size).toBe(1);

        manualRuntime.scopes[1].rerun();

        expect(cleanupCount).toBe(1);
        expect(variables.size).toBe(1);

        run.stop();

        expect(cleanupCount).toBe(2);
        expect(variables.size).toBe(0);
    });

    it('does not replace dynamic values with default declarations', () => {
        const variables: StyleDynamicVariable[] = [];
        const stylesheet = createDynamicVariableStringStyleSheetAdapter(variables);
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: {
                            base: {
                                default: {
                                    height: { __wwtype: 'f', code: 'variables.height' },
                                    padding: '12px',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });

        expect(run.result).toContain('padding: 12px;');
        expect(run.result).toContain('@property --ww-style-height');
        expect(run.result).toContain('height: var(--ww-style-height, auto);');
        expect(run.result).not.toContain('height: auto;');
        expect(variables).toEqual([
            expect.objectContaining({
                name: '--ww-style-height',
                property: 'height',
                cssProperty: 'height',
                domain: 'style',
                state: 'base',
                breakpoint: 'default',
                valueNormalizer: { type: 'falsy-fallback', fallbackValue: 'auto' },
            }),
        ]);
    });

    it('compiles generic style properties without component configuration', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: {
                            base: {
                                default: {
                                    padding: '24px',
                                    display: 'grid',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });

        expect(run.result).toContain('padding: 24px;');
        expect(run.result).toContain('display: grid;');
    });

    it('emits formula CSS variables with scoped selectors', () => {
        const variables: StyleDynamicVariable[] = [];
        const stylesheet = createDynamicVariableStringStyleSheetAdapter(variables);
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        selector: '.element-a.is-scoped',
                        styles: {
                            base: {
                                default: {
                                    width: { __wwtype: 'f', code: 'variables.width' },
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });

        expect(run.result).toContain('.element-a.is-scoped');
        expect(run.result).toContain('width: var(--ww-style-width);');
        expect(variables).toEqual([
            expect.objectContaining({
                name: '--ww-style-width',
                property: 'width',
                selector: '.element-a.is-scoped',
                domain: 'style',
            }),
        ]);
    });

    it('keeps static publication one-shot with the default static scope', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['elementA'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        styles: {
                            base: {
                                default: {
                                    width: '100px',
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
            runtime: STATIC_STYLE_RUNTIME,
        });

        expect(run.result).toContain('width: 100px;');
    });

    it('compiles library component root elements from the compile scope', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: [],
                sectionUids: [],
                libraryComponentIds: ['libraryA'],
            },
            reader: createReader({
                elements: {
                    rootElementA: {
                        uid: 'rootElementA',
                        styles: {
                            base: {
                                default: {
                                    width: '240px',
                                },
                            },
                        },
                    },
                },
                libraryComponents: {
                    libraryA: { rootElementUid: 'rootElementA' },
                },
            }),
            stylesheet,
            runtime: STATIC_STYLE_RUNTIME,
        });

        expect(run.result).toContain('.ww-element-rootElementA');
        expect(run.result).toContain('width: 240px;');
    });

    it('serializes active rules by insertion order', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const surface = createTestStyleSurface('elementA');
        const elementLayer = stylesheet.insertRule({
            kind: 'layer',
            key: 'element',
            name: STYLE_RULE_GROUP_LAYERS.element,
        });
        const firstRule = elementLayer.insertRule({
            kind: 'style',
            key: 'first',
            surface,
            selector: '.first',
        });
        const secondRule = elementLayer.insertRule({
            kind: 'style',
            key: 'second',
            surface,
            selector: '.second',
        });

        firstRule.style.setProperty('color', 'red', 'important');
        secondRule.style.setProperty('color', 'blue');

        expect(stylesheet.result().indexOf('.first')).toBeLessThan(stylesheet.result().indexOf('.second'));
        expect(stylesheet.result()).toContain('@layer ww-style-element');
        expect(stylesheet.result()).toContain('color: red !important;');

        firstRule.dispose();

        expect(stylesheet.result()).not.toContain('.first');
        expect(stylesheet.result()).toContain('.second');

        secondRule.dispose();

        expect(stylesheet.result()).toBe('');
    });

    it('serializes active groups in insertion order', () => {
        const stylesheet = createStringStyleSheetAdapter();
        const surface = createTestStyleSurface('elementA');
        const libraryLayer = stylesheet.insertRule({
            kind: 'layer',
            key: 'library',
            name: STYLE_RULE_GROUP_LAYERS.library,
        });
        const elementLayer = stylesheet.insertRule({
            kind: 'layer',
            key: 'element',
            name: STYLE_RULE_GROUP_LAYERS.element,
        });
        const elementRule = elementLayer.insertRule({
            kind: 'style',
            key: 'element',
            surface,
            selector: '.element',
        });
        const libraryRule = libraryLayer.insertRule({
            kind: 'style',
            key: 'library',
            surface,
            selector: '.library',
        });

        elementRule.style.setProperty('color', 'blue');
        libraryRule.style.setProperty('color', 'red');

        const css = stylesheet.result();

        expect(css).toContain('@layer ww-style-library');
        expect(css).toContain('@layer ww-style-element');
        expect(css.indexOf('.library')).toBeLessThan(css.indexOf('.element'));
    });

    it('splits selector lists without splitting nested selector commas', () => {
        expect(
            splitCssSelectorList(
                '.element-a:is(.is-active, .is-focused), [data-label=","][data-state="open"], .element-b'
            )
        ).toEqual(['.element-a:is(.is-active, .is-focused)', '[data-label=","][data-state="open"]', '.element-b']);
    });
});

type TestSourceData = {
    uid: string;
    baseId?: string;
    libraryComponentBaseId?: string;
    parentLibraryComponentId?: string;
    stateNames?: string[];
    states?: StyleStateDescriptor[];
    selector?: string;
    parentRef?: StyleParentRef;
    isDirectSectionChild?: boolean;
    capabilities?: StyleComponentCapabilities;
    emitDefaultDeclarations?: boolean;
    classIds?: Record<string, string[]>;
    subClassIds?: Record<string, Record<string, string[]>>;
    styles?: Record<string, Record<string, Record<string, unknown>>>;
    content?: Record<string, Record<string, Record<string, unknown>>>;
};

type TestClassData = TestSourceData & {
    subClasses?: Record<string, TestClassData>;
};

type ManualStyleScope = {
    runCount: number;
    stopCount: number;
    run<TResult>(callback: () => TResult): TResult | undefined;
    addEffect(effect: ManualStyleEffect): void;
    rerun(): void;
    stop(): void;
};

type ManualStyleEffect = {
    callback: (onDispose: StyleScopeDispose) => void;
    cleanups: Array<() => void>;
    stopped: boolean;
};

function createManualStyleReactivityRuntime() {
    const scopes: ManualStyleScope[] = [];
    const activeScopes: ManualStyleScope[] = [];
    const runtime: StyleReactivityRuntime = {
        createScope() {
            const scope = createManualStyleScope(activeScopes);
            scopes.push(scope);
            return scope;
        },
        effect(callback) {
            const activeScope = activeScopes[activeScopes.length - 1];
            const effect: ManualStyleEffect = {
                callback,
                cleanups: [],
                stopped: false,
            };

            activeScope?.addEffect(effect);
            runManualStyleEffect(activeScope, effect);

            return () => {
                stopManualStyleEffect(effect);
            };
        },
    };

    return { runtime, scopes };
}

function createManualStyleScope(activeScopes: ManualStyleScope[]): ManualStyleScope {
    const effects: ManualStyleEffect[] = [];
    let stopped = false;
    const scope: ManualStyleScope = {
        runCount: 0,
        stopCount: 0,
        run(callback) {
            if (stopped) return undefined;

            activeScopes.push(scope);
            try {
                return callback();
            } finally {
                removeManualActiveScope(activeScopes, scope);
            }
        },
        addEffect(effect) {
            if (stopped) {
                stopManualStyleEffect(effect);
                return;
            }

            effects.push(effect);
        },
        rerun() {
            if (stopped) return;

            for (const effect of effects) {
                runManualStyleEffect(scope, effect);
            }
        },
        stop() {
            if (stopped) return;

            stopped = true;
            scope.stopCount++;
            for (let index = effects.length - 1; index >= 0; index--) {
                stopManualStyleEffect(effects[index]);
            }
        },
    };

    return scope;
}

function runManualStyleEffect(scope: ManualStyleScope | undefined, effect: ManualStyleEffect) {
    if (effect.stopped) return;

    cleanupScope(effect.cleanups);
    if (scope) {
        scope.runCount++;
    }
    effect.callback(cleanup => {
        effect.cleanups.push(cleanup);
    });
}

function stopManualStyleEffect(effect: ManualStyleEffect) {
    if (effect.stopped) return;

    effect.stopped = true;
    cleanupScope(effect.cleanups);
}

function cleanupScope(cleanups: Array<() => void>) {
    for (let index = cleanups.length - 1; index >= 0; index--) {
        cleanups[index]();
    }
    cleanups.length = 0;
}

function removeManualActiveScope(activeScopes: ManualStyleScope[], scope: ManualStyleScope) {
    for (let index = activeScopes.length - 1; index >= 0; index--) {
        if (activeScopes[index] !== scope) continue;

        activeScopes.splice(index, 1);
        return;
    }
}

function createVueStyleCompilerTestRuntime(): StyleReactivityRuntime {
    return {
        createScope() {
            return effectScope();
        },
        effect: watchEffect,
    };
}

function createWidthElement(uid: string, width: string): TestSourceData {
    return {
        uid,
        styles: {
            base: {
                default: {
                    width,
                },
            },
        },
    };
}

function expectTargetChunkOrder(css: string, uid: string) {
    const baseIndex = css.indexOf(`.ww-element-${uid} {`);
    const tabletIndex = css.indexOf('@media (max-width: 991px)', baseIndex);
    const hoverIndex = css.indexOf(`.ww-element-${uid}:hover {`);

    expect(baseIndex).toBeGreaterThanOrEqual(0);
    expect(tabletIndex).toBeGreaterThan(baseIndex);
    expect(hoverIndex).toBeGreaterThan(tabletIndex);
}

function createReader({
    elements = {},
    sections = {},
    libraryComponents = {},
    classes = {},
}: {
    elements?: Record<string, TestSourceData>;
    sections?: Record<string, TestSourceData>;
    libraryComponents?: Record<string, { rootElementUid?: string; childLibraryComponentIds?: readonly string[] }>;
    classes?: Record<string, TestClassData>;
}): StyleReader {
    return {
        element(uid) {
            const data = elements[uid];
            return data ? createElementReader(data) : null;
        },
        section(uid) {
            const data = sections[uid];
            return data ? createSectionReader(data) : null;
        },
        libraryComponent(id) {
            const data = libraryComponents[id];
            return data
                ? {
                      rootElementUid: () => data.rootElementUid,
                      childLibraryComponentIds: () => data.childLibraryComponentIds || [],
                  }
                : null;
        },
        styleClass(id) {
            const data = classes[id];
            return data ? createClassReader(data) : null;
        },
    };
}

function createElementReader(data: TestSourceData): StyleElementReader {
    return {
        ...createSourceReader(data),
        kind: () => 'element',
        isLibraryComponentInstance: () => !!data.libraryComponentBaseId,
        isDirectSectionChild: () => data.isDirectSectionChild ?? false,
    };
}

function createSectionReader(data: TestSourceData): StyleSectionReader {
    return {
        ...createSourceReader(data),
        kind: () => 'section',
    };
}

function createSourceReader(data: TestSourceData) {
    return {
        uid: () => data.uid,
        baseId: () => data.baseId,
        capabilities: () => data.capabilities || {},
        states: () => data.states || (data.stateNames || inferStateNames(data)).map(id => ({ id })),
        emitDefaultDeclarations: () => data.emitDefaultDeclarations ?? true,
        parentRef: () => data.parentRef,
        selector: () => data.selector,
        style: () => createPropertyTreeReader(data, 'styles'),
        content: () => createPropertyTreeReader(data, 'content'),
    };
}

function createClassReader(data: TestClassData): StyleClassReader {
    return {
        style: () => createPropertyTreeReader(data, 'styles'),
        content: () => createPropertyTreeReader(data, 'content'),
        subClass(id) {
            const subClassData = data.subClasses?.[id];
            return subClassData ? createClassReader(subClassData) : null;
        },
    };
}

function createPropertyTreeReader(data: TestSourceData, domain: 'styles' | 'content') {
    return {
        state: (name: string) => createStateReader(data, domain, name),
    };
}

function createStateReader(data: TestSourceData, domain: 'styles' | 'content', state: string): StyleStateReader {
    return {
        classIds: () => data.classIds?.[state] || [],
        subClassIds: classId => data.subClassIds?.[state]?.[classId] || [],
        breakpoint: breakpoint => createBreakpointReader(data[domain]?.[state]?.[breakpoint] || {}),
    };
}

function createBreakpointReader(style: Record<string, unknown>): StyleBreakpointPropertyReader {
    return {
        property: name => style[name],
        customCss: () => style.customCss,
        customCssProperty(name) {
            const customCss = style.customCss;
            if (!customCss || typeof customCss !== 'object' || Array.isArray(customCss)) return undefined;
            return (customCss as Record<string, unknown>)[name];
        },
        customCssEntries() {
            const customCss = style.customCss;
            if (!customCss || typeof customCss !== 'object' || Array.isArray(customCss) || '__wwtype' in customCss) {
                return [];
            }

            return Object.entries(customCss as Record<string, unknown>);
        },
    };
}

function inferStateNames(data: TestSourceData) {
    return [...new Set([...Object.keys(data.styles || {}), ...Object.keys(data.content || {})])].filter(
        state => state !== 'base'
    );
}

function createDiagnosticStringStyleSheetAdapter(diagnostics: StyleDiagnostic[]) {
    const stylesheet = createStringStyleSheetAdapter();
    return {
        ...stylesheet,
        diagnostic(diagnostic: StyleDiagnostic) {
            diagnostics.push(diagnostic);
        },
    };
}

function createDynamicVariableStringStyleSheetAdapter(variables: StyleDynamicVariable[]) {
    const stylesheet = createStringStyleSheetAdapter();
    return {
        ...stylesheet,
        dynamicVariable(variable: StyleDynamicVariable) {
            variables.push(variable);
        },
    };
}

function createDynamicVariableCleanupStyleSheetAdapter(
    variables: Map<string, StyleDynamicVariable>,
    onCleanup: () => void
) {
    const stylesheet = createStringStyleSheetAdapter();
    return {
        ...stylesheet,
        dynamicVariable(variable: StyleDynamicVariable) {
            variables.set(variable.name, variable);
            return () => {
                onCleanup();
                variables.delete(variable.name);
            };
        },
    };
}

function createTestStyleSurface(uid: string): StyleSurface {
    return {
        key: `element:${uid}`,
        group: 'element',
        kind: 'element',
        selector: `.ww-element-${uid}`,
    };
}
