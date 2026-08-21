import { beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, reactive, watchEffect } from 'vue';

import {
    createStringStyleSheetAdapter,
    createStyleCompiler,
    STATIC_STYLE_RUNTIME,
} from '@/_common/helpers/styleCompiler';
import { createReactiveCompileScope } from './styleCompilerRuntimeScope';
import { createEditorStyleCompilerSources } from './styleCompilerReader';

const componentConfigurations = vi.hoisted(
    () =>
        new Map<
            string,
            { inherit?: unknown[]; options?: { autoByContent?: boolean; displayAllowedValues?: string[] } }
        >()
);
const popupStore = vi.hoisted(() => ({ instances: {} as Record<string, StyleSourceData> }));

vi.mock('@/_common/helpers/component/component', () => ({
    getComponentBaseConfiguration: vi.fn((type: string, baseId: string) =>
        componentConfigurations.get(`${type}:${baseId}`)
    ),
    getDisplayAllowedValues: vi.fn(
        (configuration?: { options?: { displayAllowedValues?: string[] } }) =>
            configuration?.options?.displayAllowedValues || ['block', 'inline-block']
    ),
}));

vi.mock('@/pinia/popup', () => ({
    usePopupStore: vi.fn(() => popupStore),
}));

vi.mock('@/pinia/componentBases', () => ({
    useComponentBasesStore: vi.fn(() => ({ configurations: {} })),
}));

type StyleSourceData = {
    uid?: string;
    rootElementId?: string;
    wwObjectBaseId?: string | null;
    libraryComponentBaseId?: string | null;
    parentLibraryComponentId?: string | null;
    parentSectionId?: string | null;
    _state?: Record<string, unknown>;
    content?: Record<string, unknown>;
};

let elements: Record<string, StyleSourceData>;
let sections: Record<string, StyleSourceData>;
let libraryComponents: Record<string, StyleSourceData>;

beforeEach(() => {
    componentConfigurations.clear();
    componentConfigurations.set('libraryComponent:libraryA', {});
    componentConfigurations.set('libraryComponent:libraryB', {});
    componentConfigurations.set('element:flexRootBase', {
        inherit: [{ type: 'ww-layout' }],
        options: { displayAllowedValues: ['flex', 'inline-flex'] },
    });
    componentConfigurations.set('element:gridRootBase', {
        inherit: [{ type: 'ww-layout' }],
        options: { displayAllowedValues: ['grid', 'inline-grid'] },
    });

    elements = reactive<Record<string, StyleSourceData>>({});
    sections = reactive<Record<string, StyleSourceData>>({});
    libraryComponents = reactive<Record<string, StyleSourceData>>({});
    popupStore.instances = reactive<Record<string, StyleSourceData>>({});

    vi.stubGlobal('wwLib', {
        $store: {
            getters: {
                get 'websiteData/getWwObjects'() {
                    return elements;
                },
                get 'websiteData/getSections'() {
                    return sections;
                },
                get 'websiteData/getPage'() {
                    return { sections: [{ uid: 'sectionA' }] };
                },
                get 'libraries/getComponents'() {
                    return libraryComponents;
                },
                'libraries/getClasses': {},
            },
        },
    });
});

