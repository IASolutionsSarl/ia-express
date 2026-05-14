import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import autoprefixer from 'autoprefixer';
import path from 'path';
import fs from 'fs';
import { parseEnv } from 'node:util';
import handlebars from 'handlebars';

const pages = {"27a42d33-e3a4-4d7e-b967-3c5949c76e87-en":{"outputDir":"./compte","lang":"en","title":"","cacheVersion":44,"meta":[{"name":"twitter:card","content":"summary"},{"property":"og:type","content":"website"},{"name":"robots","content":"noindex, nofollow"}],"scripts":{"head":"<style>\r\n@keyframes blink {\r\n  0%, 100% { opacity: 1; }\r\n  50% { opacity: 0.2; }\r\n}\r\n.recording {\r\n  animation: blink 1s infinite;\r\n}\r\n</style>\n","body":"\n"},"baseTag":{"href":"/","target":"_self"},"alternateLinks":[{"rel":"alternate","hreflang":"x-default","href":"https://7f56aeaa-5dfc-47e6-8a64-3206717702d1.weweb-preview.io/compte/"},{"rel":"alternate","hreflang":"en","href":"https://7f56aeaa-5dfc-47e6-8a64-3206717702d1.weweb-preview.io/compte/"}]},"f56bf691-aac9-4bdc-88f4-52ee0e94eaf7-en":{"outputDir":"./","lang":"en","title":"","cacheVersion":44,"meta":[{"name":"twitter:card","content":"summary"},{"property":"og:type","content":"website"},{"name":"robots","content":"noindex, nofollow"}],"scripts":{"head":"<style>\r\n@keyframes blink {\r\n  0%, 100% { opacity: 1; }\r\n  50% { opacity: 0.2; }\r\n}\r\n.recording {\r\n  animation: blink 1s infinite;\r\n}\r\n</style>\n","body":"\n"},"baseTag":{"href":"/","target":"_self"},"alternateLinks":[{"rel":"alternate","hreflang":"x-default","href":"https://7f56aeaa-5dfc-47e6-8a64-3206717702d1.weweb-preview.io/"},{"rel":"alternate","hreflang":"en","href":"https://7f56aeaa-5dfc-47e6-8a64-3206717702d1.weweb-preview.io/"}]},"4c887791-6898-410d-a516-fe14d6ab3af4-en":{"outputDir":"./tutoriels","lang":"en","title":"","cacheVersion":44,"meta":[{"name":"twitter:card","content":"summary"},{"property":"og:type","content":"website"},{"name":"robots","content":"noindex, nofollow"}],"scripts":{"head":"<style>\r\n@keyframes blink {\r\n  0%, 100% { opacity: 1; }\r\n  50% { opacity: 0.2; }\r\n}\r\n.recording {\r\n  animation: blink 1s infinite;\r\n}\r\n</style>\n","body":"\n"},"baseTag":{"href":"/","target":"_self"},"alternateLinks":[{"rel":"alternate","hreflang":"x-default","href":"https://7f56aeaa-5dfc-47e6-8a64-3206717702d1.weweb-preview.io/tutoriels/"},{"rel":"alternate","hreflang":"en","href":"https://7f56aeaa-5dfc-47e6-8a64-3206717702d1.weweb-preview.io/tutoriels/"}]},"7bad431a-58cc-4b48-9df9-d18e63435ff1-en":{"outputDir":"./swissnote","lang":"en","title":"","cacheVersion":44,"meta":[{"name":"twitter:card","content":"summary"},{"property":"og:type","content":"website"},{"name":"robots","content":"noindex, nofollow"}],"scripts":{"head":"<style>\r\n@keyframes blink {\r\n  0%, 100% { opacity: 1; }\r\n  50% { opacity: 0.2; }\r\n}\r\n.recording {\r\n  animation: blink 1s infinite;\r\n}\r\n</style>\n","body":"\n"},"baseTag":{"href":"/","target":"_self"},"alternateLinks":[{"rel":"alternate","hreflang":"x-default","href":"https://7f56aeaa-5dfc-47e6-8a64-3206717702d1.weweb-preview.io/swissnote/"},{"rel":"alternate","hreflang":"en","href":"https://7f56aeaa-5dfc-47e6-8a64-3206717702d1.weweb-preview.io/swissnote/"}]},"3567f283-8672-42f5-8746-decb8bfe3511-en":{"outputDir":"./chat","lang":"en","title":"","cacheVersion":44,"meta":[{"name":"twitter:card","content":"summary"},{"property":"og:type","content":"website"},{"name":"robots","content":"noindex, nofollow"}],"scripts":{"head":"<style>\r\n@keyframes blink {\r\n  0%, 100% { opacity: 1; }\r\n  50% { opacity: 0.2; }\r\n}\r\n.recording {\r\n  animation: blink 1s infinite;\r\n}\r\n</style>\n","body":"\n"},"baseTag":{"href":"/","target":"_self"},"alternateLinks":[{"rel":"alternate","hreflang":"x-default","href":"https://7f56aeaa-5dfc-47e6-8a64-3206717702d1.weweb-preview.io/chat/"},{"rel":"alternate","hreflang":"en","href":"https://7f56aeaa-5dfc-47e6-8a64-3206717702d1.weweb-preview.io/chat/"}]},"87f6f9cc-4194-49ed-b40f-79399090ebaa-en":{"outputDir":"./assistants","lang":"en","title":"","cacheVersion":44,"meta":[{"name":"twitter:card","content":"summary"},{"property":"og:type","content":"website"},{"name":"robots","content":"noindex, nofollow"}],"scripts":{"head":"<style>\r\n@keyframes blink {\r\n  0%, 100% { opacity: 1; }\r\n  50% { opacity: 0.2; }\r\n}\r\n.recording {\r\n  animation: blink 1s infinite;\r\n}\r\n</style>\n","body":"\n"},"baseTag":{"href":"/","target":"_self"},"alternateLinks":[{"rel":"alternate","hreflang":"x-default","href":"https://7f56aeaa-5dfc-47e6-8a64-3206717702d1.weweb-preview.io/assistants/"},{"rel":"alternate","hreflang":"en","href":"https://7f56aeaa-5dfc-47e6-8a64-3206717702d1.weweb-preview.io/assistants/"}]},"b088d4cd-7121-4c2e-a86d-06a9f39b7ffc-en":{"outputDir":"./dashboard","lang":"en","title":"","cacheVersion":44,"meta":[{"name":"twitter:card","content":"summary"},{"property":"og:type","content":"website"},{"name":"robots","content":"noindex, nofollow"}],"scripts":{"head":"<style>\r\n@keyframes blink {\r\n  0%, 100% { opacity: 1; }\r\n  50% { opacity: 0.2; }\r\n}\r\n.recording {\r\n  animation: blink 1s infinite;\r\n}\r\n</style>\n","body":"\n"},"baseTag":{"href":"/","target":"_self"},"alternateLinks":[{"rel":"alternate","hreflang":"x-default","href":"https://7f56aeaa-5dfc-47e6-8a64-3206717702d1.weweb-preview.io/dashboard/"},{"rel":"alternate","hreflang":"en","href":"https://7f56aeaa-5dfc-47e6-8a64-3206717702d1.weweb-preview.io/dashboard/"}]},"c24daf7e-a905-4f50-b91a-d2ba76791f5b-en":{"outputDir":"./login","lang":"en","title":"","cacheVersion":44,"meta":[{"name":"twitter:card","content":"summary"},{"property":"og:type","content":"website"},{"name":"robots","content":"index, follow"}],"scripts":{"head":"<style>\r\n@keyframes blink {\r\n  0%, 100% { opacity: 1; }\r\n  50% { opacity: 0.2; }\r\n}\r\n.recording {\r\n  animation: blink 1s infinite;\r\n}\r\n</style>\n","body":"\n"},"baseTag":{"href":"/","target":"_self"},"alternateLinks":[{"rel":"alternate","hreflang":"x-default","href":"https://7f56aeaa-5dfc-47e6-8a64-3206717702d1.weweb-preview.io/login/"},{"rel":"alternate","hreflang":"en","href":"https://7f56aeaa-5dfc-47e6-8a64-3206717702d1.weweb-preview.io/login/"}]}};

