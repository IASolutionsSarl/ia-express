import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { build } from 'vite';
import { describe, expect, it } from 'vitest';
import { monacoDompurifyPlugin } from './vite.config.js';

const require = createRequire(import.meta.url);
const domSanitizePath = path.resolve(__dirname, 'node_modules/monaco-editor/esm/vs/base/browser/domSanitize.js');

describe('monacoDompurifyPlugin', () => {
    it('resolves the copy of DOMPurify vendored by monaco-editor to the dompurify package', async () => {
        const plugin = monacoDompurifyPlugin();
        const resolve = (id: string, importer: string) => Promise.resolve({ id: require.resolve(id, { paths: [importer] }) });

        const resolved = await plugin.resolveId.call({ resolve }, './dompurify/dompurify.js', domSanitizePath);

        expect(resolved?.id).toBe(require.resolve('dompurify', { paths: [domSanitizePath] }));
    });

    it('leaves every other import alone', () => {
        const plugin = monacoDompurifyPlugin();
        const context = { resolve: () => Promise.reject(new Error('must not resolve')) };

        expect(plugin.resolveId.call(context, './dompurify/dompurify.js', '/app/src/somewhere.js')).toBeNull();
        expect(plugin.resolveId.call(context, './other.js', domSanitizePath)).toBeNull();
        expect(plugin.resolveId.call(context, './dompurify/dompurify.js', undefined)).toBeNull();
    });

    it('bundles the patched dompurify into monaco instead of the vendored copy', async () => {
        const { version } = JSON.parse(readFileSync(path.resolve(__dirname, 'node_modules/dompurify/package.json'), 'utf8'));
        const output = await build({
            configFile: false,
            logLevel: 'silent',
            plugins: [monacoDompurifyPlugin()],
            build: { write: false, minify: false, lib: { entry: domSanitizePath, formats: ['es'] } },
        });
        const code = [output].flat().flatMap(result => ('output' in result ? result.output : [])).map(chunk => ('code' in chunk ? chunk.code : '')).join('\n');

        expect(code).toContain(`DOMPurify.version = "${version}"`);
        expect(code).not.toContain(`DOMPurify.version = '3.2.7'`);
    }, 60_000);
});
