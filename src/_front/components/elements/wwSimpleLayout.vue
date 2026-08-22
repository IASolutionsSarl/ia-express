<template>
    <component
        :is="tag"
        class="ww-layout"
        :data-ww-layout-owner-type="parentElementUid ? 'element' : sectionId ? 'section' : undefined"
        :data-ww-layout-owner-uid="parentElementUid || sectionId || undefined"
        :data-ww-layout-style-scopes="layoutStyleScopes"
        :style="layoutStyle"
    >
        <slot></slot>
    </component>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import { useLayoutStyleScopeAttribute } from '@/_front/use/useLayoutStyleScopes';
import { useLegacyLayoutStyle } from '@/_front/helpers/wwLayoutRuntime';

withDefaults(defineProps<{ tag?: string }>(), {
    tag: 'div',
});

const parentElementUid = inject<string | null>('_wwElementUid', null);
const sectionId = inject<string | null>('sectionId', null);
const layoutStyleScopes = useLayoutStyleScopeAttribute(() => parentElementUid);
const layoutStyle = useLegacyLayoutStyle();
</script>
