import fs from 'node:fs/promises';
import { enrichRouteHtml } from './core.ts';
import type { Diagnostic } from './core.ts';

export const MAX_PRERENDERED_ROUTE_HTML_BYTES = 32 * 1024 * 1024;

type PrerenderedRouteHtmlResult = { ok: true; html: string } | { ok: false; diagnostic: Diagnostic };

export async function createPrerenderedRouteHtml(
    baselineFile: string,
    {
        appHtml,
        cssFiles = [],
        clientIslandIds = [],
    }: {
        appHtml: string;
        cssFiles?: string[];
        clientIslandIds?: string[];
    }
): Promise<PrerenderedRouteHtmlResult> {
    const baselineStats = await fs.stat(baselineFile);
    const appHtmlBytes = Buffer.byteLength(appHtml, 'utf8');
    if (baselineStats.size + appHtmlBytes > MAX_PRERENDERED_ROUTE_HTML_BYTES) {
        return createOversizedRouteResult();
    }

    const baselineHtml = await fs.readFile(baselineFile, 'utf8');
    const html = enrichRouteHtml(baselineHtml, { appHtml, cssFiles, clientIslandIds });
    if (Buffer.byteLength(html, 'utf8') > MAX_PRERENDERED_ROUTE_HTML_BYTES) {
        return createOversizedRouteResult();
    }

    return { ok: true, html };
}

function createOversizedRouteResult(): PrerenderedRouteHtmlResult {
    return {
        ok: false,
        diagnostic: {
            category: 'route-output-too-large',
            message: 'The complete pre-rendered route HTML exceeded its byte budget.',
        },
    };
}