// Read the main HTML template
const template = fs.readFileSync(path.resolve(__dirname, 'template.html'), 'utf-8');
const compiledTemplate = handlebars.compile(template);

// Generate an HTML file for each page with its metadata
Object.values(pages).forEach(pageConfig => {
    // Compile the template with page metadata
    const html = compiledTemplate({
        title: pageConfig.title,
        lang: pageConfig.lang,
        meta: pageConfig.meta,
        structuredData: pageConfig.structuredData || null,
        scripts: {
            head: pageConfig.scripts.head,
            body: pageConfig.scripts.body,
        },
        alternateLinks: pageConfig.alternateLinks,
        cacheVersion: pageConfig.cacheVersion,
        baseTag: pageConfig.baseTag,
    });

    // Save output html for each page
    if (!fs.existsSync(pageConfig.outputDir)) {
        fs.mkdirSync(pageConfig.outputDir, { recursive: true });
    }
    fs.writeFileSync(`${pageConfig.outputDir}/index.html`, html);
});

const rolldownOptionsInput = {};
for (const pageName in pages) {
    rolldownOptionsInput[pageName] = path.resolve(__dirname, pages[pageName].outputDir, 'index.html');
}

function getFrontEnvironmentValues(root, mode) {
    const filePath = path.resolve(root, `.env.${mode}`);
    if (!fs.existsSync(filePath)) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(parseEnv(fs.readFileSync(filePath, 'utf8'))).filter(([key]) => !key.startsWith('VITE_'))
    );
}

export default defineConfig(({ mode }) => {
    return {
        plugins: [vue()],
        base: "/",
        define: {
            global: 'globalThis',
            __VUE_PROD_DEVTOOLS__: mode === 'development',
            __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: mode === 'development',
            __WW_FRONT_ENV_VARIABLES__: JSON.stringify({
                staging: getFrontEnvironmentValues(__dirname, 'staging'),
                production: getFrontEnvironmentValues(__dirname, 'production'),
            }),
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        css: {
            preprocessorOptions: {
                scss: {
                    api: 'modern-compiler',
                },
            },
            postcss: {
                plugins: [autoprefixer],
            },
        },
        server: {
            port: 8080,
        },
        build: {
            chunkSizeWarningLimit: 10000,
            rolldownOptions: {
                input: rolldownOptionsInput,
                onwarn: (entry, next) => {
                    if (entry.loc?.file && /js$/.test(entry.loc.file) && /Use of eval in/.test(entry.message)) return;
                    if (/Use of direct `eval`/.test(entry.message)) return;
                    return next(entry);
                },
            },
        },
    };
});
