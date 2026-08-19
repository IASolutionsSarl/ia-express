import { readFileSync } from 'node:fs';

import { computed, reactive, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import {
    createLibraryComponentRenderingData,
    resolveLibraryComponentConditionalRendering,
} from '@/_common/helpers/component/libraryComponentRendering';

describe('library component conditional rendering', () => {
    it('forwards reactive instance conditions so they override a hidden library root', () => {
        const condition = ref(true);
        const libraryComponentData = reactive({
            ...createLibraryComponentRenderingData({
                raw: computed(() => ({ __wwtype: 'f' })),
                value: computed(() => condition.value),
            }),
        });
        const fallback = vi.fn(() => false);
        const resolveRootCondition = () => resolveLibraryComponentConditionalRendering(libraryComponentData, fallback);

        expect(resolveRootCondition()).toBe(true);
        expect(fallback).not.toHaveBeenCalled();

        condition.value = false;

        expect(resolveRootCondition()).toBe(false);
        expect(fallback).not.toHaveBeenCalled();
        expect(libraryComponentData).not.toHaveProperty('style');
        expect(libraryComponentData).not.toHaveProperty('rawStyle');
    });

    it('uses the root condition when the rendering override is incomplete', () => {
        const fallback = vi.fn(() => false);

        expect(
            resolveLibraryComponentConditionalRendering(
                { rendering: { conditionalRendering: { value: true } } },
                fallback
            )
        ).toBe(false);
        expect(fallback).toHaveBeenCalledOnce();
    });

    it('keeps the library root mounted so it can run its conditional-rendering lifecycle', () => {
        const source = readFileSync(new URL('../../_front/components/wwLibraryComponent.vue', import.meta.url), 'utf8');

        expect(source).toContain('<ComponentLoader v-else :key="rootUid"');
        expect(source).toContain('v-if="!isLoop"');
        expect(source).not.toContain('v-else-if="isRendering"');
        expect(source).not.toContain('v-if="!isLoop && isRendering"');
    });
});
