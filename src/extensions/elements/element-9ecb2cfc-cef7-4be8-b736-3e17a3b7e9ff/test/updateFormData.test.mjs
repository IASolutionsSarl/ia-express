import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { createRenderer, h, inject, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useFormInputs } from '../src/composables/useFormInputs.js';

const applications = [];
afterEach(() => {
    for (const application of applications.splice(0)) application.unmount();
});

function formFixture({ mounted = true } = {}) {
    let inputs;
    const showNative = ref(mounted);
    const nativeValue = ref('initial@example.com');
    const updateNativeValue = mock.fn(value => {
        nativeValue.value = value;
    });
    const nativeInput = {
        setup() {
            const register = inject('_wwForm:registerInput');
            const update = inject('_wwForm:updateInput');
            const unregister = inject('_wwForm:unregisterInput');
            register('native-email', {
                email: {
                    value: nativeValue.value,
                    initialValue: nativeValue.value,
                    initialIsValid: true,
                    isValid: true,
                    forceValidateField: () => !!nativeValue.value,
                    updateValue: updateNativeValue,
                },
            });
            watch(nativeValue, value =>
                update('native-email', input => {
                    input.email.value = value;
                })
            );
            onBeforeUnmount(() => unregister('native-email'));
            return () => h('input');
        },
    };
    const renderer = createRenderer({
        createElement: () => ({}),
        createText: () => ({}),
        createComment: () => ({}),
        insert() {},
        remove() {},
        setText() {},
        setElementText() {},
        patchProp() {},
        parentNode: () => null,
        nextSibling: () => null,
    });
    const application = renderer.createApp({
        setup() {
            inputs = useFormInputs({
                updateInputValidity() {},
                removeInputValidity() {},
                validationType: ref('submit'),
            });
            return () => (showNative.value ? h(nativeInput) : null);
        },
    });
    application.mount({});
    applications.push(application);
    return { inputs, nativeValue, updateNativeValue, showNative };
}

test('custom values remain in the form registry when a native field changes', async () => {
    const { inputs, nativeValue } = formFixture();
    inputs.setFormData({ customDate: '2026-10-26' });
    nativeValue.value = 'updated@example.com';
    await nextTick();
    assert.equal(inputs.formInputs.value.customDate.value, '2026-10-26');
    assert.equal(inputs.formInputs.value.email.value, 'updated@example.com');
    assert.equal(inputs.forceValidateAllFields().isValid, true);
});

test('updating an existing field synchronizes its real input and preserves validation', async () => {
    const { inputs, nativeValue, updateNativeValue } = formFixture();
    inputs.setFormData({ email: '' });
    await nextTick();
    assert.equal(nativeValue.value, '');
    assert.equal(updateNativeValue.mock.calls.length, 1);
    assert.equal(inputs.formInputs.value.email.value, '');
    assert.equal(inputs.forceValidateAllFields().isValid, false);
});

test('updates merge custom fields without dropping existing native or custom data', () => {
    const { inputs } = formFixture();
    inputs.setFormData({ first: 'one', second: 'two' });
    inputs.setFormData({ first: 'changed', third: 'three' });
    assert.equal(inputs.formInputs.value.first.value, 'changed');
    assert.equal(inputs.formInputs.value.second.value, 'two');
    assert.equal(inputs.formInputs.value.third.value, 'three');
    assert.equal(inputs.formInputs.value.email.value, 'initial@example.com');
});

test('false, zero and null remain explicit values', () => {
    const { inputs } = formFixture();
    inputs.setFormData({ enabled: false, count: 0, optional: null });
    assert.equal(inputs.formInputs.value.enabled.value, false);
    assert.equal(inputs.formInputs.value.count.value, 0);
    assert.equal(inputs.formInputs.value.optional.value, null);
});

test('reset handles custom fields and restores registered input initial values', async () => {
    const { inputs, nativeValue } = formFixture();
    inputs.setFormData({ email: 'changed@example.com', custom: 'value' });
    inputs.resetInputs({ custom: 'reset value' });
    await nextTick();
    assert.equal(nativeValue.value, 'initial@example.com');
    assert.equal(inputs.formInputs.value.email.value, 'initial@example.com');
    assert.equal(inputs.formInputs.value.custom.value, 'reset value');
});

test('invalid action input is rejected before changing the form', () => {
    const { inputs } = formFixture();
    assert.equal(typeof inputs.setFormData, 'function');
    for (const value of [null, undefined, 'text', 12, [], new Date(), new (class Custom {})()]) {
        assert.throws(() => inputs.setFormData(value), TypeError);
    }
    assert.deepEqual(Object.keys(inputs.formInputs.value), ['email']);
});

test('plain objects from another window realm and null-prototype objects are accepted', () => {
    const { inputs } = formFixture();
    inputs.setFormData(runInNewContext('({ customDate: "2026-11-10", count: 0, enabled: false })'));
    inputs.setFormData(Object.assign(Object.create(null), { optional: null }));
    assert.equal(inputs.formInputs.value.customDate.value, '2026-11-10');
    assert.equal(inputs.formInputs.value.count.value, 0);
    assert.equal(inputs.formInputs.value.enabled.value, false);
    assert.equal(inputs.formInputs.value.optional.value, null);
});

test('a native input takes ownership of a prefill when it mounts, without a stale shadow on unmount', async () => {
    const { inputs, nativeValue, showNative } = formFixture({ mounted: false });
    inputs.setFormData({ email: 'prefilled@example.com' });
    assert.ok(inputs.inputsMap.value['form-data:email']);

    showNative.value = true;
    await nextTick();
    assert.equal(nativeValue.value, 'prefilled@example.com');
    assert.equal(inputs.formInputs.value.email.value, 'prefilled@example.com');
    assert.equal(inputs.inputsMap.value['form-data:email'], undefined);
    assert.equal(inputs.forceValidateAllFields().isValid, true);

    inputs.resetInputs();
    await nextTick();
    assert.equal(nativeValue.value, 'initial@example.com');
    showNative.value = false;
    await nextTick();
    assert.equal(inputs.formInputs.value.email, undefined);
});

test('unsafe property names are rejected before any field is applied', () => {
    const { inputs } = formFixture();
    assert.equal(typeof inputs.setFormData, 'function');
    assert.throws(() => inputs.setFormData(JSON.parse('{"safe":"value","__proto__":{"polluted":true}}')), TypeError);
    assert.deepEqual(Object.keys(inputs.formInputs.value), ['email']);
    assert.equal({}.polluted, undefined);
});
