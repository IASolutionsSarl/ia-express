import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { createRenderer, h, nextTick } from 'vue';
import configuration from '../ww-config.js';

// Load the real setup without compiling the template: the action and exposed
// variable are registered by setup, while the tiny renderer supplies a host.
const filename = new URL('../src/wwElement.vue', import.meta.url);
const source = await readFile(filename, 'utf8');
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1];
const fromComponent = createRequire(filename);
const linkedScript = script.replace(
    /from '([^']+)'/g,
    (_, specifier) => `from ${JSON.stringify(pathToFileURL(fromComponent.resolve(specifier)).href)}`
);
const component = (await import(`data:text/javascript;base64,${Buffer.from(linkedScript).toString('base64')}`)).default;

test('the configured action and local-context method update the real exposed form variable and submit', async () => {
    const events = [];
    let exposed;
    let methods;
    globalThis.wwLib = {
        wwEditorHelper: { EDIT_MODES: { EDITION: 'EDITION' } },
        wwUtils: { getLengthUnit: () => [0] },
        wwVariable: {
            useComponentVariable: () => ({
                setValue: value => {
                    exposed = value;
                },
            }),
        },
        wwElement: {
            useRegisterElementLocalContext: (_name, _data, value) => {
                methods = value;
            },
        },
        logStore: { verbose() {}, warning() {}, info() {}, error() {} },
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
    const app = renderer.createApp(
        { ...component, render: () => h('form') },
        {
            content: { validation: 'submit', debounceDelay: 0 },
            wwElementState: { uid: 'form-test', name: 'Test form' },
            wwEditorState: { editMode: 'PREVIEW', isSelected: false },
            onTriggerEvent: event => events.push(event.name),
        }
    );
    try {
        const form = app.mount({});
        const action = configuration.actions.find(action => action.action === 'updateFormData');
        assert.ok(action);
        assert.equal(action.args[0].name, 'formData');
        form[action.action]({ customDate: '2026-11-10', guests: 0, newsletter: false });
        await nextTick();
        assert.deepEqual(JSON.parse(JSON.stringify(exposed.formData)), {
            customDate: '2026-11-10',
            guests: 0,
            newsletter: false,
        });

        methods.updateFormData.method({ customDate: '2026-11-11' });
        await nextTick();
        assert.equal(exposed.formData.customDate, '2026-11-11');
        assert.equal(exposed.formData.newsletter, false);
        await form.handleSubmit({ type: 'submit' });
        assert.equal(events.at(-1), 'submit');

        form.resetForm({ customDate: 'reset' });
        await nextTick();
        assert.equal(exposed.formData.customDate, 'reset');
        assert.equal(exposed.formData.guests, 0);
    } finally {
        app.unmount();
        delete globalThis.wwLib;
    }
});
