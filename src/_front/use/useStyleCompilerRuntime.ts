import { effectScope, onBeforeUnmount, watch, watchEffect } from 'vue';

import {
    createStyleCompiler,
    decodeStyleRuntimeManifest,
    type StyleCompilerMode,
    type StyleReactivityRuntime,
} from '@/_common/helpers/styleCompiler';
import { createEditorStyleCompilerSources } from '@/_front/helpers/styleCompilerReader';
import { createReactiveCompileScope } from '@/_front/helpers/styleCompilerRuntimeScope';
import { createDomStyleSheetAdapter } from '@/_front/services/styleCompilerDomStyleSheet';
import { registerStyleDynamicVariables } from '@/_front/services/styleCompilerRuntimeVariables';

const vueStyleCompilerRuntime: StyleReactivityRuntime = {
    createScope() {
        return effectScope();
    },
    effect(callback) {
        return watchEffect(callback);
    },
};

/**
 * Mounts the shared style compiler into the editor/front document.
 */
export function usePageStyleCompilerRuntime(mode: Extract<StyleCompilerMode, 'editor' | 'runtime'> = 'editor') {
    if (mode === 'runtime') {
        usePublishedPageStyleRuntime();
        return;
    }

    const stop = mountStyleCompiler(mode);
    onBeforeUnmount(stop);
}

function usePublishedPageStyleRuntime() {
    let stopCurrentRuntime: () => void = () => {};
    const stopManifestWatch = watch(
        () => {
            const page = wwLib.$store.getters['websiteData/getPage'];
            return [page?.id, page?._sm] as const;
        },
        ([, manifest]) => {
            stopCurrentRuntime();
            const variables = decodeStyleRuntimeManifest(manifest);
            stopCurrentRuntime = variables ? registerStyleDynamicVariables(variables) : mountStyleCompiler('runtime');
        },
        { immediate: true }
    );

    onBeforeUnmount(() => {
        stopManifestWatch();
        stopCurrentRuntime();
    });
}

function mountStyleCompiler(mode: Extract<StyleCompilerMode, 'editor' | 'runtime'>) {
    const sources = createEditorStyleCompilerSources();
    const run = createStyleCompiler().compileStylesheet({
        scope: createReactiveCompileScope(sources.scope),
        reader: sources.reader,
        stylesheet: createDomStyleSheetAdapter(),
        runtime: vueStyleCompilerRuntime,
        mode,
        assetBaseUrl: import.meta.env.VITE_APP_CDN_URL,
    });

    return run.stop;
}