describe('styleCompilerReader source indexing', () => {
    it('keeps the compile scope stable for an Arkero-sized non-structural update', async () => {
        const activePageElementCount = 1_978;
        const projectElementCount = 4_081;

        for (let index = 0; index < projectElementCount; index += 1) {
            const uid = `element${index}`;
            elements[uid] = {
                uid,
                parentSectionId: index < activePageElementCount ? 'sectionA' : 'sectionB',
                _state: { style: { default: { width: `${index}px` } } },
            };
        }

        const sources = createEditorStyleCompilerSources();
        const observedScopes: unknown[] = [];
        const stop = watchEffect(() => observedScopes.push(sources.scope.value));

        expect(sources.scope.value.elementUids).toHaveLength(activePageElementCount);
        expect(observedScopes).toHaveLength(1);

        elements.element0 = {
            ...elements.element0,
            _state: { style: { default: { width: '240px' } } },
        };
        await nextTick();

        expect(observedScopes).toHaveLength(1);

        elements.element0 = { ...elements.element0, parentSectionId: 'sectionB' };
        await nextTick();

        expect(observedScopes).toHaveLength(2);
        expect(sources.scope.value.elementUids).toHaveLength(activePageElementCount - 1);
        stop();
    });

    it('does not rescan every element for each nested library component and parent state', () => {
        let fullObjectScans = 0;
        elements = reactive(
            new Proxy<Record<string, StyleSourceData>>(
                {},
                {
                    ownKeys(target) {
                        fullObjectScans += 1;
                        return Reflect.ownKeys(target);
                    },
                }
            )
        );

        const libraryComponentCount = 40;
        elements.pageRoot = {
            uid: 'pageRoot',
            libraryComponentBaseId: 'library0',
            parentSectionId: 'sectionA',
        };

        for (let index = 0; index < libraryComponentCount; index += 1) {
            const libraryComponentId = `library${index}`;
            const childLibraryComponentId = index + 1 < libraryComponentCount ? `library${index + 1}` : null;
            const elementUid = `libraryElement${index}`;

            elements[elementUid] = {
                uid: elementUid,
                libraryComponentBaseId: childLibraryComponentId,
                parentLibraryComponentId: libraryComponentId,
                _state: {
                    style: {
                        [`_wwParent_pageRoot_hover_default`]: { opacity: 0.5 },
                    },
                },
            };
            libraryComponents[libraryComponentId] = { rootElementId: elementUid };
        }

        fullObjectScans = 0;
        Object.values(elements);
        const scanCost = fullObjectScans;
        fullObjectScans = 0;

        const sources = createEditorStyleCompilerSources();

        for (const libraryComponentId of sources.scope.value.libraryComponentIds) {
            sources.reader.libraryComponent(libraryComponentId)?.childLibraryComponentIds?.();
        }
        for (const elementUid of sources.scope.value.libraryElementUids || []) {
            sources.reader.element(elementUid)?.states();
        }

        expect(sources.scope.value.libraryComponentIds).toHaveLength(libraryComponentCount);
        expect(fullObjectScans).toBeLessThanOrEqual(scanCost);
    });

    it('invalidates the shared index when an element is added', () => {
        const sources = createEditorStyleCompilerSources();

        expect(sources.scope.value.elementUids).not.toContain('newElement');

        elements.newElement = { uid: 'newElement', parentSectionId: 'sectionA' };

        expect(sources.scope.value.elementUids).toContain('newElement');
    });

    it('does not recompile existing targets when an unrelated element is added', async () => {
        for (let index = 0; index < 5; index += 1) {
            const uid = `element${index}`;
            elements[uid] = { uid, parentSectionId: 'sectionA' };
        }

        const sources = createEditorStyleCompilerSources();
        const editorReader = sources.reader;
        let elementReads = 0;
        const reader = {
            ...editorReader,
            element(uid: string) {
                elementReads += 1;
                return editorReader.element(uid);
            },
        };
        const run = createStyleCompiler().compileStylesheet({
            scope: createReactiveCompileScope(sources.scope),
            reader,
            stylesheet: createStringStyleSheetAdapter(),
            runtime: {
                createScope: effectScope,
                effect: callback => watchEffect(callback),
            },
        });

        try {
            await nextTick();
            expect(elementReads).toBe(5);

            elementReads = 0;
            elements.newElement = { uid: 'newElement', parentSectionId: 'sectionA' };
            await nextTick();

            expect(elementReads).toBe(1);
        } finally {
            run.stop();
        }
    });

    it('does not recompile parent-state targets when an unrelated element is added', async () => {
        elements.parent = {
            uid: 'parent',
            parentSectionId: 'sectionA',
            _state: { states: [{ id: 'hover', label: 'Hover' }] },
        };
        elements.child = {
            uid: 'child',
            parentSectionId: 'sectionA',
            _state: {
                style: {
                    _wwParent_parent_hover_default: { opacity: 0.5 },
                },
            },
        };

        const sources = createEditorStyleCompilerSources();
        const editorReader = sources.reader;
        const readsByUid = new Map<string, number>();
        const reader = {
            ...editorReader,
            element(uid: string) {
                readsByUid.set(uid, (readsByUid.get(uid) || 0) + 1);
                return editorReader.element(uid);
            },
        };
        const run = createStyleCompiler().compileStylesheet({
            scope: createReactiveCompileScope(sources.scope),
            reader,
            stylesheet: createStringStyleSheetAdapter(),
            runtime: {
                createScope: effectScope,
                effect: callback => watchEffect(callback),
            },
        });

        try {
            await nextTick();
            readsByUid.clear();
            elements.unrelated = { uid: 'unrelated', parentSectionId: 'sectionA' };
            await nextTick();

            expect([...readsByUid.entries()]).toEqual([['unrelated', 1]]);
        } finally {
            run.stop();
        }
    });

    it('keeps GoodNow-scale parent-state targets idle during popup and paste mutations', async () => {
        const projectElementCount = 14_500;
        const activePageElementCount = 3_718;
        const parentStateTargetCount = 207;
        const parentStateRuleCount = 250;

        for (let index = 0; index < projectElementCount; index += 1) {
            const uid = `element${index}`;
            elements[uid] = {
                uid,
                parentSectionId: index < activePageElementCount ? 'sectionA' : 'sectionB',
            };
        }
        for (let index = 0; index < parentStateTargetCount; index += 1) {
            const parentUid = `element${parentStateTargetCount + index}`;
            const style = {
                [`_wwParent_${parentUid}_hover_default`]: { opacity: 0.5 },
            };
            const parentStates = [{ id: 'hover', label: 'Hover' }];
            if (index < parentStateRuleCount - parentStateTargetCount) {
                style[`_wwParent_${parentUid}_focus_default`] = { opacity: 0.75 };
                parentStates.push({ id: 'focus', label: 'Focus' });
            }
            elements[`element${index}`]._state = { style };
            elements[parentUid]._state = { states: parentStates };
        }

        const sources = createEditorStyleCompilerSources();
        const editorReader = sources.reader;
        const readsByUid = new Map<string, number>();
        const reader = {
            ...editorReader,
            element(uid: string) {
                readsByUid.set(uid, (readsByUid.get(uid) || 0) + 1);
                return editorReader.element(uid);
            },
        };
        const run = createStyleCompiler().compileStylesheet({
            scope: createReactiveCompileScope(sources.scope),
            reader,
            stylesheet: createStringStyleSheetAdapter(),
            runtime: {
                createScope: effectScope,
                effect: callback => watchEffect(callback),
            },
        });

        try {
            await nextTick();
            readsByUid.clear();

            popupStore.instances.popupInstance = { uid: 'popupInstance' };
            await nextTick();
            expect([...readsByUid.keys()]).toEqual(['popupInstance']);

            readsByUid.clear();
            delete popupStore.instances.popupInstance;
            await nextTick();
            expect(readsByUid.size).toBe(0);

            for (let index = 0; index < 3; index += 1) {
                const uid = `pastedElement${index}`;
                elements[uid] = { uid, parentSectionId: 'sectionA' };
            }
            await nextTick();
            expect([...readsByUid.keys()]).toEqual(['pastedElement0', 'pastedElement1', 'pastedElement2']);
        } finally {
            run.stop();
        }
    });

    it('recompiles only the replaced target when membership is unchanged', async () => {
        for (let index = 0; index < 100; index += 1) {
            const uid = `element${index}`;
            elements[uid] = {
                uid,
                parentSectionId: 'sectionA',
                _state: { style: { default: { width: `${index}px` } } },
            };
        }

        const sources = createEditorStyleCompilerSources();
        const editorReader = sources.reader;
        let elementReads = 0;
        const reader = {
            ...editorReader,
            element(uid: string) {
                elementReads += 1;
                return editorReader.element(uid);
            },
        };
        const run = createStyleCompiler().compileStylesheet({
            scope: createReactiveCompileScope(sources.scope),
            reader,
            stylesheet: createStringStyleSheetAdapter(),
            runtime: {
                createScope: effectScope,
                effect: callback => watchEffect(callback),
            },
        });

        try {
            await nextTick();
            expect(elementReads).toBe(100);

            elementReads = 0;
            elements.element42 = {
                ...elements.element42,
                _state: { style: { default: { width: '240px' } } },
            };
            await nextTick();

            expect(elementReads).toBe(1);
        } finally {
            run.stop();
        }
    });

    it('resolves parent states through the lazy source index', () => {
        elements.parent = {
            uid: 'parent',
            parentSectionId: 'sectionA',
            _state: { states: [{ id: 'hover', label: 'Hover' }] },
        };
        elements.child = {
            uid: 'child',
            parentSectionId: 'sectionA',
            _state: {
                style: {
                    _wwParent_parent_hover_default: { opacity: 0.5 },
                },
            },
        };

        const parentState = createEditorStyleCompilerSources()
            .reader.element('child')
            ?.states()
            .find(state => state.id === '_wwParent_parent_hover');

        expect(parentState?.parent).toMatchObject({
            uid: 'parent',
            stateId: 'hover',
            selector: '.ww-element-parent',
        });
    });
});

