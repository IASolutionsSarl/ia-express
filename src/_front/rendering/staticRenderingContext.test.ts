import { computed } from 'vue';
import { afterEach, describe, expect, it } from 'vitest';
import {
    activateStaticRendering,
    deactivateStaticRendering,
    isStaticRenderingActive,
    resolveStaticBinding,
} from './staticRenderingContext';

describe('Static Rendering Context', () => {
    afterEach(() => {
        deactivateStaticRendering();
    });

    it('keeps persisted literal values unchanged', () => {
        activateStaticRendering();

        expect(resolveStaticBinding('Static heading')).toBeUndefined();
    });

    it('uses a neutral value instead of evaluating formulas', () => {
        activateStaticRendering();

        expect(resolveStaticBinding({ __wwtype: 'f', code: "collections['articles'].data[0].title" })).toEqual({
            value: null,
        });
    });

    it.each([
        ['false', false],
        ['zero', 0],
        ['empty string', ''],
        ['null', null],
        ['array', ['first', 'second']],
        ['object', { visible: true }],
    ])('uses an explicit %s static formula value', (_label, staticValue) => {
        activateStaticRendering();

        expect(resolveStaticBinding({ __wwtype: 'f', code: 'variables.value', staticValue })).toEqual({
            value: staticValue,
        });
    });

    it('never treats a formula default value as its static projection', () => {
        activateStaticRendering();

        expect(
            resolveStaticBinding({ __wwtype: 'f', code: 'variables.value', defaultValue: 'legacy fallback' })
        ).toEqual({ value: null });
    });

    it('uses a neutral value for every other dynamic binding', () => {
        activateStaticRendering();

        expect(resolveStaticBinding({ __wwtype: 'js', code: 'return window.secret' })).toEqual({
            value: null,
        });
        expect(resolveStaticBinding({ __wwtype: 'd', data: ['dynamic'] })).toEqual({
            value: [],
        });
    });

    it('releases dynamic bindings during Runtime Activation', () => {
        activateStaticRendering();
        deactivateStaticRendering();

        expect(resolveStaticBinding({ __wwtype: 'f', code: 'variables.value' })).toBeUndefined();
        expect(
            resolveStaticBinding({ __wwtype: 'f', code: 'variables.value', staticValue: 'static' })
        ).toBeUndefined();
    });

    it('invalidates static computed bindings when Runtime Activation starts', () => {
        activateStaticRendering();
        const resolution = computed(() =>
            resolveStaticBinding({ __wwtype: 'f', code: "collections['articles'].data[0].title" })
        );

        expect(resolution.value).toEqual({
            value: null,
        });

        deactivateStaticRendering();

        expect(resolution.value).toBeUndefined();
    });

    it('keeps the normal runtime context inactive', () => {
        deactivateStaticRendering();
        let trackedDependencies = 0;
        const resolution = computed(
            () => resolveStaticBinding({ __wwtype: 'f', code: 'variables.value' }),
            {
                onTrack: () => trackedDependencies++,
            }
        );

        expect(isStaticRenderingActive()).toBe(false);
        expect(resolution.value).toBeUndefined();
        expect(trackedDependencies).toBe(0);
    });
});
