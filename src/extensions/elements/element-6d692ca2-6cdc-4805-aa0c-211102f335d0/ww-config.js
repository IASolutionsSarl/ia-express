const sourceTooltip = `A string that represents an html structure: \n\n
\`\`\`html
<div class='article'>
    <h1>This is a heading</h1>
    <p>This is a paragraph.</p>
</div>
\`\`\`
`;

export default {
    options: {
        sizable: true,
    },
    editor: {
        label: {
            en: 'HTML',
            fr: 'HTML',
        },
        icon: 'code',
    },
    properties: {
        source: {
            label: {
                en: 'HTML',
            },
            type: 'Text',
            options: {
                code: true,
                language: 'html',
            },
            bindable: true,
            defaultValue: '',
        },
        refreshOnResize: {
            type: 'OnOff',
            label: {
                en: 'Refresh on resize',
            },
            defaultValue: false,
        },
    },
};