describe('styleCompilerReader target lifecycle', () => {
    function compileEditorStylesheet() {
        const sources = createEditorStyleCompilerSources();
        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: createReactiveCompileScope(sources.scope),
            reader: sources.reader,
            stylesheet,
            runtime: {
                createScope: effectScope,
                effect: callback => watchEffect(callback),
            },
        });

        return { run, stylesheet };
    }

    it('removes generated CSS when an element is deleted', async () => {
        elements.elementA = {
            uid: 'elementA',
            parentSectionId: 'sectionA',
            _state: { style: { default: { width: '100px' } } },
            content: { default: {} },
        };

        const { run, stylesheet } = compileEditorStylesheet();

        try {
            await nextTick();
            expect(stylesheet.result()).toContain('.ww-element-elementA');
            expect(stylesheet.result()).toContain('width: 100px;');

            delete elements.elementA;
            await nextTick();

            expect(stylesheet.result()).not.toContain('.ww-element-elementA');
        } finally {
            run.stop();
        }
    });

    it('replaces an element at the same uid without keeping stale declarations', async () => {
        elements.elementA = {
            uid: 'elementA',
            parentSectionId: 'sectionA',
            _state: { style: { default: { width: '100px' } } },
            content: { default: {} },
        };

        const { run, stylesheet } = compileEditorStylesheet();

        try {
            await nextTick();
            expect(stylesheet.result()).toContain('width: 100px;');

            elements.elementA = {
                uid: 'elementA',
                parentSectionId: 'sectionA',
                _state: { style: { default: { width: '240px' } } },
                content: { default: {} },
            };
            await nextTick();

            expect(stylesheet.result()).toContain('width: 240px;');
            expect(stylesheet.result()).not.toContain('width: 100px;');
        } finally {
            run.stop();
        }
    });
});

