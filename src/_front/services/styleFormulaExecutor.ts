import { getValue } from '@/_common/helpers/code/customCode.js';
import type { FormulaExecutor } from '@/_common/helpers/formulaExecutor';

/**
 * Browser implementation of the generic formula executor used by runtime style variables.
 *
 * `getValue` keeps the complete WeWeb formula context in the browser. Publisher fallback
 * evaluation uses a separate restricted interpreter and never imports this adapter.
 */
export const styleFormulaExecutor: FormulaExecutor<Record<string, unknown>> = {
    execute(formula, context) {
        try {
            return { status: 'resolved', value: getValue(formula, context) };
        } catch (error) {
            return { status: 'error', error };
        }
    },
};
