import { createSSRApp, defineComponent, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { describe, expect, it } from 'vitest';

import {
    mergeLayoutStyleScopeUids,
    provideLibraryComponentLayoutStyleScope,
    resetLibraryComponentLayoutStyleScopes,
    useLayoutStyleScopeAttribute,
} from './useLayoutStyleScopes';

describe('useLayoutStyleScopes', () => {
    it('preserves scope order while removing empty and duplicate uids', () => {
        expect(mergeLayoutStyleScopeUids(['root', null], ['instance', 'root', undefined])).toEqual([
            'root',
            'instance',
        ]);
    });

    it('carries renderless library scopes to the root layout and resets them for child elements', async () => {
        const LibraryScope = defineComponent({
            props: {
                uid: { type: String, required: true },
            },
            setup(props, { slots }) {
                provideLibraryComponentLayoutStyleScope(() => props.uid);
                return () => slots.default?.();
            },
        });
        const Layout = defineComponent({
            props: {
                ownerUid: { type: String, required: true },
            },
            setup(props, { slots }) {
                const scopes = useLayoutStyleScopeAttribute(() => props.ownerUid);
                return () => h('div', { 'data-layout-scopes': scopes.value }, slots.default?.());
            },
        });
        const ElementBoundary = defineComponent({
            setup(_, { slots }) {
                resetLibraryComponentLayoutStyleScopes();
                return () => slots.default?.();
            },
        });
        const app = createSSRApp({
            render() {
                return h(LibraryScope, { uid: 'page-instance' }, () => {
                    return h(LibraryScope, { uid: 'nested-library-root' }, () => {
                        return h(Layout, { ownerUid: 'coded-component-root' }, () => [
                            h(Layout, { ownerUid: 'coded-component-root' }),
                            h(ElementBoundary, () =>
                                h(LibraryScope, { uid: 'child-instance' }, () =>
                                    h(Layout, { ownerUid: 'child-root' })
                                )
                            ),
                        ]);
                    });
                });
            },
        });

        const html = await renderToString(app);

        expect(html).toContain('data-layout-scopes="coded-component-root page-instance nested-library-root"');
        expect(html.match(/data-layout-scopes="coded-component-root page-instance nested-library-root"/g)).toHaveLength(
            2
        );
        expect(html).toContain('data-layout-scopes="child-root child-instance"');
        expect(html).not.toContain('data-layout-scopes="child-root page-instance');
    });
});
