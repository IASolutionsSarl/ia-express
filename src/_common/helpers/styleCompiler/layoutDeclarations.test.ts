import { describe, expect, it } from 'vitest';
import { resolveStyleCompilerRuntimeVariable } from '@/_front/services/styleCompilerRuntimeVariableResolver';

import {
    createStringStyleSheetAdapter,
    createStyleCompiler,
    STATIC_STYLE_RUNTIME,
    type StyleDynamicVariable,
} from './index';
import {
    createDynamicVariableStringStyleSheetAdapter,
    createReader,
    type TestSourceData,
} from './styleCompiler.testUtils';

describe('styleCompiler layout compatibility', () => {
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
            [
                ...run.result.matchAll(
                    /:where\(\.ww-element-elementA \[data-ww-layout-style-scopes~="elementA"\]\)\s*\{[^}]*\}/g
                ),
            ]
                .map(match => match[0])
                .find(rule => rule.includes('height: 100%;')) || '';
        const blockHeightRule =
            run.result
                .slice(run.result.indexOf('@layer ww-style-layout-override'))
                .match(/[^{}]*height: 100%;[^}]*\}/)?.[0] || '';
        const tabletCss = run.result.slice(run.result.indexOf('@media (max-width: 991px)'));

        expect(rootRule).toContain('height: 240px;');
        expect(layoutRule).toContain('display: block;');
        expect(layoutRule).not.toContain('height: 100%;');
        expect(internalLayoutRule).toContain('height: 100%;');
        expect(blockHeightRule).not.toContain(':where(.ww-element-elementA.ww-layout)');
        expect(run.result.indexOf(internalLayoutRule)).toBeGreaterThan(
            run.result.indexOf('@layer ww-style-layout-override')
        );
        expect(tabletCss).toContain('height: 120px;');
    });

    it('applies block text alignment to root and internal layout surfaces', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['elementA'], sectionUids: [], libraryComponentIds: [] },
            reader: createReader({
                elements: {
                    elementA: {
                        uid: 'elementA',
                        capabilities: { inherits: ['ww-layout'], displayAllowedValues: ['block'] },
                        styles: { base: { default: { display: 'block', textAlign: 'center' } } },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const overrideCss = run.result.slice(run.result.indexOf('@layer ww-style-layout-override'));
        const textAlignRuleStart = overrideCss.indexOf(':where(.ww-element-elementA.ww-layout)');
        const textAlignRule = overrideCss.slice(textAlignRuleStart, overrideCss.indexOf('}', textAlignRuleStart) + 1);

        expect(textAlignRuleStart).toBeGreaterThanOrEqual(0);
        expect(textAlignRule).toContain(':where(.ww-element-elementA.ww-layout)');
        expect(textAlignRule).toContain(':where(.ww-element-elementA [data-ww-layout-style-scopes~="elementA"])');
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
        // The single-item selector is separate from the first/last multiple-item selectors.
        expect(run.result.match(/margin-left: auto;/g)).toHaveLength(2);
        expect(run.result.match(/margin-top: auto;/g)).toHaveLength(4);
        expect(run.result).toContain('> :nth-child(1 of .ww-element[data-ww-layout-item])');
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

    it('preserves formula-bound boolean wwLayout values as valid CSS', () => {
        const variables: StyleDynamicVariable[] = [];
        const stylesheet = createDynamicVariableStringStyleSheetAdapter(variables);
        const formula = (code: string) => ({ __wwtype: 'f', code });
        const wrapFormula = formula('variables.wrap');
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['wrap', 'reverse', 'pushLast', 'combined'],
                sectionUids: [],
                libraryComponentIds: [],
            },
            reader: createReader({
                elements: {
                    wrap: {
                        uid: 'wrap',
                        capabilities: { inherits: ['ww-layout'] },
                        styles: { base: { default: { display: 'flex' } } },
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_flexDirection': 'row',
                                    '_ww-layout_flexWrap': wrapFormula,
                                },
                            },
                        },
                    },
                    reverse: {
                        uid: 'reverse',
                        capabilities: { inherits: ['ww-layout'] },
                        styles: { base: { default: { display: 'flex' } } },
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_flexDirection': 'row',
                                    '_ww-layout_reverse': formula('variables.reverse'),
                                },
                            },
                        },
                    },
                    pushLast: {
                        uid: 'pushLast',
                        capabilities: { inherits: ['ww-layout'] },
                        styles: { base: { default: { display: 'flex' } } },
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_flexDirection': 'row',
                                    '_ww-layout_pushLast': formula('variables.pushLast'),
                                },
                            },
                        },
                    },
                    combined: {
                        uid: 'combined',
                        capabilities: { inherits: ['ww-layout'] },
                        styles: { base: { default: { display: 'flex' } } },
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_flexDirection': formula('variables.direction'),
                                    '_ww-layout_flexWrap': formula('variables.wrap'),
                                    '_ww-layout_reverse': formula('variables.reverse'),
                                    '_ww-layout_pushLast': formula('variables.pushLast'),
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet,
        });

        const resolveWrapValues = (value: unknown) =>
            variables
                .filter(variable => variable.sourceUid === 'wrap' && variable.cssProperty === 'flex-wrap')
                .map(variable =>
                    resolveStyleCompilerRuntimeVariable({
                        variable,
                        context: {},
                        executor: {
                            execute(input: unknown) {
                                return {
                                    status: 'resolved' as const,
                                    value: input === wrapFormula ? value : input,
                                };
                            },
                        },
                    })
                )
                .filter(Boolean);
        expect(resolveWrapValues(1)).toContain('wrap');
        expect(resolveWrapValues(0)).toEqual([]);

        expect(run.result).toMatch(/\.ww-element-reverse\.ww-layout[^}]*flex-direction: var\(/);
        expect(run.result).toContain('flex-direction: var(--ww-content-ww-layout-flex-direction-row-reverse, row);');
        expect(variables).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    sourceUid: 'reverse',
                    cssProperty: 'flex-direction',
                    condition: expect.arrayContaining([expect.objectContaining({ truthy: true })]),
                }),
            ])
        );

        expect(run.result).toContain(
            ':where(.ww-element-pushLast.ww-layout) > :nth-last-child(1 of .ww-element[data-ww-layout-item])'
        );
        expect(run.result).toMatch(
            /nth-last-child\(1 of \.ww-element\[data-ww-layout-item\]\)[^{]*\{[^}]*margin-left: var\(/
        );
        expect(variables).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    sourceUid: 'pushLast',
                    cssProperty: 'margin-left',
                    condition: expect.arrayContaining([expect.objectContaining({ truthy: true })]),
                }),
            ])
        );

        const combinedVariables = variables.filter(variable => variable.sourceUid === 'combined');
        expect(run.result).toContain(
            ':where(.ww-element-combined.ww-layout) > :nth-child(1 of .ww-element[data-ww-layout-item])'
        );
        expect(run.result).toContain(
            ':where(.ww-element-combined.ww-layout) > :nth-last-child(1 of .ww-element[data-ww-layout-item])'
        );
        expect(new Set(combinedVariables.map(variable => variable.cssProperty))).toEqual(
            new Set(['align-content', 'flex-direction', 'flex-wrap', 'margin-left', 'margin-top'])
        );
        expect(run.result).toContain('margin-left: var(--ww-content-ww-layout-push-last-last-row-auto, revert-layer);');
        expect(
            combinedVariables
                .filter(variable => variable.property === '_ww-layout_flexDirection')
                .map(({ outputKey }) => outputKey)
        ).toEqual(expect.arrayContaining(['row-forward', 'row-reverse', 'column-forward', 'column-reverse']));
        expect(
            combinedVariables
                .filter(variable => variable.property === '_ww-layout_pushLast')
                .map(({ outputKey }) => outputKey)
        ).toEqual(
            expect.arrayContaining([
                'last-row-auto',
                'first-row-auto',
                'single-row-auto',
                'last-column-auto',
                'first-column-auto',
                'single-column-auto',
            ])
        );

        const conditions = variables.flatMap(variable =>
            Array.isArray(variable.condition) ? variable.condition : variable.condition ? [variable.condition] : []
        );
        expect(conditions.filter(condition => 'truthy' in condition && condition.truthy !== true)).toEqual([]);
    });

    it('activates exactly one push-last position for truthy and falsy bound reverse values', () => {
        const variables: StyleDynamicVariable[] = [];
        const reverse = { __wwtype: 'f', code: 'reverse' };
        const pushLast = { __wwtype: 'f', code: 'pushLast' };
        createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['layout'], sectionUids: [], libraryComponentIds: [] },
            reader: createReader({
                elements: {
                    layout: {
                        uid: 'layout',
                        capabilities: { inherits: ['ww-layout'] },
                        styles: { base: { default: { display: 'flex' } } },
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_flexDirection': 'row',
                                    '_ww-layout_reverse': reverse,
                                    '_ww-layout_pushLast': pushLast,
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createDynamicVariableStringStyleSheetAdapter(variables),
        });

        const resolvePushLastOutputKeys = (resolvedPushLast: unknown, resolvedReverse: unknown) => {
            const executor = {
                execute(value: unknown) {
                    if (value === pushLast) return { status: 'resolved' as const, value: resolvedPushLast };
                    if (value === reverse) return { status: 'resolved' as const, value: resolvedReverse };
                    return { status: 'resolved' as const, value };
                },
            };

            return variables
                .filter(
                    variable => variable.property === '_ww-layout_pushLast' && variable.cssProperty === 'margin-left'
                )
                .flatMap(variable => {
                    const value = resolveStyleCompilerRuntimeVariable({ variable, context: {}, executor });
                    expect(value).not.toBe('revert-layer');
                    return value == null ? [] : [variable.outputKey];
                });
        };

        for (const truthyReverse of [true, 1, 'yes', []]) {
            expect(resolvePushLastOutputKeys(1, truthyReverse)).toEqual(
                expect.arrayContaining(['first-row-auto', 'single-row-auto'])
            );
            expect(resolvePushLastOutputKeys(1, truthyReverse)).not.toContain('last-row-auto');
        }
        for (const falsyReverse of [false, 0, '', null, undefined]) {
            expect(resolvePushLastOutputKeys(1, falsyReverse)).toEqual(
                expect.arrayContaining(['last-row-auto', 'single-row-auto'])
            );
            expect(resolvePushLastOutputKeys(1, falsyReverse)).not.toContain('first-row-auto');
        }
        for (const falsyPushLast of [false, 0, '', null, undefined]) {
            expect(resolvePushLastOutputKeys(falsyPushLast, false)).toEqual([]);
        }
    });

    it('preserves the legacy horizontal branch for bound directions other than column', () => {
        const variables: StyleDynamicVariable[] = [];
        const direction = { __wwtype: 'f', code: 'direction' };
        const reverse = { __wwtype: 'f', code: 'reverse' };
        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['layout'], sectionUids: [], libraryComponentIds: [] },
            reader: createReader({
                elements: {
                    layout: {
                        uid: 'layout',
                        capabilities: { inherits: ['ww-layout'] },
                        styles: { base: { default: { display: 'flex' } } },
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_flexDirection': direction,
                                    '_ww-layout_flexWrap': true,
                                    '_ww-layout_reverse': reverse,
                                    '_ww-layout_pushLast': true,
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createDynamicVariableStringStyleSheetAdapter(variables),
        });
        expect(run.result).toContain('flex-direction: var(');
        for (const [resolvedDirection, resolvedReverse] of [
            ['row-reverse', false],
            ['column-reverse', true],
        ] as const) {
            const executor = {
                execute(value: unknown) {
                    if (value === direction) return { status: 'resolved' as const, value: resolvedDirection };
                    if (value === reverse) return { status: 'resolved' as const, value: resolvedReverse };
                    return { status: 'resolved' as const, value };
                },
            };
            const resolvedValues = (cssProperty: string) =>
                variables
                    .filter(variable => variable.cssProperty === cssProperty)
                    .map(variable => resolveStyleCompilerRuntimeVariable({ variable, context: {}, executor }))
                    .filter(Boolean);

            expect(resolvedValues('flex-direction')).toContain(resolvedDirection);
            expect(resolvedValues('flex-wrap')).toContain('wrap');
            expect(resolvedValues('margin-left')).toContain('auto');
            expect(resolvedValues('margin-top')).not.toContain('auto');
        }

        const exclusionConditions = variables
            .flatMap(variable =>
                Array.isArray(variable.condition) ? variable.condition : variable.condition ? [variable.condition] : []
            )
            .filter(condition => 'disallowedValues' in condition);
        expect(exclusionConditions.length).toBeGreaterThan(0);
        expect(exclusionConditions.every(condition => condition.allowedValues?.length)).toBe(true);
    });

    it('clears every inherited push-last branch when a state disables it', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['layout'], sectionUids: [], libraryComponentIds: [] },
            reader: createReader({
                elements: {
                    layout: {
                        uid: 'layout',
                        capabilities: { inherits: ['ww-layout'] },
                        states: [{ id: 'active', label: 'Active' }],
                        styles: { base: { default: { display: 'flex' } } },
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_flexDirection': { __wwtype: 'f', code: 'direction' },
                                    '_ww-layout_reverse': { __wwtype: 'f', code: 'reverse' },
                                    '_ww-layout_pushLast': true,
                                },
                            },
                            active: { default: { '_ww-layout_pushLast': false } },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const stateRules =
            run.result
                .match(/[^{}]*data-ww-states~="active"[^{}]*\{[^}]*\}/g)
                ?.filter(rule => rule.includes(':nth-'))
                .join('\n') || '';
        expect(stateRules).toContain(':nth-child(1 of .ww-element[data-ww-layout-item])');
        expect(stateRules).toContain(':nth-last-child(1 of .ww-element[data-ww-layout-item])');
        expect(stateRules).toContain(':not(:nth-last-child(1 of .ww-element[data-ww-layout-item]))');
        expect(stateRules).toContain(':not(:nth-child(1 of .ww-element[data-ww-layout-item]))');
        expect(stateRules).toContain(
            ':nth-child(1 of .ww-element[data-ww-layout-item]):nth-last-child(1 of .ww-element[data-ww-layout-item])'
        );
        expect(stateRules).toContain('margin-left: revert-layer;');
        expect(stateRules).toContain('margin-top: revert-layer;');
    });

    it('clears obsolete push-last position and axis branches when a state changes layout', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['layout'], sectionUids: [], libraryComponentIds: [] },
            reader: createReader({
                elements: {
                    layout: {
                        uid: 'layout',
                        capabilities: { inherits: ['ww-layout'] },
                        states: [{ id: 'active', label: 'Active' }],
                        styles: { base: { default: { display: 'flex' } } },
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_flexDirection': 'row',
                                    '_ww-layout_reverse': false,
                                    '_ww-layout_pushLast': true,
                                },
                            },
                            active: {
                                default: {
                                    '_ww-layout_flexDirection': 'column',
                                    '_ww-layout_reverse': true,
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const stateRules =
            run.result
                .match(/[^{}]*data-ww-states~="active"[^{}]*\{[^}]*\}/g)
                ?.filter(rule => rule.includes(':nth-'))
                .join('\n') || '';
        const itemSelector = '.ww-element[data-ww-layout-item]';

        expect(stateRules).toContain(`:nth-child(1 of ${itemSelector}):not(:nth-last-child(1 of ${itemSelector}))`);
        expect(stateRules).toContain(`:nth-last-child(1 of ${itemSelector}):not(:nth-child(1 of ${itemSelector}))`);
        expect(stateRules).toContain(`:nth-child(1 of ${itemSelector}):nth-last-child(1 of ${itemSelector})`);
        expect(stateRules).toContain('margin-top: auto;');
        expect(stateRules).toContain('margin-left: revert-layer;');
        expect(stateRules).toContain('margin-top: revert-layer;');
    });

    it('keeps concrete-root layout content when a library instance stores a sparse content override', () => {
        const definition: TestSourceData = {
            uid: 'definitionRoot',
            capabilities: { inherits: ['ww-layout'] },
            styles: { base: { default: { display: 'flex' } } },
            content: {
                base: {
                    default: {
                        '_ww-layout_flexDirection': 'row',
                        '_ww-layout_pushLast': true,
                    },
                },
            },
        };
        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['instance'], sectionUids: [], libraryComponentIds: [] },
            reader: createReader({
                elements: {
                    instance: {
                        uid: 'instance',
                        libraryComponentBaseId: 'component',
                        capabilities: { inherits: ['ww-layout'], displayAllowedValues: ['flex'] },
                        emitDefaultDeclarations: false,
                        styles: { base: { default: { display: true } } },
                        effectiveFallback: definition,
                        content: { base: { default: { '_ww-layout_reverse': true } } },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
            runtime: STATIC_STYLE_RUNTIME,
        });
        const instanceCss = run.result.slice(run.result.indexOf('.ww-element-instance'));
        const itemSelector = '.ww-element[data-ww-layout-item]';

        expect(instanceCss).not.toContain('flex-direction: row-reverse;');
        expect(instanceCss).toContain('flex-direction: row;');
        expect(instanceCss).toContain(`:nth-last-child(1 of ${itemSelector}):not(:nth-child(1 of ${itemSelector}))`);
        expect(instanceCss).toContain('margin-left: auto;');
    });

    it('recomposes concrete-root layout states after a library instance display override', () => {
        const definition: TestSourceData = {
            uid: 'definitionRoot',
            capabilities: { inherits: ['ww-layout'], displayAllowedValues: ['flex'] },
            states: [{ id: 'active', label: 'Active' }],
            styles: { base: { default: { display: 'flex' } } },
            content: {
                base: {
                    default: {
                        '_ww-layout_flexDirection': 'row',
                        '_ww-layout_pushLast': true,
                    },
                },
                active: {
                    default: {
                        '_ww-layout_flexDirection': 'column',
                        '_ww-layout_pushLast': false,
                    },
                },
            },
        };
        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['instance'], sectionUids: [], libraryComponentIds: ['component'] },
            reader: createReader({
                elements: {
                    definitionRoot: definition,
                    instance: {
                        uid: 'instance',
                        libraryComponentBaseId: 'component',
                        capabilities: { inherits: ['ww-layout'], displayAllowedValues: ['flex'] },
                        emitDefaultDeclarations: false,
                        styles: { base: { default: { display: true } } },
                        effectiveFallback: definition,
                    },
                },
                libraryComponents: { component: { rootElementUid: 'definitionRoot' } },
            }),
            stylesheet: createStringStyleSheetAdapter(),
            runtime: STATIC_STYLE_RUNTIME,
        });
        const stateSelector = '.ww-element-instance.ww-layout[data-ww-states~="active"]';
        const stateRuleStart = run.result.indexOf(stateSelector);
        const stateRule = run.result.slice(stateRuleStart, run.result.indexOf('}', stateRuleStart) + 1);
        const statePushRules =
            run.result
                .match(/[^{}]*ww-element-instance[^{}]*data-ww-states~="active"[^{}]*\{[^}]*\}/g)
                ?.filter(rule => rule.includes(':nth-')) || [];
        expect(stateRuleStart).toBeGreaterThanOrEqual(0);
        expect(stateRule).toContain('flex-direction: column;');
        expect(statePushRules.length).toBeGreaterThan(0);
        expect(statePushRules.every(rule => rule.includes('margin-left: revert-layer;'))).toBe(true);
        expect(statePushRules.every(rule => rule.includes('margin-top: revert-layer;'))).toBe(true);
    });

    it('does not duplicate concrete-root push-last rules on an instance without a display override', () => {
        const definition: TestSourceData = {
            uid: 'definitionRoot',
            capabilities: { inherits: ['ww-layout'], displayAllowedValues: ['flex'] },
            styles: { base: { default: { display: 'flex' } } },
            content: {
                base: {
                    default: {
                        '_ww-layout_flexDirection': 'row',
                        '_ww-layout_pushLast': true,
                    },
                },
            },
        };
        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['instance'], sectionUids: [], libraryComponentIds: ['component'] },
            reader: createReader({
                elements: {
                    definitionRoot: definition,
                    instance: {
                        uid: 'instance',
                        libraryComponentBaseId: 'component',
                        capabilities: { inherits: ['ww-layout'], displayAllowedValues: ['flex'] },
                        emitDefaultDeclarations: false,
                        effectiveFallback: definition,
                    },
                },
                libraryComponents: { component: { rootElementUid: 'definitionRoot' } },
            }),
            stylesheet: createStringStyleSheetAdapter(),
            runtime: STATIC_STYLE_RUNTIME,
        });
        const overrideCss = run.result.slice(run.result.indexOf('@layer ww-style-layout-override'));
        const instancePushRules =
            overrideCss.match(/[^{}]*ww-element-instance[^{}]*\{[^}]*margin-(?:left|top):[^}]*\}/g) || [];

        expect(instancePushRules).toEqual([]);
    });

    it('recomposes concrete-root responsive layout content after a library instance display override', () => {
        const definition: TestSourceData = {
            uid: 'definitionRoot',
            capabilities: { inherits: ['ww-layout'], displayAllowedValues: ['flex'] },
            styles: { base: { default: { display: 'flex' } } },
            content: {
                base: {
                    default: {
                        '_ww-layout_flexDirection': 'row',
                        '_ww-layout_flexWrap': false,
                        '_ww-layout_reverse': false,
                    },
                    tablet: {
                        '_ww-layout_flexDirection': 'column',
                        '_ww-layout_flexWrap': true,
                        '_ww-layout_reverse': true,
                    },
                },
            },
        };
        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['instance'], sectionUids: [], libraryComponentIds: ['component'] },
            reader: createReader({
                elements: {
                    definitionRoot: definition,
                    instance: {
                        uid: 'instance',
                        libraryComponentBaseId: 'component',
                        capabilities: { inherits: ['ww-layout'], displayAllowedValues: ['flex'] },
                        emitDefaultDeclarations: false,
                        styles: { base: { default: { display: true } } },
                        effectiveFallback: definition,
                    },
                },
                libraryComponents: { component: { rootElementUid: 'definitionRoot' } },
            }),
            stylesheet: createStringStyleSheetAdapter(),
            runtime: STATIC_STYLE_RUNTIME,
        });
        const instanceLayoutRules =
            run.result
                .match(/[^{}]*ww-element-instance\.ww-layout[^{}]*\{[^}]*\}/g)
                ?.filter(rule => rule.includes('flex-direction')) || [];

        expect(instanceLayoutRules).toEqual(
            expect.arrayContaining([
                expect.stringContaining('flex-direction: row;'),
                expect.stringContaining('flex-direction: column-reverse;'),
            ])
        );
        expect(instanceLayoutRules.some(rule => rule.includes('flex-wrap: nowrap;'))).toBe(true);
    });

    it('clears concrete-root push-last when an instance state leaves the flex family', () => {
        const definition: TestSourceData = {
            uid: 'definitionRoot',
            capabilities: { inherits: ['ww-layout'], displayAllowedValues: ['flex', 'grid'] },
            states: [{ id: 'active', label: 'Active' }],
            styles: { base: { default: { display: 'flex' } } },
            content: {
                base: {
                    default: {
                        '_ww-layout_flexDirection': 'row',
                        '_ww-layout_pushLast': true,
                    },
                },
                active: { default: { '_ww-layout_pushLast': false } },
            },
        };
        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['instance'], sectionUids: [], libraryComponentIds: ['component'] },
            reader: createReader({
                elements: {
                    definitionRoot: definition,
                    instance: {
                        uid: 'instance',
                        libraryComponentBaseId: 'component',
                        capabilities: { inherits: ['ww-layout'], displayAllowedValues: ['flex', 'grid'] },
                        states: [{ id: 'active', label: 'Active' }],
                        emitDefaultDeclarations: false,
                        styles: {
                            base: { default: { display: 'flex' } },
                            active: { default: { display: 'grid' } },
                        },
                        effectiveFallback: definition,
                    },
                },
                libraryComponents: { component: { rootElementUid: 'definitionRoot' } },
            }),
            stylesheet: createStringStyleSheetAdapter(),
            runtime: STATIC_STYLE_RUNTIME,
        });
        const statePushRules =
            run.result
                .match(/[^{}]*ww-element-instance[^{}]*data-ww-states~="active"[^{}]*\{[^}]*\}/g)
                ?.filter(rule => rule.includes(':nth-')) || [];

        // Three target positions, each carrying both axes, repeated for all three breakpoint ranges.
        expect(statePushRules).toHaveLength(9);
        expect(statePushRules.every(rule => rule.includes('margin-left: revert-layer;'))).toBe(true);
        expect(statePushRules.every(rule => rule.includes('margin-top: revert-layer;'))).toBe(true);
    });

    it('keeps inherited block layout declarations in every responsive range', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['layout'], sectionUids: [], libraryComponentIds: [] },
            reader: createReader({
                elements: {
                    layout: {
                        uid: 'layout',
                        capabilities: { inherits: ['ww-layout'], displayAllowedValues: ['block'] },
                        styles: { base: { default: { display: 'block', textAlign: 'center' } } },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
            runtime: STATIC_STYLE_RUNTIME,
        });
        const overrideCss = run.result.slice(run.result.indexOf('@layer ww-style-layout-override'));
        const blockHeightRules =
            overrideCss
                .match(/[^{}]*ww-element-layout[^{}]*\{[^}]*\}/g)
                ?.filter(rule => rule.includes('height: 100%;')) || [];
        const blockTextAlignRules =
            overrideCss
                .match(/[^{}]*ww-element-layout[^{}]*\{[^}]*\}/g)
                ?.filter(rule => rule.includes('text-align: center;')) || [];

        expect(blockHeightRules).toHaveLength(3);
        expect(blockTextAlignRules).toHaveLength(3);
    });

    it.each(['flex', 'grid', 'table'])('does not emit block-only cleanup for a %s-only layout', display => {
        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['layout'], sectionUids: [], libraryComponentIds: [] },
            reader: createReader({
                elements: {
                    layout: {
                        uid: 'layout',
                        capabilities: { inherits: ['ww-layout'], displayAllowedValues: [display] },
                        styles: { base: { default: { display } } },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
            runtime: STATIC_STYLE_RUNTIME,
        });
        const overrideCss = run.result.slice(run.result.indexOf('@layer ww-style-layout-override'));
        const blockCleanupRules =
            overrideCss
                .match(/[^{}]*ww-element-layout[^{}]*\{[^}]*\}/g)
                ?.filter(
                    rule => rule.includes('height: revert-layer;') || rule.includes('text-align: revert-layer;')
                ) || [];

        expect(blockCleanupRules).toHaveLength(0);
    });

    it('clears block-only layout declarations when states and breakpoints leave the block family', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['layout'], sectionUids: [], libraryComponentIds: [] },
            reader: createReader({
                elements: {
                    layout: {
                        uid: 'layout',
                        capabilities: {
                            inherits: ['ww-layout'],
                            displayAllowedValues: ['block', 'flex', 'grid'],
                        },
                        states: [{ id: 'active', label: 'Active' }],
                        styles: {
                            base: {
                                default: { display: 'block', textAlign: 'center' },
                                tablet: { display: 'grid' },
                            },
                            active: { default: { display: 'flex' } },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
            runtime: STATIC_STYLE_RUNTIME,
        });
        const overrideCss = run.result.slice(run.result.indexOf('@layer ww-style-layout-override'));
        const baseHeightRule = overrideCss.match(/[^{}]*ww-element-layout[^{}]*\{[^}]*height: 100%;[^}]*\}/)?.[0] || '';
        const baseTextAlignRule =
            overrideCss.match(/[^{}]*ww-element-layout[^{}]*\{[^}]*text-align: center;[^}]*\}/)?.[0] || '';
        const responsiveHeightRules =
            overrideCss
                .match(/[^{}]*ww-element-layout[^{}]*\{[^}]*\}/g)
                ?.filter(rule => rule.includes('height: revert-layer;') && !rule.includes('data-ww-states')) || [];
        const responsiveTextAlignRules =
            overrideCss
                .match(/[^{}]*ww-element-layout[^{}]*\{[^}]*\}/g)
                ?.filter(rule => rule.includes('text-align: revert-layer;') && !rule.includes('data-ww-states')) || [];
        const stateHeightRules =
            overrideCss
                .match(/[^{}]*ww-element-layout[^{}]*data-ww-states~="active"[^{}]*\{[^}]*\}/g)
                ?.filter(rule => rule.includes('height: revert-layer;')) || [];
        const stateTextAlignRules =
            overrideCss
                .match(/[^{}]*ww-element-layout[^{}]*data-ww-states~="active"[^{}]*\{[^}]*\}/g)
                ?.filter(rule => rule.includes('text-align: revert-layer;')) || [];

        expect(baseHeightRule).toContain('height: 100%;');
        expect(baseTextAlignRule).toContain('text-align: center;');
        expect(responsiveHeightRules).toHaveLength(2);
        expect(responsiveTextAlignRules).toHaveLength(2);
        expect(stateHeightRules).toHaveLength(3);
        expect(stateTextAlignRules).toHaveLength(3);
    });

    it.each([false, null, '', 0])('clears inherited block text alignment for %j', textAlign => {
        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['layout'], sectionUids: [], libraryComponentIds: [] },
            reader: createReader({
                elements: {
                    layout: {
                        uid: 'layout',
                        capabilities: { inherits: ['ww-layout'], displayAllowedValues: ['block'] },
                        states: [{ id: 'active', label: 'Active' }],
                        styles: {
                            base: { default: { display: 'block', textAlign: 'center' } },
                            active: { default: { textAlign } },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
            runtime: STATIC_STYLE_RUNTIME,
        });
        const overrideCss = run.result.slice(run.result.indexOf('@layer ww-style-layout-override'));
        const stateTextAlignRule =
            overrideCss
                .match(/[^{}]*ww-element-layout[^{}]*data-ww-states~="active"[^{}]*\{[^}]*\}/g)
                ?.find(rule => rule.includes('text-align: revert-layer;')) || '';

        expect(stateTextAlignRule).toContain('text-align: revert-layer;');
    });

    it('clears concrete-root block layout declarations from a higher instance layer', () => {
        const definition: TestSourceData = {
            uid: 'definitionRoot',
            capabilities: { inherits: ['ww-layout'], displayAllowedValues: ['block', 'flex'] },
            styles: { base: { default: { display: 'block', textAlign: 'center' } } },
        };
        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['instance'], sectionUids: [], libraryComponentIds: ['component'] },
            reader: createReader({
                elements: {
                    definitionRoot: definition,
                    instance: {
                        uid: 'instance',
                        libraryComponentBaseId: 'component',
                        capabilities: { inherits: ['ww-layout'], displayAllowedValues: ['block', 'flex'] },
                        emitDefaultDeclarations: false,
                        styles: { base: { default: { display: 'flex' } } },
                        effectiveFallback: definition,
                    },
                },
                libraryComponents: { component: { rootElementUid: 'definitionRoot' } },
            }),
            stylesheet: createStringStyleSheetAdapter(),
            runtime: STATIC_STYLE_RUNTIME,
        });
        const overrideCss = run.result.slice(run.result.indexOf('@layer ww-style-layout-override'));
        const definitionRule =
            overrideCss.match(/[^{}]*ww-element-definitionRoot[^{}]*\{[^}]*height: 100%;[^}]*\}/)?.[0] || '';
        const instanceRule =
            overrideCss.match(/[^{}]*ww-element-instance[^{}]*\{[^}]*height: revert-layer;[^}]*\}/)?.[0] || '';
        const instanceTextAlignRule =
            overrideCss.match(/[^{}]*ww-element-instance[^{}]*\{[^}]*text-align: revert-layer;[^}]*\}/)?.[0] || '';

        expect(definitionRule).toContain(':where(');
        expect(instanceRule).toContain(':where(');
        expect(instanceTextAlignRule).toContain(':where(');
        expect(overrideCss.indexOf(instanceRule)).toBeGreaterThan(overrideCss.indexOf(definitionRule));
    });

    it('recomposes concrete-root display states for an instance text alignment override', () => {
        const definition: TestSourceData = {
            uid: 'definitionRoot',
            capabilities: { inherits: ['ww-layout'], displayAllowedValues: ['block', 'flex'] },
            states: [{ id: 'active', label: 'Active' }],
            styles: {
                base: { default: { display: 'block', textAlign: 'center' } },
                active: { default: { display: 'flex' } },
            },
        };
        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['instance'], sectionUids: [], libraryComponentIds: ['component'] },
            reader: createReader({
                elements: {
                    definitionRoot: definition,
                    instance: {
                        uid: 'instance',
                        libraryComponentBaseId: 'component',
                        capabilities: { inherits: ['ww-layout'], displayAllowedValues: ['block', 'flex'] },
                        emitDefaultDeclarations: false,
                        styles: { base: { default: { textAlign: 'right' } } },
                        effectiveFallback: definition,
                    },
                },
                libraryComponents: { component: { rootElementUid: 'definitionRoot' } },
            }),
            stylesheet: createStringStyleSheetAdapter(),
            runtime: STATIC_STYLE_RUNTIME,
        });
        const overrideCss = run.result.slice(run.result.indexOf('@layer ww-style-layout-override'));
        const instanceBaseRules =
            overrideCss
                .match(/[^{}]*ww-element-instance[^{}]*\{[^}]*\}/g)
                ?.filter(rule => !rule.includes('data-ww-states') && rule.includes('height: 100%;')) || [];
        const instanceBaseTextAlignRules =
            overrideCss
                .match(/[^{}]*ww-element-instance[^{}]*\{[^}]*\}/g)
                ?.filter(rule => !rule.includes('data-ww-states') && rule.includes('text-align: right;')) || [];
        const instanceStateRules =
            overrideCss
                .match(/[^{}]*ww-element-instance[^{}]*data-ww-states~="active"[^{}]*\{[^}]*\}/g)
                ?.filter(rule => rule.includes('height: revert-layer;')) || [];
        const instanceStateTextAlignRules =
            overrideCss
                .match(/[^{}]*ww-element-instance[^{}]*data-ww-states~="active"[^{}]*\{[^}]*\}/g)
                ?.filter(rule => rule.includes('text-align: revert-layer;')) || [];

        expect(instanceBaseRules).toHaveLength(3);
        expect(instanceBaseTextAlignRules).toHaveLength(3);
        expect(instanceStateRules).toHaveLength(3);
        expect(instanceStateTextAlignRules).toHaveLength(3);
    });

    it('ignores sparse library instance wrap content like the legacy root merge', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['instance'], sectionUids: [], libraryComponentIds: [] },
            reader: createReader({
                elements: {
                    instance: {
                        uid: 'instance',
                        libraryComponentBaseId: 'component',
                        capabilities: { inherits: ['ww-layout'], displayAllowedValues: ['flex'] },
                        emitDefaultDeclarations: false,
                        styles: { base: { default: { display: true } } },
                        effectiveFallback: {
                            uid: 'definitionRoot',
                            styles: { base: { default: { display: 'flex' } } },
                            content: {
                                base: { default: { '_ww-layout_flexDirection': 'row' } },
                            },
                        },
                        content: { base: { default: { '_ww-layout_flexWrap': true } } },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
            runtime: STATIC_STYLE_RUNTIME,
        });
        const instanceCss = run.result.slice(run.result.indexOf('.ww-element-instance'));

        expect(instanceCss).not.toContain('flex-wrap: wrap;');
    });

    it('ignores layout content stored on every renderless instance in a nested fallback chain', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['instance'], sectionUids: [], libraryComponentIds: [] },
            reader: createReader({
                elements: {
                    instance: {
                        uid: 'instance',
                        libraryComponentBaseId: 'component',
                        capabilities: { inherits: ['ww-layout'], displayAllowedValues: ['flex'] },
                        emitDefaultDeclarations: false,
                        styles: { base: { default: { display: true } } },
                        effectiveFallback: {
                            uid: 'nestedInstance',
                            content: { base: { default: { '_ww-layout_reverse': true } } },
                            effectiveFallback: {
                                uid: 'definitionRoot',
                                styles: { base: { default: { display: 'flex' } } },
                                content: {
                                    base: { default: { '_ww-layout_flexDirection': 'row' } },
                                },
                            },
                        },
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_flexDirection': 'column',
                                    '_ww-layout_pushLast': true,
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
            runtime: STATIC_STYLE_RUNTIME,
        });
        const instanceCss = run.result.slice(run.result.indexOf('.ww-element-instance'));
        expect(instanceCss).toContain('flex-direction: row;');
        expect(instanceCss).not.toContain('flex-direction: column-reverse;');
        expect(instanceCss).not.toContain('margin-top: auto;');
    });

    it('keeps inherited bound layout inputs on the concrete root and ignores instance content bindings', () => {
        const variables: StyleDynamicVariable[] = [];
        const definition: TestSourceData = {
            uid: 'definitionRoot',
            capabilities: { inherits: ['ww-layout'], displayAllowedValues: ['flex'] },
            styles: { base: { default: { display: 'flex' } } },
            content: {
                base: {
                    default: {
                        '_ww-layout_flexDirection': {
                            __wwtype: 'f',
                            code: 'variables.inheritedDirection',
                        },
                        '_ww-layout_pushLast': true,
                    },
                },
            },
        };
        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['definitionRoot', 'instance'], sectionUids: [], libraryComponentIds: [] },
            reader: createReader({
                elements: {
                    definitionRoot: definition,
                    instance: {
                        uid: 'instance',
                        libraryComponentBaseId: 'component',
                        capabilities: { inherits: ['ww-layout'], displayAllowedValues: ['flex'] },
                        emitDefaultDeclarations: false,
                        styles: { base: { default: { display: true } } },
                        effectiveFallback: definition,
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_reverse': { __wwtype: 'f', code: 'variables.instanceReverse' },
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createDynamicVariableStringStyleSheetAdapter(variables),
        });
        const definitionVariables = variables.filter(variable => variable.sourceUid === 'definitionRoot');
        const serializedVariables = JSON.stringify(variables);

        expect(run.result).toMatch(/\.ww-element-definitionRoot\.ww-layout[^}]*flex-direction: var\(/);
        expect(definitionVariables.length).toBeGreaterThan(0);
        expect(serializedVariables).toContain('variables.inheritedDirection');
        expect(serializedVariables).not.toContain('variables.instanceReverse');
        expect(variables.some(variable => variable.sourceUid === 'instance')).toBe(false);
    });

    it('does not re-evaluate concrete-root layout formulas when an instance formula gates the layout family', () => {
        const variables: StyleDynamicVariable[] = [];
        const definition: TestSourceData = {
            uid: 'definitionRoot',
            capabilities: { inherits: ['ww-layout'], displayAllowedValues: ['flex'] },
            styles: { base: { default: { display: 'flex' } } },
            content: {
                base: {
                    default: {
                        '_ww-layout_flexDirection': {
                            __wwtype: 'f',
                            code: 'component.variables.rootDirection',
                        },
                    },
                },
            },
        };
        createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['definitionRoot', 'instance'], sectionUids: [], libraryComponentIds: [] },
            reader: createReader({
                elements: {
                    definitionRoot: definition,
                    instance: {
                        uid: 'instance',
                        libraryComponentBaseId: 'component',
                        capabilities: {
                            inherits: ['ww-layout'],
                            displayAllowedValues: ['flex', 'block'],
                        },
                        emitDefaultDeclarations: false,
                        styles: {
                            base: {
                                default: {
                                    display: { __wwtype: 'f', code: 'variables.instanceDisplay' },
                                },
                            },
                        },
                        effectiveFallback: definition,
                    },
                },
            }),
            stylesheet: createDynamicVariableStringStyleSheetAdapter(variables),
        });
        const instanceVariables = JSON.stringify(variables.filter(variable => variable.sourceUid === 'instance'));
        const definitionVariables = JSON.stringify(
            variables.filter(variable => variable.sourceUid === 'definitionRoot')
        );

        expect(instanceVariables).toContain('variables.instanceDisplay');
        expect(instanceVariables).not.toContain('component.variables.rootDirection');
        expect(definitionVariables).toContain('component.variables.rootDirection');
    });

    it('targets marked layout items so headers and drag placeholders cannot receive push-last margins', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['layout'], sectionUids: [], libraryComponentIds: [] },
            reader: createReader({
                elements: {
                    layout: {
                        uid: 'layout',
                        capabilities: { inherits: ['ww-layout'] },
                        styles: { base: { default: { display: 'flex' } } },
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_flexDirection': 'row',
                                    '_ww-layout_pushLast': true,
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });

        expect(run.result).toContain(':nth-last-child(1 of .ww-element[data-ww-layout-item])');
        expect(run.result).toContain(':not(:has(> .ww-element[data-ww-layout-item]))');
        expect(run.result).toContain(':nth-last-child(1 of .ww-element:not(.ww-drag-placeholder))');
    });

    it('keeps dynamic push-last selectors mutually exclusive for a single repeated item', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['layout'], sectionUids: [], libraryComponentIds: [] },
            reader: createReader({
                elements: {
                    layout: {
                        uid: 'layout',
                        capabilities: { inherits: ['ww-layout'] },
                        styles: { base: { default: { display: 'flex' } } },
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_flexDirection': 'row',
                                    '_ww-layout_reverse': { __wwtype: 'f', code: 'reverse' },
                                    '_ww-layout_pushLast': true,
                                },
                            },
                        },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const itemSelector = '.ww-element[data-ww-layout-item]';

        expect(run.result).toContain(`:nth-last-child(1 of ${itemSelector}):not(:nth-child(1 of ${itemSelector}))`);
        expect(run.result).toContain(`:nth-child(1 of ${itemSelector}):not(:nth-last-child(1 of ${itemSelector}))`);
        expect(run.result).toContain(`:nth-child(1 of ${itemSelector}):nth-last-child(1 of ${itemSelector})`);
    });

    it('emits push-last margins in an override layer that can reveal authored child margins', () => {
        const run = createStyleCompiler().compileStylesheet({
            scope: { elementUids: ['layout', 'child'], sectionUids: [], libraryComponentIds: [] },
            reader: createReader({
                elements: {
                    layout: {
                        uid: 'layout',
                        capabilities: { inherits: ['ww-layout'] },
                        styles: { base: { default: { display: 'flex' } } },
                        content: {
                            base: {
                                default: {
                                    '_ww-layout_flexDirection': 'row',
                                    '_ww-layout_pushLast': { __wwtype: 'f', code: 'pushLast' },
                                },
                            },
                        },
                    },
                    child: {
                        uid: 'child',
                        styles: { base: { default: { margin: '0 0 0 24px' } } },
                    },
                },
            }),
            stylesheet: createStringStyleSheetAdapter(),
        });
        const elementLayerIndex = run.result.indexOf('@layer ww-style-element');
        const overrideLayerIndex = run.result.indexOf('@layer ww-style-layout-override');
        const overrideCss = run.result.slice(overrideLayerIndex);

        expect(elementLayerIndex).toBeGreaterThanOrEqual(0);
        expect(overrideLayerIndex).toBeGreaterThan(elementLayerIndex);
        expect(overrideCss).not.toContain('@layer library, section, element;');
        expect(run.result).toContain('margin: 0 0 0 24px;');
        expect(overrideCss).toContain('margin-left: var(');
        expect(overrideCss).toContain('revert-layer');
    });
});
