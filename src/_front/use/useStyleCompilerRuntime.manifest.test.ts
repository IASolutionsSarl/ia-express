import { nextTick, reactive } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
    const compilerStops: Array<ReturnType<typeof vi.fn>> = [];
    const registrationStops: Array<ReturnType<typeof vi.fn>> = [];

    return {
        compilerStops,
        compileStylesheet: vi.fn(() => {
            const stop = vi.fn();
            compilerStops.push(stop);
            return { result: [], stop };
        }),
        createSources: vi.fn(() => ({
            scope: { value: { elementUids: [], sectionUids: [], libraryComponentIds: [] } },
            reader: {},
        })),
        createStyleSheet: vi.fn(() => ({})),
        lifecycleCleanups: [] as Array<() => void>,
        registrationStops,
        registerVariables: vi.fn(() => {
            const stop = vi.fn();
            registrationStops.push(stop);
            return stop;
        }),
    };
});

vi.mock('vue', async importOriginal => ({
    ...(await importOriginal<typeof import('vue')>()),
    onBeforeUnmount: vi.fn((cleanup: () => void) => mocks.lifecycleCleanups.push(cleanup)),
}));
vi.mock('@/_common/helpers/styleCompiler', async importOriginal => ({
    ...(await importOriginal<typeof import('@/_common/helpers/styleCompiler')>()),
    createStyleCompiler: () => ({ compileStylesheet: mocks.compileStylesheet }),
}));
vi.mock('@/_front/helpers/styleCompilerReader', () => ({
    createEditorStyleCompilerSources: mocks.createSources,
}));
vi.mock('@/_front/services/styleCompilerDomStyleSheet', () => ({
    createDomStyleSheetAdapter: mocks.createStyleSheet,
}));
vi.mock('@/_front/services/styleCompilerRuntimeVariables', () => ({
    registerStyleDynamicVariables: mocks.registerVariables,
}));

import { usePageStyleCompilerRuntime } from './useStyleCompilerRuntime';

describe('published page style runtime', () => {
    beforeEach(() => {
        mocks.compileStylesheet.mockClear();
        mocks.createSources.mockClear();
        mocks.createStyleSheet.mockClear();
        mocks.registerVariables.mockClear();
        mocks.compilerStops.length = 0;
        mocks.lifecycleCleanups.length = 0;
        mocks.registrationStops.length = 0;
    });

    it('registers a valid page manifest without constructing runtime compiler sources', () => {
        setCurrentPage({ id: 'page-a', _sm: [1, []] });

        usePageStyleCompilerRuntime('runtime');

        expect(mocks.registerVariables).toHaveBeenCalledWith([]);
        expect(mocks.createSources).not.toHaveBeenCalled();
        expect(mocks.compileStylesheet).not.toHaveBeenCalled();
        runLifecycleCleanups();
    });

    it('keeps the runtime compiler as a fallback for pages published without a manifest', () => {
        setCurrentPage({ id: 'legacy-page' });

        usePageStyleCompilerRuntime('runtime');

        expect(mocks.registerVariables).not.toHaveBeenCalled();
        expect(mocks.createSources).toHaveBeenCalledOnce();
        expect(mocks.compileStylesheet).toHaveBeenCalledOnce();
        runLifecycleCleanups();
    });

    it('switches atomically between legacy compilation and page manifests', async () => {
        const page = reactive<{ id: string; _sm?: unknown }>({ id: 'legacy-page' });
        setCurrentPage(page);
        usePageStyleCompilerRuntime('runtime');

        page.id = 'manifest-page';
        page._sm = [1, []];
        await nextTick();

        expect(mocks.compilerStops[0]).toHaveBeenCalledOnce();
        expect(mocks.registerVariables).toHaveBeenCalledWith([]);

        page.id = 'malformed-page';
        page._sm = [2, []];
        await nextTick();

        expect(mocks.registrationStops[0]).toHaveBeenCalledOnce();
        expect(mocks.compileStylesheet).toHaveBeenCalledTimes(2);
        runLifecycleCleanups();
    });
});

function setCurrentPage(page: { id: string; _sm?: unknown }) {
    wwLib.$store = {
        getters: {
            'websiteData/getPage': page,
        },
    } as typeof wwLib.$store;
}

function runLifecycleCleanups() {
    for (const cleanup of mocks.lifecycleCleanups) cleanup();
}
