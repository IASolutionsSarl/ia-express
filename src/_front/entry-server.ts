import { renderToString } from 'vue/server-renderer';
import {
    completeClientIslandServerRender,
    prepareClientIslandServerRender,
    type ClientIslandRenderResult,
} from './rendering/clientIslandContext';
import {
    createInitialEnvironment,
    installInitialEnvironment,
    type InitialEnvironment,
} from './rendering/initialEnvironment';

export async function render(
    url: string,
    clientIslandIds: string[] = []
): Promise<{
    appHtml: string;
    clientIslands: ClientIslandRenderResult;
    initialEnvironment: InitialEnvironment;
}> {
    const initialEnvironment = createInitialEnvironment();
    const restoreEnvironment = installInitialEnvironment(initialEnvironment);
    prepareClientIslandServerRender(clientIslandIds);
    try {
        const { app, setupApp } = await import('./main.js');
        await setupApp({ url });
        const appHtml = await renderToString(app);
        return {
            appHtml,
            clientIslands: completeClientIslandServerRender(),
            initialEnvironment,
        };
    } finally {
        restoreEnvironment();
    }
}
