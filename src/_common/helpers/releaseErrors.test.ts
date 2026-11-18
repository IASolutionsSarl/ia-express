// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createApp } from 'vue';
import Notification from '@/_manager/components/ui/wwNotification.vue';
import { getReleaseRefusalMessage } from './releaseErrors';

function renderNotification(text: string) {
    vi.stubGlobal('wwLib', { wwManagerLang: { getText: (text: string) => text } });
    const host = document.createElement('div');
    const app = createApp(Notification, { options: { text, close: vi.fn() } });
    app.component('wwEditorIcon', { template: '<span />' });
    app.mount(host);
    return { host, unmount: () => app.unmount() };
}

describe('release failure notifications', () => {
    it.each(['promote', 'rollback'] as const)('renders database values as text for %s', action => {
        const value = '<img src=x onerror="window.compromised=true">';
        const text = getReleaseRefusalMessage(
            { code: 'DATABASE_MIGRATION_FAILED', message: `invalid integer: ${value}` },
            { action }
        )!;
        const { host, unmount } = renderNotification(text);
        expect(host.querySelector('img')).toBeNull();
        expect(host.textContent).toContain(value);
        expect(host.textContent).not.toContain('publish to staging');
        expect(host.textContent).toContain(action === 'promote' ? 'promoting again' : 'restoring this version again');
        unmount();
    });

    it('limits SQL details before escaping them', () => {
        const text = getReleaseRefusalMessage(
            { code: 'DATABASE_MIGRATION_FAILED', message: 'x'.repeat(10000) },
            { action: 'promote' }
        )!;
        expect(text).toContain('x'.repeat(500) + '…');
        expect(text.length).toBeLessThan(700);
    });

    it.each(['NOT_FOUND', 'VERSION_NOT_PUBLISHED', 'BACKEND_ARTIFACT_NOT_FOUND', 'JOBS_ARTIFACT_NOT_FOUND'])(
        'escapes the restored version in %s',
        code => {
            const text = getReleaseRefusalMessage({ code }, { action: 'rollback', cacheVersion: '<img src=x>' })!;
            const { host, unmount } = renderNotification(text);
            expect(host.querySelector('img')).toBeNull();
            expect(host.textContent).toContain('<img src=x>');
            unmount();
        }
    );
});
