<template>
    <div class="ww-input-radio" :style="style" ww-responsive="ww-input-radio" :data-ww-radio-id="uniqueId">
        <div
            v-for="(option, index) in options"
            :key="`${wwElementState.name}-${uniqueId}-${option.label}`"
            class="ww-input-radio__container"
        >
            <wwLayoutItemContext v-if="option" :index="index" is-repeat>
                <input
                    :id="`${wwElementState.name}-${uniqueId}-${option.label}`"
                    :value="option.value"
                    :checked="option.value === value"
                    class="ww-input-radio__radio"
                    :class="{ editing: isEditing }"
                    type="radio"
                    :name="`${wwElementState.name}-${uniqueId}`"
                    :required="content.required"
                    :readonly="isEditing"
                    @input="handleManualInput($event)"
                />
                <component
                    :is="isEditing ? 'div' : 'label'"
                    :for="`${wwElementState.name}-${uniqueId}-${option.label}`"
                >
                    <wwElement v-bind="content.choicesElement" :ww-props="{ text: option.label }" />
                </component>
            </wwLayoutItemContext>
        </div>
    </div>
</template>

<script>
import { computed, ref } from 'vue';

export default {
    props: {
        content: { type: Object, required: true },
        wwElementState: { type: Object, required: true },
        uid: { type: String, required: true },
    },
    emits: ['trigger-event', 'update:content:effect', 'update:sidepanel-content'],
    setup(props) {
        const { value: variableValue, setValue } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'value',
            defaultValue: computed(() => (props.content.value === undefined ? '' : props.content.value)),
        });
        return { variableValue, setValue, uniqueId: ref(null) };
    },
    mounted() {
        this.uniqueId =
            this.$el.getAttribute('id') || this.$el.getAttribute('data-ww-radio-id') || wwLib.wwUtils.getUid();
    },
    computed: {
        isEditing() {
            // eslint-disable-next-line no-unreachable
            return false;
        },
        value() {
            if (!this.options.some(option => option.value === this.variableValue)) return null;
            return this.variableValue;
        },
        options() {
            if (!this.content.options) return [];
            let data = wwLib.wwCollection.getCollectionData(this.content.options) || [];
            if (data && !Array.isArray(data) && typeof data === 'object') {
                data = new Array(data);
            } else if ((data && !Array.isArray(data)) || typeof data !== 'object') {
                return [];
            }

            return data
                .filter(item => !!item)
                .map(item => {
                    if (typeof item !== 'object') return { label: item, value: item };
                    return {
                        label: wwLib.wwLang.getText(_.get(item, this.content.labelField || 'label') || ''),
                        value: _.get(item, this.content.valueField || 'value'),
                    };
                });
        },
        style() {
            return {
                flexDirection: this.content.direction,
                justifyContent: this.content.justifyContent,
                alignItems: this.content.alignItems,
                rowGap: this.content.rowGap,
                columnGap: this.content.columnGap,
                flexWrap:
                    this.content.direction === 'column'
                        ? 'nowrap'
                        : this.content.flexWrap === false
                        ? 'nowrap'
                        : 'wrap',
            };
        },
    },
    watch: {
        'content.value'(newValue) {
            newValue = `${newValue}`;
            if (newValue === this.value) return;
            this.setValue(newValue);
            this.$emit('trigger-event', { name: 'initValueChange', event: { value: newValue } });
        },
    },
    methods: {
        handleManualInput(event) {
            const value = event.target.value;
            if (value === this.value) return;
            this.setValue(value);
            this.$emit('trigger-event', { name: 'change', event: { domEvent: event, value } });
        },
    },
};
</script>

<style lang="scss" scoped>
.ww-input-radio {
    &__container {
        padding: 0.4rem 0;
        display: flex;
        flex-wrap: nowrap;
        align-items: center;
        position: relative;
    }
    &__radio {
        outline: none;
        margin-right: 0.4rem;
    }
}
</style>
