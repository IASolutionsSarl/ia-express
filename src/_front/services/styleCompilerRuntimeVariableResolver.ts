import type { FormulaExecutionResult, FormulaExecutor } from '@/_common/helpers/formulaExecutor';
import {
    serializeRuntimeCssVariableValue,
    type StyleDynamicVariable,
    type StyleDynamicVariableCondition,
} from '@/_common/helpers/styleCompiler';
import { normalizeStyleRuntimeValue } from '@/_common/helpers/styleCompiler/valueNormalization';

type ResolveStyleCompilerRuntimeVariableOptions<TContext> = {
    variable: StyleDynamicVariable;
    context: TContext;
    executor: FormulaExecutor<TContext>;
    executionResults?: Map<unknown, FormulaExecutionResult>;
};

export type StyleCompilerRuntimeVariableResolution =
    | { status: 'value'; cssValue: string }
    | { status: 'empty' }
    | { status: 'inactive' }
    | { status: 'unresolved' };

/**
 * Resolves one runtime CSS variable and returns null for empty, inactive, or unresolved results.
 *
 * A shared execution cache lets related declarations reuse formula evaluations per Vue effect.
 */
export function resolveStyleCompilerRuntimeVariable<TContext>({
    ...options
}: ResolveStyleCompilerRuntimeVariableOptions<TContext>) {
    const resolution = resolveStyleCompilerRuntimeVariableResult(options);
    return resolution.status === 'value' ? resolution.cssValue : null;
}

/**
 * Distinguishes an intentionally empty runtime result from inactive or unresolved formulas.
 *
 * Unresolved formulas keep their static CSS fallback. Empty values and inactive conditions remain
 * distinct so the runtime writer can clear their generated declarations without evaluating values
 * whose conditions do not match.
 */
export function resolveStyleCompilerRuntimeVariableResult<TContext>({
    variable,
    context,
    executor,
    executionResults = new Map(),
}: ResolveStyleCompilerRuntimeVariableOptions<TContext>): StyleCompilerRuntimeVariableResolution {
    const conditions = Array.isArray(variable.condition)
        ? variable.condition
        : variable.condition
          ? [variable.condition]
          : [];
    for (const condition of conditions) {
        const conditionResult = executeFormula(condition.value, context, executor, executionResults);
        if (conditionResult.status !== 'resolved') return { status: 'unresolved' };
        if (!matchesCondition(conditionResult, condition)) return { status: 'inactive' };
    }

    const execution = executeFormula(variable.value, context, executor, executionResults);
    if (execution.status !== 'resolved') return { status: 'unresolved' };
    if (execution.value === undefined && variable.omitWhenUndefined) return { status: 'empty' };

    if (variable.kind === 'keyframes') {
        return typeof execution.value === 'string' && execution.value.trim()
            ? { status: 'value', cssValue: execution.value }
            : { status: 'empty' };
    }

    const cssValue = serializeVariableValue(variable, execution.value);
    if (cssValue) return { status: 'value', cssValue };

    const emptyGroupFallback = resolveEmptyGroupFallback(variable, context, executor, executionResults);
    return emptyGroupFallback ? { status: 'value', cssValue: emptyGroupFallback } : { status: 'empty' };
}

function serializeVariableValue(variable: StyleDynamicVariable, value: unknown) {
    return (
        serializeRuntimeCssVariableValue(variable.cssProperty, value, {
            valueNormalizer: variable.valueNormalizer,
        }) || null
    );
}

function resolveEmptyGroupFallback<TContext>(
    variable: StyleDynamicVariable,
    context: TContext,
    executor: FormulaExecutor<TContext>,
    executionResults: Map<unknown, FormulaExecutionResult>
) {
    const fallback = variable.fallbackWhenAllValuesEmpty;
    if (!fallback) return null;

    for (const value of fallback.values) {
        const result = executeFormula(value, context, executor, executionResults);
        if (result.status !== 'resolved') return null;

        const resolvedValue = value === variable.value ? serializeVariableValue(variable, result.value) : result.value;
        if (resolvedValue) return null;
    }

    return serializeVariableValue(variable, fallback.value);
}

function executeFormula<TContext>(
    formula: unknown,
    context: TContext,
    executor: FormulaExecutor<TContext>,
    executionResults: Map<unknown, FormulaExecutionResult>
) {
    const cachedResult = executionResults.get(formula);
    if (cachedResult) return cachedResult;

    const result = executor.execute(formula, context);
    executionResults.set(formula, result);
    return result;
}

function matchesCondition(result: FormulaExecutionResult, condition: StyleDynamicVariableCondition) {
    if (result.status !== 'resolved') return false;
    if ('truthy' in condition) return !!result.value;

    const value = condition.valueNormalizer
        ? normalizeStyleRuntimeValue(result.value, condition.valueNormalizer)
        : result.value;

    return typeof value === 'string' && condition.allowedValues.includes(value);
}
