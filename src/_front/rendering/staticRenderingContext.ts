import { ref } from 'vue';
import { isStaticRenderMode, renderMode } from './renderMode';

type StaticBindingResolution = { value: unknown } | undefined;

let active = isStaticRenderMode(renderMode) ? ref(true) : null;
const staticCollectionBinding = { value: [] };
const staticValueBinding = { value: null };

export function activateStaticRendering(): void {
    if (active) return;
    active = ref(true);
}

export function deactivateStaticRendering(): void {
    if (!active) return;

    const previousActive = active;
    // Re-evaluated bindings must stop tracking the static context.
    active = null;
    previousActive.value = false;
}

export function isStaticRenderingActive(): boolean {
    return active?.value === true;
}

/**
 * Replaces dynamic bindings with deterministic neutral values while rendering
 * the static projection. SSR and the browser's initial hydration pass must
 * resolve these bindings identically; their real values are evaluated only
 * after static rendering is deactivated.
 */
export function resolveStaticBinding(rawValue: unknown): StaticBindingResolution {
    if (!active?.value || !isDynamicBinding(rawValue)) return;

    if (
        rawValue.__wwtype === 'f' &&
        Object.hasOwn(rawValue, 'staticValue') &&
        rawValue.staticValue !== undefined
    ) {
        return { value: rawValue.staticValue };
    }

    return rawValue.__wwtype === 'd' ? staticCollectionBinding : staticValueBinding;
}

function isDynamicBinding(value: unknown): value is {
    __wwtype: 'd' | 'f' | 'js';
    code?: unknown;
    staticValue?: unknown;
} {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    if (!Object.hasOwn(value, '__wwtype')) return false;

    const type = (value as { __wwtype?: unknown }).__wwtype;
    return type === 'd' || type === 'f' || type === 'js';
}
