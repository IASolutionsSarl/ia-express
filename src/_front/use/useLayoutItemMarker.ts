import { computed, inject, provide, unref, type MaybeRef } from 'vue';

const LAYOUT_ITEM_INDEX_INJECTION_KEY = '_wwLayoutIndex';

type LayoutItemIndex = MaybeRef<number | null>;

export function provideLayoutItemIndex(index: LayoutItemIndex) {
    provide(LAYOUT_ITEM_INDEX_INJECTION_KEY, index);
}

export function resetLayoutItemIndex() {
    provideLayoutItemIndex(null);
}

export function useLayoutItemIndex() {
    return inject<LayoutItemIndex>(LAYOUT_ITEM_INDEX_INJECTION_KEY, null);
}

export function useLayoutItemAttribute(index: LayoutItemIndex = useLayoutItemIndex()) {
    return computed(() => (unref(index) === null ? undefined : ''));
}
