function getDataObject(options) {
    if (!options) return {};
    if (Array.isArray(options)) {
        return options[0] || {};
    }
    return {};
}

export default {
    editor: {
        label: 'Form Radio',
        icon: 'radio',
    },
    options: {
        displayAllowedValues: ['flex', 'inline-flex'],
    },
    triggerEvents: [
        { name: 'change', label: 'On Change', event: { value: '' }, default: true },
        { name: 'initValueChange', label: 'On Init value change', event: { value: '' } },
    ],
    customStylePropertiesOrder: ['direction', ['rowGap', 'columnGap'], ['justifyContent', 'alignItems'], 'flexWrap'],
    properties: {
        options: {
            label: 'Choices values',
            type: 'Array',
            section: 'settings',
            options: {
                item: {
                    type: 'Object',
                    options: {
                        item: {
                            label: {
                                label: 'Label',
                                type: 'Text',
                                options: { placeholder: 'Label' },
                            },
                            value: {
                                label: 'Value',
                                type: 'Text',
                                options: { placeholder: 'Value' },
                            },
                        },
                    },
                },
            },
            defaultValue: [
                { value: 'first value', label: 'first label' },
                { value: 'second value', label: 'second label' },
            ],
            multilang: true,
            bindable: true,
        },
        value: {
            label: {
                en: 'Init value',
            },
            type: 'Text',
            section: 'settings',
            bindable: true,
            defaultValue: '',
        },
        labelField: {
            hidden: (content, _sidepanelContent, boundProps) => {
                const options = wwLib.wwCollection.getCollectionData(content.options);
                return !boundProps.options || !options || (options && typeof options[0] !== 'object');
            },
            label: 'Label field',
            type: 'ObjectPropertyPath',
            options: content => ({
                object: getDataObject(wwLib.wwCollection.getCollectionData(content.options)),
            }),
            defaultValue: null,
            section: 'settings',
        },
        valueField: {
            hidden: (content, _sidepanelContent, boundProps) => {
                const options = wwLib.wwCollection.getCollectionData(content.options);
                return !boundProps.options || !options || (options && typeof options[0] !== 'object');
            },
            label: 'Value field',
            type: 'ObjectPropertyPath',
            options: content => ({
                object: getDataObject(wwLib.wwCollection.getCollectionData(content.options)),
            }),
            defaultValue: null,
            section: 'settings',
        },
        choicesElement: {
            hidden: true,
            defaultValue: { isWwObject: true, type: 'ww-text' },
        },
        required: {
            label: 'Required',
            type: 'OnOff',
            section: 'settings',
            defaultValue: true,
            bindable: true,
        },
        direction: {
            label: 'Direction',
            type: 'BigIconRadioGroup',
            options: {
                choices: [
                    { icon: 'arrow-down', value: 'column', label: 'Vertical' },
                    { icon: 'arrow-right', value: 'row', label: 'Horizontal' },
                ],
            },
            responsive: true,
            states: true,
            classes: true,
            defaultValue: 'column',
        },
        rowGap: {
            label: 'Rows gap',
            type: 'Length',
            options: {
                unitChoices: [
                    { value: 'px', label: 'px', min: 0, max: 100 },
                    { value: '%', label: '%', min: 0, max: 100, digits: 2 },
                    { value: 'em', label: 'em', min: 0, max: 10, digits: 2 },
                    { value: 'rem', label: 'rem', min: 0, max: 10, digits: 2 },
                ],
            },
            responsive: true,
            states: true,
            classes: true,
        },
        columnGap: {
            label: 'Columns gap',
            type: 'Length',
            options: {
                unitChoices: [
                    { value: 'px', label: 'px', min: 0, max: 100 },
                    { value: '%', label: '%', min: 0, max: 100, digits: 2 },
                    { value: 'em', label: 'em', min: 0, max: 10, digits: 2 },
                    { value: 'rem', label: 'rem', min: 0, max: 10, digits: 2 },
                ],
            },
            responsive: true,
            states: true,
            classes: true,
        },
        justifyContent: {
            label: 'Justify',
            type: 'TextRadioGroup',
            options: content => {
                if (content.direction === 'row') {
                    return {
                        choices: [
                            { value: 'flex-start', title: 'Start', icon: 'align-x-start' },
                            { value: 'center', title: 'Center', icon: 'align-x-center' },
                            { value: 'flex-end', title: 'End', icon: 'align-x-end' },
                            {
                                value: 'space-around',
                                title: 'Space around',
                                icon: 'align-x-space-around',
                            },
                            {
                                value: 'space-between',
                                title: 'Space between',
                                icon: 'align-x-space-between',
                            },
                        ],
                    };
                } else {
                    return {
                        choices: [
                            {
                                value: 'flex-start',
                                title: 'Start',
                                icon: 'align-x-start-vertical',
                            },
                            { value: 'center', title: 'Center', icon: 'align-x-center-vertical' },
                            { value: 'flex-end', title: 'End', icon: 'align-x-end-vertical' },
                            {
                                value: 'space-around',
                                title: 'Space around',
                                icon: 'align-x-space-around-vertical',
                            },
                            {
                                value: 'space-between',
                                title: 'Space between',
                                icon: 'align-x-space-between-vertical',
                            },
                        ],
                    };
                }
            },
            responsive: true,
            states: true,
            classes: true,
            defaultValue: 'center',
        },
        alignItems: {
            label: 'Alignment',
            type: 'TextRadioGroup',
            options: content => {
                if (content.direction === 'row') {
                    return {
                        choices: [
                            { value: 'flex-start', title: 'Start', icon: 'align-y-start' },
                            { value: 'center', title: 'Center', icon: 'align-y-center' },
                            { value: 'flex-end', title: 'End', icon: 'align-y-end' },
                            { value: 'stretch', title: 'Stretch', icon: 'align-y-stretch' },
                            { value: 'baseline', title: 'Baseline', icon: 'align-y-baseline' },
                        ],
                    };
                } else {
                    return {
                        choices: [
                            { value: 'flex-start', title: 'Start', icon: 'align-x-start' },
                            { value: 'center', title: 'Center', icon: 'align-x-center' },
                            { value: 'flex-end', title: 'End', icon: 'align-x-end' },
                            { value: 'stretch', title: 'Stretch', icon: 'align-x-stretch' },
                        ],
                    };
                }
            },
            responsive: true,
            states: true,
            classes: true,
            defaultValue: 'flex-start',
        },
        flexWrap: {
            label: 'Wrap elements',
            type: 'OnOff',
            hidden: content => content.direction !== 'row',
            responsive: true,
            states: true,
            classes: true,
            defaultValue: true,
        },
    },
};
