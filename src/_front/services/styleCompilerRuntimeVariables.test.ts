import { describe, expect, it } from 'vitest';

import type { StyleDynamicVariable, StyleSurface } from '@/_common/helpers/styleCompiler';
import {
    getStyleDynamicVariablesForSource,
    registerStyleDynamicVariable,
    registerStyleDynamicVariables,
} from './styleCompilerRuntimeVariables';

describe('styleCompilerRuntimeVariables', () => {
    it('returns variables for one source and cleans them up when their compiler chunk is disposed', () => {
        const elementVariable = createVariable('sourceA', 'element');
        const sectionVariable = createVariable('sourceA', 'section-element');
        const otherSourceVariable = createVariable('sourceB', 'element');
        const stopElement = registerStyleDynamicVariable(elementVariable);
        const stopSection = registerStyleDynamicVariable(sectionVariable);
        const stopOtherSource = registerStyleDynamicVariable(otherSourceVariable);

        expect(getStyleDynamicVariablesForSource('sourceA')).toEqual([elementVariable, sectionVariable]);
        expect(getStyleDynamicVariablesForSource('sourceA', new Set(['element']))).toEqual([elementVariable]);

        stopElement();

        expect(getStyleDynamicVariablesForSource('sourceA')).toEqual([sectionVariable]);

        stopSection();
        stopOtherSource();
    });

    it('registers and cleans a whole published page manifest', () => {
        const variables = [createVariable('manifestA', 'element'), createVariable('manifestB', 'section-element')];
        const stop = registerStyleDynamicVariables(variables);

        expect(getStyleDynamicVariablesForSource('manifestA')).toEqual([variables[0]]);
        expect(getStyleDynamicVariablesForSource('manifestB')).toEqual([variables[1]]);

        stop();

        expect(getStyleDynamicVariablesForSource('manifestA')).toEqual([]);
        expect(getStyleDynamicVariablesForSource('manifestB')).toEqual([]);
    });
});

function createVariable(sourceUid: string, kind: StyleSurface['kind']): StyleDynamicVariable {
    const surface: StyleSurface = {
        key: `${kind}:${sourceUid}`,
        group: 'element',
        kind,
        selector: `.ww-element-${sourceUid}`,
        runtimeScopeSelector: `.ww-element-${sourceUid}`,
    };

    return {
        name: '--ww-style-width',
        surface,
        group: 'element',
        sourceUid,
        domain: 'style',
        property: 'width',
        state: 'base',
        breakpoint: 'default',
        value: { __wwtype: 'f', code: 'variables.width' },
        cssProperty: 'width',
        selector: surface.selector,
    };
}