describe('styleCompilerReader section roots', () => {
    it('reactively distinguishes direct section children from nested elements sharing the section id', async () => {
        const sectionRootElements = reactive([{ uid: 'root' }]);
        sections.sectionA = {
            uid: 'sectionA',
            content: { default: { wwObjects: sectionRootElements } },
        };
        elements.root = { uid: 'root', parentSectionId: 'sectionA' };
        elements.nested = { uid: 'nested', parentSectionId: 'sectionA' };

        const reader = createEditorStyleCompilerSources().reader;

        expect(reader.element('root')?.isDirectSectionChild()).toBe(true);
        expect(reader.element('nested')?.isDirectSectionChild()).toBe(false);

        const updates: boolean[] = [];
        const stop = watchEffect(() => updates.push(reader.element('nested')?.isDirectSectionChild() ?? false));

        sectionRootElements.push({ uid: 'nested' });
        await nextTick();

        expect(updates).toEqual([false, true]);
        stop();
    });
});

describe('styleCompilerReader component capabilities', () => {
    it('exposes auto-by-content sizing to the compiler', () => {
        componentConfigurations.set('element:autoSizedBase', { options: { autoByContent: true } });
        elements.button = { uid: 'button', wwObjectBaseId: 'autoSizedBase' };

        const capabilities = createEditorStyleCompilerSources().reader.element('button')?.capabilities();

        expect(capabilities?.autoByContent).toBe(true);
    });

    it('preserves unresolved style inheritance for library component instances', () => {
        elements.libraryInstance = createLibraryInstance('libraryInstance', 'libraryA');
        elements.regularElement = createElement('regularElement', 'flexRootBase');

        const reader = createEditorStyleCompilerSources().reader;

        expect(reader.element('libraryInstance')?.capabilities?.().omitUndefinedDynamicValues).toBe(true);
        expect(reader.element('regularElement')?.capabilities?.().omitUndefinedDynamicValues).toBe(false);
    });
});

