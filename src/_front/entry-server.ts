import { renderToString } from 'vue/server-renderer';
import { app, setupApp } from './main.js';
import {
    completeClientIslandServerRender,
    prepareClientIslandServerRender,
    type ClientIslandRenderResult,
} from './rendering/clientIslandContext';

export async function render(
    url: string,
    clientIslandIds: string[] = []
): Promise<{ appHtml: string; clientIslands: ClientIslandRenderResult }> {
    prepareClientIslandServerRender(clientIslandIds);
    await setupApp({ url });
    const appHtml = await renderToString(app);
    return {
        appHtml,
        clientIslands: completeClientIslandServerRender(),
    };
}
