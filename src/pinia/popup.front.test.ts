import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia } from 'pinia';
import { computed } from 'vue';
import { useWebsiteDataState } from './websiteData/state';
// @ts-expect-error Vitest strips editor blocks through wewebTargetBlockPlugin.
import { useWebsiteDataWriters } from './websiteData/writers.ts?ww-target=front';
// @ts-expect-error Vitest strips editor blocks through wewebTargetBlockPlugin.
import { useWebsiteDataCommands } from './websiteData/commands.ts?ww-target=front';
// @ts-expect-error Vitest strips editor blocks through wewebTargetBlockPlugin.
import { usePopupStore } from './popup.js?ww-target=front';

describe('published popups', () => {
    let popups: ReturnType<typeof usePopupStore>;
    let state: ReturnType<typeof useWebsiteDataState>;
    let popupConfiguration: { isStacked?: boolean };

    beforeEach(() => {
        state = useWebsiteDataState();
        popupConfiguration = {};
        const writers = useWebsiteDataWriters({ stateRefs: state });
        const websiteData = useWebsiteDataCommands({
            stateRefs: state,
            getters: { designInfo: computed(() => ({})), pluginsById: computed(() => ({})) },
            writers,
        });
        vi.stubGlobal('wwLib', {
            store: {
                websiteData,
                libraries: { components: { modal: { configuration: { popup: popupConfiguration } } } },
            },
        });
        popups = usePopupStore(createPinia());
    });

    it('opens a popup and lets its workflow continue after editor code is stripped', async () => {
        const content = { message: 'Published popup' };
        const uid = await popups.open('modal', content);

        expect(popups.instances[uid]).toMatchObject({ uid, libraryComponentBaseId: 'modal', content });
        expect(popups.instances[uid]._si).toBeTypeOf('number');
        expect(state.styleSourceIdRegistry.value.idByUid.get(uid)).toBe(popups.instances[uid]._si);
    });

    it('exposes only defined commands after editor-only writers are stripped', () => {
        expect(Object.keys(wwLib.store.websiteData)).not.toHaveLength(0);
        for (const [name, command] of Object.entries(wwLib.store.websiteData)) {
            expect(command, name).toBeTypeOf('function');
        }
    });

    it('waits for closing and returns the close result to every waiter', async () => {
        const first = popups.open('modal', {}, { waitClosing: true });
        const uid = Object.keys(popups.instances)[0];
        const second = popups.open('modal', {}, { waitClosing: true });

        expect(Object.keys(popups.instances)).toEqual([uid]);
        popups.close(uid, { confirmed: true });

        await expect(first).resolves.toEqual({ confirmed: true });
        await expect(second).resolves.toEqual({ confirmed: true });
        expect(popups.instances).toEqual({});
    });

    it('reuses a non-stacked popup and assigns a fresh identity when reopened', async () => {
        const first = await popups.open('modal', null);
        const styleId = popups.instances[first]._si;
        expect(await popups.open('modal', null)).toBe(first);
        popups.close(first);
        const reopened = await popups.open('modal', null);

        expect(reopened).not.toBe(first);
        expect(popups.instances[reopened]._si).not.toBe(styleId);
    });

    it('keeps popup identities distinct from loaded page sources and stacked instances', async () => {
        const source = { uid: 'page-source', _si: 12 };
        wwLib.store.websiteData.ensureStyleSourceIds([source]);
        popupConfiguration.isStacked = true;

        const first = await popups.open('modal', {});
        const second = await popups.open('modal', {});

        expect(new Set([source._si, popups.instances[first]._si, popups.instances[second]._si]).size).toBe(3);
        popups.closeAll('modal');
        expect(popups.instances).toEqual({});
    });
});
