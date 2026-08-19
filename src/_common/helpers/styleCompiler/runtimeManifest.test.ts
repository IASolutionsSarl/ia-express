import { describe, expect, it } from 'vitest';

import type { StyleDynamicVariable } from './types';
import { decodeStyleRuntimeManifest, encodeStyleRuntimeManifest } from './runtimeManifest';

describe('style runtime manifest', () => {
    it('keeps the cross-repository wire format stable', () => {
        const variable = createVariable(0);

        expect(encodeStyleRuntimeManifest([variable])).toEqual([
            1,
            [
                [
                    '--ww-style-element-0-property-0',
                    'element-0',
                    'element:element-0',
                    0,
                    '.ww-element-element-0',
                    2,
                    0,
                    'property-0',
                    'default',
                    0,
                    { __wwtype: 'f', code: 'variables.value0' },
                    'property-0',
                    '.ww-element-element-0',
                    0,
                    '.ww-element-element-0',
                ],
            ],
        ]);
    });

    it('round-trips every runtime field through the compact tuple format', () => {
        const variables: StyleDynamicVariable[] = [
            {
                name: '--ww-style-card-width',
                surface: {
                    key: 'element-layout:card',
                    kind: 'element-layout',
                    selector: '.ww-element-card [data-ww-layout-style-scopes~="card"]',
                    runtimeScopeSelector: '.ww-element-card',
                    group: 'library',
                    libraryLayer: 'instance',
                },
                group: 'element',
                sourceUid: 'card',
                domain: 'style',
                property: 'width',
                state: '_wwHover_default',
                breakpoint: 'tablet',
                value: { __wwtype: 'f', code: 'variables.width' },
                cssProperty: 'width',
                selector: '.ww-element-card:hover [data-ww-layout-style-scopes~="card"]',
                outputKey: 'width',
                valueNormalizer: { type: 'component-size', fallbackValue: 'auto' },
                validationProperty: 'width',
                omitWhenUndefined: true,
                directDeclaration: true,
                condition: [{ value: { __wwtype: 'f', code: 'variables.visible' }, truthy: true }],
                runtimeFallback: {
                    type: 'when-empty',
                    value: { __wwtype: 'f', code: 'variables.span' },
                    valueNormalizer: { type: 'prefix-if-truthy', prefix: 'span ' },
                },
            },
            {
                name: '--ww-style-card-top',
                surface: {
                    key: 'element:card',
                    kind: 'element',
                    selector: '.ww-element-card',
                    group: 'element',
                },
                group: 'element',
                sourceUid: 'card',
                domain: 'style',
                property: 'top',
                state: 'default',
                breakpoint: 'default',
                value: { __wwtype: 'f', code: 'variables.top' },
                cssProperty: 'top',
                selector: '.ww-element-card',
                runtimeFallback: {
                    type: 'when-all-empty',
                    dependencies: [{ __wwtype: 'f', code: 'variables.right' }],
                    value: 0,
                },
            },
            {
                name: '--ww-style-card-animation',
                surface: {
                    key: 'element:card',
                    kind: 'element',
                    selector: '.ww-element-card',
                    group: 'element',
                },
                group: 'element',
                sourceUid: 'card',
                domain: 'content',
                property: 'animation',
                state: 'default',
                breakpoint: 'mobile',
                value: { __wwtype: 'f', code: 'variables.animation' },
                cssProperty: 'animation-name',
                selector: '.ww-element-card',
                kind: 'keyframes',
                keyframesName: 'ww-keyframes-card',
            },
        ];

        const manifest = encodeStyleRuntimeManifest(variables);
        expect(manifest[1][1][21]).toEqual({
            values: [variables[1].value, { __wwtype: 'f', code: 'variables.right' }],
            value: 0,
        });
        expect(decodeStyleRuntimeManifest(JSON.parse(JSON.stringify(manifest)))).toEqual(variables);
    });

    it('is smaller than serializing repeated variable objects directly', () => {
        const variables = Array.from({ length: 24 }, (_, index) => createVariable(index));
        const compactBytes = new TextEncoder().encode(JSON.stringify(encodeStyleRuntimeManifest(variables))).length;
        const objectBytes = new TextEncoder().encode(JSON.stringify(variables)).length;

        expect(compactBytes).toBeLessThan(objectBytes * 0.55);
    });

    it('rejects malformed and unsupported payloads for compatibility fallback', () => {
        expect(decodeStyleRuntimeManifest(undefined)).toBeNull();
        expect(decodeStyleRuntimeManifest([2, []])).toBeNull();
        expect(decodeStyleRuntimeManifest([1, [[99]]])).toBeNull();
        const invalidBreakpoint = JSON.parse(JSON.stringify(encodeStyleRuntimeManifest([createVariable(0)])));
        invalidBreakpoint[1][0][9] = 99;
        expect(decodeStyleRuntimeManifest(invalidBreakpoint)).toBeNull();
        const conflictingFallbacks = JSON.parse(
            JSON.stringify(
                encodeStyleRuntimeManifest([
                    {
                        ...createVariable(0),
                        runtimeFallback: {
                            type: 'when-empty',
                            value: { __wwtype: 'f', code: 'variables.span' },
                        },
                    },
                ])
            )
        );
        conflictingFallbacks[1][0][21] = {
            values: [{ __wwtype: 'f', code: 'variables.right' }],
            value: 0,
        };
        expect(decodeStyleRuntimeManifest(conflictingFallbacks)).toBeNull();
        expect(decodeStyleRuntimeManifest([1, []])).toEqual([]);
    });
});

function createVariable(index: number): StyleDynamicVariable {
    const sourceUid = `element-${Math.floor(index / 6)}`;
    const selector = `.ww-element-${sourceUid}`;

    return {
        name: `--ww-style-${sourceUid}-property-${index % 6}`,
        surface: {
            key: `element:${sourceUid}`,
            kind: 'element',
            selector,
            runtimeScopeSelector: selector,
            group: 'element',
        },
        group: 'element',
        sourceUid,
        domain: 'style',
        property: `property-${index % 6}`,
        state: 'default',
        breakpoint: 'default',
        value: { __wwtype: 'f', code: `variables.value${index}` },
        cssProperty: `property-${index % 6}`,
        selector,
    };
}
