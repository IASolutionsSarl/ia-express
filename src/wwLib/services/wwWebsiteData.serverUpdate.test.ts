import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import wwWebsiteData from './wwWebsiteData.js';
import { initialize, dispose } from '@/_manager/services/socket.services.js';

const mocks = vi.hoisted(() => ({ load: vi.fn(), reload: vi.fn(), waiting: vi.fn() }));
vi.mock('@/helpers/loadEditor.js', () => ({ default: vi.fn() }));
vi.mock('@/_common/helpers/data/collections.js', () => ({ fetchStaticCollectionsData: vi.fn() }));
vi.mock('@/_manager/helpers/projectIdentifier', () => ({ getProjectIdentifierFromHostname: () => 'project' }));
vi.mock('@/_manager/services/newApi', () => ({
    default: {
        projects: { load: mocks.load },
        ai: { getQueriesHistory: async () => [] },
        sourceCodes: { getWwObjectBases: async () => [] },
    },
}));

const updating = {
    response: { status: 425, data: { code: 'SERVER_UPDATING', serverUpdateLockedAt: '2026-10-28T12:00:00Z' } },
};

describe('editor startup server update', () => {
    let editorWindow: { location: { reload: typeof mocks.reload }; onbeforeunload?: () => string | undefined };
    let isServerUpdating: boolean;
    beforeEach(() => {
        vi.useFakeTimers();
        isServerUpdating = false;
        editorWindow = { location: { reload: mocks.reload } };
        vi.stubGlobal('window', { location: { hostname: 'project-editor.localhost' } });
        vi.stubGlobal('wwLib', {
            wwWebsiteData,
            getFrontWindow: () => ({}),
            getEditorWindow: () => editorWindow,
            getEditorRouter: () => ({ currentRoute: { value: { params: { commitId: 'commit' } } } }),
            store: {
                websiteData: { setFullDesign: vi.fn() },
                editorUIState: { setEditorLoading: vi.fn() },
                manager: { setIsWaitingForServerUpdateOnLoad: mocks.waiting },
                viewBack: {
                    get isServerUpdating() {
                        return isServerUpdating;
                    },
                    syncServerUpdateLock: ({ serverUpdateLockedAt }: { serverUpdateLockedAt: string | null }) => {
                        isServerUpdating = !!serverUpdateLockedAt;
                        return isServerUpdating;
                    },
                },
            },
        });
        mocks.load.mockRejectedValueOnce(updating);
    });

    afterEach(() => {
        dispose();
        vi.clearAllTimers();
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.resetAllMocks();
    });

    it('enables the update message and reloads on completion without a socket event', async () => {
        initialize();
        mocks.reload.mockImplementationOnce(() => expect(editorWindow.onbeforeunload?.()).toBeUndefined());
        mocks.load.mockResolvedValueOnce({});
        await wwWebsiteData.init();

        expect(mocks.waiting).toHaveBeenCalledWith(true);
        expect(mocks.reload).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(5000);

        expect(mocks.load).toHaveBeenLastCalledWith('project', 'commit');
        expect(mocks.reload).toHaveBeenCalledOnce();
        expect(wwWebsiteData.reloadOnServerUpdate).toBe(false);
    });

    it('keeps waiting during deployment and transient network failures', async () => {
        mocks.load
            .mockRejectedValueOnce(updating)
            .mockRejectedValueOnce(new Error('Network Error'))
            .mockResolvedValueOnce({});
        await wwWebsiteData.init();

        await vi.advanceTimersByTimeAsync(10000);
        expect(mocks.reload).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(5000);
        expect(mocks.reload).toHaveBeenCalledOnce();
    });

    it('does not overlap polls when a request takes longer than the polling interval', async () => {
        let complete!: (value: object) => void;
        mocks.load.mockImplementationOnce(
            () =>
                new Promise(resolve => {
                    complete = resolve;
                })
        );
        await wwWebsiteData.init();

        await vi.advanceTimersByTimeAsync(20000);
        expect(mocks.load).toHaveBeenCalledTimes(2);
        complete({});
        await vi.advanceTimersByTimeAsync(0);
        expect(mocks.reload).toHaveBeenCalledOnce();
    });

    it('stops polling after the socket completion path has requested a reload', async () => {
        await wwWebsiteData.init();
        wwWebsiteData.reloadOnServerUpdate = false;

        await vi.advanceTimersByTimeAsync(10000);

        expect(mocks.load).toHaveBeenCalledOnce();
        expect(mocks.reload).not.toHaveBeenCalled();
    });

    it('reloads into the normal startup flow when the server returns another state', async () => {
        mocks.load.mockRejectedValueOnce({ response: { status: 425, data: { code: 'PROJECT_WAKING' } } });
        await wwWebsiteData.init();

        await vi.advanceTimersByTimeAsync(5000);

        expect(mocks.reload).toHaveBeenCalledOnce();
        expect(wwWebsiteData.reloadOnServerUpdate).toBe(false);
    });
});