describe('styleCompilerReader library component display capabilities', () => {
    it('exposes the immediate library root chain for legacy composite layout inheritance', () => {
        elements.pageInstance = createLibraryInstance('pageInstance', 'libraryA');
        elements.nestedInstance = createLibraryInstance('nestedInstance', 'libraryB');
        elements.concreteRoot = createElement('concreteRoot', 'flexRootBase');
        libraryComponents.libraryA = { rootElementId: 'nestedInstance' };
        libraryComponents.libraryB = { rootElementId: 'concreteRoot' };

        const pageReader = createEditorStyleCompilerSources().reader.element('pageInstance');
        const nestedReader = pageReader?.effectiveFallbackSource?.();

        expect(nestedReader?.uid()).toBe('nestedInstance');
        expect(nestedReader?.effectiveFallbackSource?.()?.uid()).toBe('concreteRoot');
        expect(nestedReader?.effectiveFallbackSource?.()?.effectiveFallbackSource?.()).toBeNull();
    });

    it('compiles an instance display override with the concrete library root display values', () => {
        elements.libraryRoot = createElement('libraryRoot', 'flexRootBase', true, {
            '_ww-layout_flexDirection': 'row',
            '_ww-layout_alignItems': 'center',
        });
        elements.pageInstance = createLibraryInstance('pageInstance', 'libraryA', true);
        libraryComponents.libraryA = { rootElementId: 'libraryRoot' };

        const stylesheet = createStringStyleSheetAdapter();
        const run = createStyleCompiler().compileStylesheet({
            scope: {
                elementUids: ['pageInstance'],
                sectionUids: [],
                libraryComponentIds: ['libraryA'],
            },
            reader: createEditorStyleCompilerSources().reader,
            stylesheet,
            runtime: STATIC_STYLE_RUNTIME,
        });
        const instanceRule = run.result.match(/\.ww-element-pageInstance\s*\{[^}]*\}/)?.[0] || '';

        expect(instanceRule).toContain('display: flex;');
        expect(instanceRule).not.toContain('display: block;');
        expect(run.result).toContain('align-items: center;');

        run.stop();
    });

    it('resolves nested library roots recursively and reacts when the concrete root changes', async () => {
        elements.pageInstance = createLibraryInstance('pageInstance', 'libraryA', true);
        elements.nestedInstance = createLibraryInstance('nestedInstance', 'libraryB');
        elements.flexRoot = createElement('flexRoot', 'flexRootBase', true);
        elements.gridRoot = createElement('gridRoot', 'gridRootBase', true);
        libraryComponents.libraryA = { rootElementId: 'nestedInstance' };
        libraryComponents.libraryB = { rootElementId: 'flexRoot' };
        const reader = createEditorStyleCompilerSources().reader;
        const instanceReader = reader.element('pageInstance');
        const allowedValueUpdates: (readonly string[] | undefined)[] = [];
        const stop = watchEffect(() => {
            allowedValueUpdates.push(instanceReader?.capabilities?.().displayAllowedValues);
        });

        expect(allowedValueUpdates.at(-1)).toEqual(['flex', 'inline-flex']);

        libraryComponents.libraryB.rootElementId = 'gridRoot';
        await nextTick();

        expect(allowedValueUpdates.at(-1)).toEqual(['grid', 'inline-grid']);

        stop();
    });

    it('keeps the generic display fallback when a nested library root cycle cannot be resolved', () => {
        elements.pageInstance = createLibraryInstance('pageInstance', 'libraryA', true);
        elements.nestedA = createLibraryInstance('nestedA', 'libraryB');
        elements.nestedB = createLibraryInstance('nestedB', 'libraryA');
        libraryComponents.libraryA = { rootElementId: 'nestedA' };
        libraryComponents.libraryB = { rootElementId: 'nestedB' };

        const capabilities = createEditorStyleCompilerSources().reader.element('pageInstance')?.capabilities?.();

        expect(capabilities?.displayAllowedValues).toEqual(['block', 'inline-block']);
    });
});

function createElement(uid: string, wwObjectBaseId: string, display?: unknown, content: Record<string, unknown> = {}) {
    return {
        uid,
        wwObjectBaseId,
        libraryComponentBaseId: null,
        _state: display === undefined ? {} : { style: { default: { display } } },
        content: { default: content },
    };
}

function createLibraryInstance(uid: string, libraryComponentBaseId: string, display?: unknown) {
    return {
        uid,
        wwObjectBaseId: null,
        libraryComponentBaseId,
        _state: display === undefined ? {} : { style: { default: { display } } },
        content: { default: {} },
    };
}
