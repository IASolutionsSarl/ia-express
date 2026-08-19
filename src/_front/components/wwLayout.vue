<template>
    <component
        :is="tag"
        class="ww-layout"
        :data-ww-layout-id="layoutId"
        :data-ww-layout-style-scopes="layoutStyleScopes"
        :class="{
         }"
        :style="layoutDomStyle"
    >
        <slot name="header"></slot>
         <template v-if="internalList[0]">
            <wwLayoutItemContext
                v-for="index in restrictedLength"
                :key="isBound ? `${internalList[0].uid}_${index - 1}` : `${internalList[index - 1].uid}`"
                :index="offset + index - 1"
                :item="isBound ? internalList[0] : internalList[index - 1]"
                :is-repeat="isBound"
                :data="isBound && boundData ? boundData[offset + index - 1] : null"
                :repeated-items="boundData"
            >
                <slot
                    v-bind="{
                        item: isBound ? internalList[0] : internalList[index - 1],
                        index: offset + index - 1,
                        data: isBound && boundData ? boundData[offset + index - 1] : null,
                        layoutId,
                     }"
                >
                    <wwElement v-bind="isBound ? internalList[0] : internalList[index - 1]"></wwElement>
                </slot>
            </wwLayoutItemContext>
        </template>
     </component>
</template>

<script>
import { computed, inject, toRef } from 'vue';
 
import { useParentContentProperty } from '@/_common/use/useComponent.js';
 
import { useRestoreContext } from '@/_front/use/useRestoreContext.js';
import { useLayoutStyleScopeAttribute } from '@/_front/use/useLayoutStyleScopes';

import wwLayoutItem from './wwLayoutItem.vue';
import wwLayoutItemContext from './wwLayoutItemContext.vue';

 
let layoutId = 1;
const MAX_REPEAT = 200;

export default {
    name: 'wwLayout',
    components: {
        wwLayoutItem,
        wwLayoutItemContext,
    },
    props: {
        path: { type: String, required: false, default: undefined },
        tag: { type: String, default: 'div' },
        direction: { type: String, default: null },
        disableDragDrop: { type: Boolean, default: false },
        disableEdit: { type: Boolean, default: false },
    },
    emits: ['update:list'],
    setup(props, { emit }) {
        const id = layoutId++;
        const parentElementUid = inject('_wwElementUid', null);
        const layoutStyleScopes = useLayoutStyleScopeAttribute(() => parentElementUid);
        const parentElementComponentId = inject('_wwElementComponentId', null);
        const sectionId = inject('sectionId', null);
        const bindingContext = inject('bindingContext', null);

        const componentContent = inject('componentContent');
 
        const { rawProperty, property } = useParentContentProperty(toRef(props, 'path'));

        useRestoreContext({ path: toRef(props, 'path') });

        const isBound = computed(() => rawProperty.value && !!rawProperty.value.__wwtype);
        const boundData = computed(() => {
            if (!isBound.value) return null;
            if (!property.value) return null;

            if (Array.isArray(property.value)) {
                return property.value;
            }
            if (!property.value.data) {
                return null;
            }
            return Array.isArray(property.value.data) ? property.value.data : null;
        });
        const internalList = computed(() => {
            const { __wwtype, repeatable } = rawProperty.value || {};
            return (__wwtype ? repeatable : property.value) || [];
        });

        const paginationOptions = computed(() => {
            if (!isBound.value) return null;
            if (!property.value) return null;
            if (Array.isArray(property.value)) {
                return null;
            }
            if (!property.value.limit) return null;
            if (!property.value.total) return null;
            return property.value;
        });
        const offset = computed(() => {
            if (paginationOptions.value) return parseInt(paginationOptions.value.offset) || 0;
            return 0;
        });
        const length = computed(() => {
            if (!isBound.value) {
                return internalList.value.length;
            }
            if (paginationOptions.value) {
                if (!boundData.value) {
                    return 0;
                } else {
                    const maxIndex = Math.min(
                        offset.value + parseInt(wwLib.wwFormula.getValue(paginationOptions.value.limit)),
                        paginationOptions.value.total || 0
                    );
                    const length = Math.max(maxIndex - offset.value, 0);
                    return isNaN(length) ? 0 : length;
                }
            }
            return boundData.value ? boundData.value.length : 0;
        });

        let restrictedLength;
         /* wwFront:start */
        // eslint-disable-next-line vue/no-ref-as-operand
        restrictedLength = length;
        /* wwFront:end */

        // Fixed centered flex when the `direction` prop is set (component-level convenience layout, not
        // driven by element data → not covered by the style compiler → rendered inline). Front + editor.
        const layoutDomStyle = computed(() =>
            props.direction
                ? { flexDirection: props.direction, display: 'flex', justifyContent: 'center', alignItems: 'center' }
                : {}
        );

 
 
        return {
            layoutId: id,
            layoutDomStyle,
            layoutStyleScopes,
            parentElementUid,
            sectionId,
            rawProperty,
            property,
            bindingContext,
            isBound,
            boundData,
            length,
            internalList,
            offset,
            paginationOptions,
            componentContent,
            restrictedLength,
         };
    },
    computed: {
     },

    watch: {
     },
     methods: {
     },
};
</script>

<style lang="scss">
@layer ww-style-reset {
    /* Shared primitive defaults intentionally stay below coded component CSS. */
    .ww-layout {
        display: flex;
        pointer-events: initial;
        position: relative;
    }
}

 </style>

<style lang="scss" scoped>
 </style>
