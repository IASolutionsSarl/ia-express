import { JSDOM } from 'jsdom';
import { installNodeNetworkGuard } from './nodeNetworkGuard.ts';

export function createNetworklessDom(html: string, url: string) {
    const dom = new JSDOM(html, {
        url,
        runScripts: 'outside-only',
        resources: undefined,
        pretendToBeVisual: true,
    });
    const restoreNodeNetwork = installNodeNetworkGuard();
    const { window } = dom;

    window.matchMedia = query => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent() {
            return false;
        },
    });
    window.scrollTo = () => {};
    window.HTMLElement.prototype.scrollIntoView = () => {};

    const blockedNetwork = (api: string): never => {
        throw new Error(`Network access is disabled during static rendering (${api})`);
    };
    window.fetch = (() => blockedNetwork('fetch')) as typeof window.fetch;
    window.XMLHttpRequest = class NetworklessXmlHttpRequest {
        open() {
            blockedNetwork('XMLHttpRequest');
        }
    } as unknown as typeof window.XMLHttpRequest;
    window.WebSocket = class NetworklessWebSocket {
        constructor() {
            blockedNetwork('WebSocket');
        }
    } as unknown as typeof window.WebSocket;

    const globals: Record<string, unknown> = {
        window,
        document: window.document,
        navigator: window.navigator,
        location: window.location,
        history: window.history,
        localStorage: window.localStorage,
        sessionStorage: window.sessionStorage,
        Node: window.Node,
        Element: window.Element,
        HTMLElement: window.HTMLElement,
        SVGElement: window.SVGElement,
        File: window.File,
        FileList: window.FileList,
        Blob: window.Blob,
        FormData: window.FormData,
        DOMParser: window.DOMParser,
        CustomEvent: window.CustomEvent,
        Event: window.Event,
        EventTarget: window.EventTarget,
        MutationObserver: window.MutationObserver,
        getComputedStyle: window.getComputedStyle.bind(window),
        requestAnimationFrame: window.requestAnimationFrame.bind(window),
        cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
        fetch: window.fetch,
        XMLHttpRequest: window.XMLHttpRequest,
        WebSocket: window.WebSocket,
    };

    for (const [name, value] of Object.entries(globals)) {
        Object.defineProperty(globalThis, name, {
            configurable: true,
            writable: true,
            value,
        });
    }

    return {
        dom,
        dispose() {
            window.close();
            for (const name of Object.keys(globals)) {
                delete (globalThis as unknown as Record<string, unknown>)[name];
            }
            restoreNodeNetwork();
        },
    };
}
