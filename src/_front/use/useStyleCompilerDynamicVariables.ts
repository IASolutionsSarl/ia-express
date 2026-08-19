import { onScopeDispose, unref, watchEffect, type Ref } from 'vue';

import type { StyleSurfaceKind } from '@/_common/helpers/styleCompiler';
import { getMountedComponentId, WW_COMPONENT_ID_ATTRIBUTE } from '@/_front/services/componentIds';
import { styleFormulaExecutor } from '@/_front/services/styleFormulaExecutor';
import {
    createStyleCompilerRuntimeVariableRegistrationKey,
    isStyleCompilerRuntimeVariableValueAccepted,
    setStyleCompilerRuntimeClear,
    setStyleCompilerRuntimeVariable,
    setStyleCompilerRuntimeVariableClear,
} from '@/_front/services/styleCompilerRuntimeStyleSheet';
import { getStyleDynamicVariablesForSource } from '@/_front/services/styleCompilerRuntimeVariables';
import { resolveStyleCompilerRuntimeVariableResult } from '@/_front/services/styleCompilerRuntimeVariableResolver';

type RuntimeVariableTargetRefs = {
    element?: Ref<unknown>;
    sectionContainer?: Ref<unknown>;
    sectionElement?: Ref<unknown>;
};

type UseStyleCompilerDynamicVariablesOptions = {
    sourceUid: string | Ref<string | undefined>;
    context?: Record<string, unknown>;
    targets: RuntimeVariableTargetRefs;
};

type RuntimeStyleRegistration = {
    fingerprint: string;
    stop: () => void;
};

const warnedMissingComponentIdElements = new WeakSet<HTMLElement>();

/**
 * Writes dynamic/formula CSS variable values onto the rendered node that owns the matching CSS.
 */
export function useStyleCompilerDynamicVariables({
    sourceUid,
    context = {},
    targets,
}: UseStyleCompilerDynamicVariablesOptions) {
    const registrations = new Map<string, RuntimeStyleRegistration>();

    watchEffect(() => {
        const seenRegistrationKeys = new Set<string>();
        const variables = getStyleDynamicVariablesForSource(sourceUid);
        const executionResults = new Map();

        for (const variable of variables) {
            const element = resolveVariableTarget(variable.surface.kind, targets);
            if (!element) continue;

            const componentId = getRuntimeComponentId(element);
            if (!componentId) continue;

            const registrationKey = createStyleCompilerRuntimeVariableRegistrationKey(componentId, variable);
            seenRegistrationKeys.add(registrationKey);

            const resolution = resolveStyleCompilerRuntimeVariableResult({
                variable,
                context,
                executor: styleFormulaExecutor,
                executionResults,
            });
            if (resolution.status === 'empty') {
                replaceRuntimeStyleRegistration(registrations, registrationKey, 'empty', () =>
                    setStyleCompilerRuntimeClear({ componentId, variable })
                );
                continue;
            }
            if (resolution.status === 'inactive') {
                replaceRuntimeStyleRegistration(registrations, registrationKey, 'inactive', () =>
                    setStyleCompilerRuntimeVariableClear({ componentId, variable })
                );
                continue;
            }
            if (resolution.status !== 'value') {
                removeRuntimeStyleRegistration(registrations, registrationKey);
                continue;
            }
            const fingerprint = `value\u001f${resolution.cssValue}`;
            if (registrations.get(registrationKey)?.fingerprint === fingerprint) continue;
            if (!isStyleCompilerRuntimeVariableValueAccepted(variable, resolution.cssValue)) continue;

            replaceRuntimeStyleRegistration(
                registrations,
                registrationKey,
                fingerprint,
                () => setStyleCompilerRuntimeVariable({ componentId, variable, cssValue: resolution.cssValue })
            );
        }

        for (const registrationKey of registrations.keys()) {
            if (!seenRegistrationKeys.has(registrationKey)) {
                removeRuntimeStyleRegistration(registrations, registrationKey);
            }
        }
    });

    onScopeDispose(() => {
        for (const registration of registrations.values()) {
            registration.stop();
        }
        registrations.clear();
    });
}

function replaceRuntimeStyleRegistration(
    registrations: Map<string, RuntimeStyleRegistration>,
    registrationKey: string,
    fingerprint: string,
    create: () => () => void
) {
    const current = registrations.get(registrationKey);
    if (current?.fingerprint === fingerprint) return;

    current?.stop();
    registrations.set(registrationKey, { fingerprint, stop: create() });
}

function removeRuntimeStyleRegistration(
    registrations: Map<string, RuntimeStyleRegistration>,
    registrationKey: string
) {
    const registration = registrations.get(registrationKey);
    if (!registration) return;

    registration.stop();
    registrations.delete(registrationKey);
}

function resolveVariableTarget(kind: StyleSurfaceKind, targets: RuntimeVariableTargetRefs) {
    if (kind === 'section-container') return toHtmlElement(targets.sectionContainer);
    if (kind === 'section-element' || kind === 'section-layout') return toHtmlElement(targets.sectionElement);

    return toHtmlElement(targets.element);
}

function toHtmlElement(refValue: Ref<unknown> | undefined): HTMLElement | null {
    const value = unref(unref(refValue) as Ref<unknown> | unknown);
    if (!value) return null;
    if (isHtmlElement(value)) return value;

    const maybeComponent = value as { $el?: unknown };
    return isHtmlElement(maybeComponent.$el) ? maybeComponent.$el : null;
}

function isHtmlElement(value: unknown): value is HTMLElement {
    return !!value && typeof value === 'object' && (value as Node).nodeType === 1 && 'style' in value;
}

function getRuntimeComponentId(element: HTMLElement) {
    const componentId = getMountedComponentId(element);
    if (componentId) return componentId;

    if (!warnedMissingComponentIdElements.has(element)) {
        warnedMissingComponentIdElements.add(element);
        wwLib.wwLog.warn(`[style-compiler] missing ${WW_COMPONENT_ID_ATTRIBUTE} on runtime CSS variable target`, {
            element,
        });
    }

    return null;
}
