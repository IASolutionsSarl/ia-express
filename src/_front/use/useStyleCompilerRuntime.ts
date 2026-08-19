import { effectScope, onBeforeUnmount, watchEffect } from 'vue';

import {
    createStyleCompiler,
    type StyleCompilerMode,
    type StyleReactivityRuntime,
} from '@/_common/helpers/styleCompiler';
import { createEditorStyleCompilerSources } from '@/_front/helpers/styleCompilerReader';
import { createReactiveCompileScope } from '@/_front/helpers/styleCompilerRuntimeScope';
import { createDomStyleSheetAdapter } from '@/_front/services/styleCompilerDomStyleSheet';

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
    const sources = createEditorStyleCompilerSources();
    const run = createStyleCompiler().compileStylesheet({
        scope: createReactiveCompileScope(sources.scope),
        reader: sources.reader,
        stylesheet: createDomStyleSheetAdapter(),
        runtime: vueStyleCompilerRuntime,
        mode,
        assetBaseUrl: import.meta.env.VITE_APP_CDN_URL,
    });

    onBeforeUnmount(() => {
        run.stop();
    });
}
