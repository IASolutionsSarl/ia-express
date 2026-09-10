// Helper functions for attachment mapping
const __evalCode = (code, type, ctx) => {
    try {
        if (typeof code !== 'string') return undefined;
        const body = type === 'js' ? code : `return (${code});`;
        // eslint-disable-next-line no-new-func
        const fn = new Function('context', body);
        return fn(ctx);
    } catch {
        return undefined;
    }
};

const __pickTemplateMessageByMapping = (messages, mapping) => {
    if (mapping?.code && Array.isArray(messages) && messages.length) {
        for (const msg of messages) {
            const res = __evalCode(mapping.code, mapping.type || 'f', { mapping: msg });
            if (Array.isArray(res) && res.length) return msg;
        }
    }
    const fallback = messages.find(m => Array.isArray(m?.attachments) && m.attachments.length);
    return fallback || (messages.length ? messages[0] : null);
};

const __pickFirstAttachmentByMapping = (messages, mapping) => {
    if (mapping?.code && Array.isArray(messages) && messages.length) {
        for (const msg of messages) {
            const arr = __evalCode(mapping.code, mapping.type || 'f', { mapping: msg });
            if (Array.isArray(arr) && arr.length) return arr[0];
        }
    }
    const withAtt = messages.find(m => Array.isArray(m?.attachments) && m.attachments.length);
    return withAtt ? withAtt.attachments[0] : null;
};

export default {
    inherit: {
        type: 'ww-layout',
    },
    options: {
        displayAllowedValues: ['flex', 'grid', 'inline-flex', 'inline-grid'],
    },
    editor: {
        label: { en: 'Chat AI' },
        icon: 'chat',
        customStylePropertiesOrder: [
            'fontFamily',
            {
                label: "Messages area",
                isCollapsible: true,
                properties: [
                    'messagesAreaBgColor',
                    'messagesAreaPadding',
                    'emptyMessageText',
                    'emptyMessageColor',
                ],
            },
            {
                label: "Assistant messages",
                isCollapsible: true,
                properties: [
                    'messageShowTimestamp',
                    'messageBgColor',
                    'messageTextColor',
                    'messageFontSize',
                    'messageFontWeight',
                    'messageFontFamily',
                    'messageBorder',
                    'messageRadius',
                ],
            },
            {
                label: "User messages",
                isCollapsible: true,
                properties: [
                    'ownMessageShowTimestamp',
                    'ownMessageBgColor',
                    'ownMessageTextColor',
                    'ownMessageFontSize',
                    'ownMessageFontWeight',
                    'ownMessageFontFamily',
                    'ownMessageBorder',
                    'ownMessageRadius',
                ],
            },
            {
                label: "Input area",
                isCollapsible: true,
                properties: [
                    'inputBgColor',
                    'inputAreaBorder',
                ],
            },
            {
                label: "Text area",
                isCollapsible: true,
                properties: [
                    'textareaBorder',
                    'textareaBorderHover',
                    'textareaBorderFocus',
                    'inputTextColor',
                    'inputFontSize',
                    'inputFontWeight',
                    'inputFontFamily',
                    'inputPlaceholderColor',
                    'inputHeight',
                    'inputBorderRadius',
                    'inputPlaceholder',
                    'inputActionAlign',
                ],
            },
            {
                label: "Send icon",
                isCollapsible: true,
                properties: [
                    'sendIcon',
                    'sendIconColor',
                    'sendIconSize',
                ],
            },
            {
                label: "Attachment icon",
                isCollapsible: true,
                properties: [
                    'attachmentIcon',
                    'attachmentIconColor',
                    'attachmentIconSize',
                ],
            },
            {
                label: "Remove attachment icon",
                isCollapsible: true,
                properties: [
                    'removeIcon',
                    'removeIconColor',
                    'removeIconSize',
                ],
            },
            {
                label: "Image preview",
                isCollapsible: true,
                properties: [
                    'messagesAttachmentThumbMaxWidth',
                    'messagesAttachmentThumbMaxHeight',
                    'messagesAttachmentThumbMinWidth',
                    'messagesAttachmentThumbMinHeight',
                    'messagesAttachmentThumbBorderRadius',
                ],
            },
            {
                label: "Send button",
                isCollapsible: true,
                properties: [
                    'sendButtonBgColor',
                    'sendButtonHoverBgColor',
                    'sendButtonBorder',
                    'sendButtonBorderRadius',
                    'sendButtonSize',
                    'sendButtonBoxShadow',
                ],
            },
            {
                label: "Attachment button",
                isCollapsible: true,
                properties: [
                    'attachmentButtonBgColor',
                    'attachmentButtonHoverBgColor',
                    'attachmentButtonBorder',
                    'attachmentButtonBorderRadius',
                    'attachmentButtonSize',
                    'attachmentButtonBoxShadow',
                ],
            },            
        ],
        customSettingsPropertiesOrder: [
            {
                label: "Chat settings",
                isCollapsible: true,
                properties: [
                    'userLabel',
                    'assistantLabel',
                    'disabled',
                    'enableMarkdown',
                    'allowAttachments',
                    'autoScrollBehavior',
                ],
            }, 
            {
                label: "Chat data",
                isCollapsible: true,
                properties: [
                    'messages',
                    'mappingMessageId',
                    'mappingMessageText',
                    'mappingRole',
                    'mappingTimestamp',
                    'mappingAttachments',
                ],
            }, 
             {
                label: "Attachments data",
                isCollapsible: true,
                properties: [
                    'mappingAttachmentId',
                    'mappingAttachmentName',
                    'mappingAttachmentUrl',
                    'mappingAttachmentType',
                    'mappingAttachmentSize',
                ],
            },
            {
                label: "Streaming",
                isCollapsible: true,
                properties: ['isStreaming', 'streamingText'],

            }, 
        ],
    },
    triggerEvents: [
        {
            name: 'messageSent',
            label: { en: 'On message sent' },
            event: {
                message: {
                    id: 'msg-1',
                    content: 'Hello there!',
                    role: 'user',
                    timestamp: new Date().toISOString(),
                    attachments: [
                        {
                            id: 'file-1',
                            name: 'demo.txt',
                            type: 'text/plain',
                            size: 12,
                            url: 'blob:https://example.com/...',
                        },
                    ],
                },
            },
        },
        {
            name: 'messageReceived',
            label: { en: 'On message received' },
            event: {
                message: {
                    id: 'msg-2',
                    content: 'New assistant message received',
                    role: 'assistant',
                    timestamp: new Date().toISOString(),
                    attachments: [
                        {
                            id: 'file-1',
                            name: 'result.pdf',
                            type: 'application/pdf',
                            size: 102400,
                            url: 'https://example.com/result.pdf',
                        },
                    ],
                },
            },
        },
        {
            name: 'messageRightClick',
            label: { en: 'On message right click' },
            event: {
                message: {
                    id: 'msg-1',
                    content: 'Message content',
                    role: 'user',
                    timestamp: new Date().toISOString(),
                },
                position: {
                    elementX: 50, // relative to chat element
                    elementY: 20,
                    viewportX: 320, // relative to page top-left
                    viewportY: 480,
                },
            },
        },
        {
            name: 'attachmentClick',
            label: { en: 'On attachment click' },
            event: {
                attachment: {
                    id: 'file-1',
                    name: 'document.pdf',
                    type: 'application/pdf',
                    size: 1024000,
                    url: 'https://example.com/document.pdf',
                },
            },
        },
        {
            name: 'pendingAttachmentClick',
            label: { en: 'On pending attachment click' },
            event: {
                attachment: {
                    name: 'image.png',
                    type: 'image/png',
                    size: 204800,
                },
                index: 0,
            },
        },
    ],
    actions: [
        {
            action: 'scrollToBottom',
            label: { en: 'Scroll to bottom' },
            args: [
                {
                    name: 'smooth',
                    type: 'boolean',
                    label: { en: 'Smooth scroll' },
                },
            ],
        },
    ],
    properties: {
        // ======== APPEARANCE ========

        // Container styles
        fontFamily: {
            label: { en: 'Font Family' },
            type: 'FontFamily',
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: 'inherit',
        },

        // Messages area styles
        messagesAreaBgColor: {
            label: { en: 'Background Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: '#ffffff',
        },
        messagesAreaPadding: {
            label: { en: 'Padding' },
            type: 'Spacing',
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: '16px',
        },
        emptyMessageText: {
            label: { en: 'Empty Message Text' },
            type: 'Text',
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: 'No messages yet',
        },
        emptyMessageColor: {
            label: { en: 'Empty Message Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: '#64748b',
        },

        // Message styles (AI/Assistant messages - no bubble by default)
        messageShowTimestamp: {
            label: { en: 'Show Timestamp' },
            type: 'OnOff',
            section: 'style',
            bindable: true,
            defaultValue: true,
        },
        messageBgColor: {
            label: { en: 'Background Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: 'transparent',
        },
        messageTextColor: {
            label: { en: 'Text Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: '#334155',
        },
        messageFontSize: {
            label: { en: 'Font Size' },
            type: 'Length',
            section: 'style',
            options: {
                unitChoices: [
                    { value: 'px', label: 'px', min: 8, max: 100 },
                    { value: 'em', label: 'em', min: 0.5, max: 5, digits: 3, step: 0.1 },
                    { value: 'rem', label: 'rem', min: 0.5, max: 5, digits: 3, step: 0.1 },
                ],
            },
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: '0.875rem',
        },
        messageFontWeight: {
            label: { en: 'Font Weight' },
            type: 'TextSelect',
            section: 'style',
            options: {
                options: [
                    { value: '100', label: '100 (Thin)' },
                    { value: '200', label: '200 (Extra Light)' },
                    { value: '300', label: '300 (Light)' },
                    { value: '400', label: '400 (Normal)' },
                    { value: '500', label: '500 (Medium)' },
                    { value: '600', label: '600 (Semi Bold)' },
                    { value: '700', label: '700 (Bold)' },
                    { value: '800', label: '800 (Extra Bold)' },
                    { value: '900', label: '900 (Black)' },
                ],
            },
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: '400',
        },
        messageFontFamily: {
            label: { en: 'Font Family' },
            type: 'FontFamily',
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: 'inherit',
        },
        messageBorder: {
            label: { en: 'Border' },
            type: 'Border',
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: 'none',
        },
        messageRadius: {
            label: { en: 'Border Radius' },
            type: 'Spacing',
            options: {
                isCorner: true,
                unitChoices: [
                    { value: 'px', label: 'px', min: 0, max: 50, default: true },
                    { value: '%', label: '%', min: 0, max: 100, digits: 2, step: 1 },
                ],
            },
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: '12px 12px 12px 12px',
        },

        // User message styles (with bubble)
        ownMessageShowTimestamp: {
            label: { en: 'Show Timestamp' },
            type: 'OnOff',
            section: 'style',
            bindable: true,
            defaultValue: true,
        },
        ownMessageBgColor: {
            label: { en: 'Background Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: '#f4f4f4',
        },
        ownMessageTextColor: {
            label: { en: 'Text Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: '#1e1e1e',
        },
        ownMessageFontSize: {
            label: { en: 'Font Size' },
            type: 'Length',
            section: 'style',
            options: {
                unitChoices: [
                    { value: 'px', label: 'px', min: 8, max: 100 },
                    { value: 'em', label: 'em', min: 0.5, max: 5, digits: 3, step: 0.1 },
                    { value: 'rem', label: 'rem', min: 0.5, max: 5, digits: 3, step: 0.1 },
                ],
            },
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: '0.875rem',
        },
        ownMessageFontWeight: {
            label: { en: 'Font Weight' },
            type: 'TextSelect',
            section: 'style',
            options: {
                options: [
                    { value: '100', label: '100 (Thin)' },
                    { value: '200', label: '200 (Extra Light)' },
                    { value: '300', label: '300 (Light)' },
                    { value: '400', label: '400 (Normal)' },
                    { value: '500', label: '500 (Medium)' },
                    { value: '600', label: '600 (Semi Bold)' },
                    { value: '700', label: '700 (Bold)' },
                    { value: '800', label: '800 (Extra Bold)' },
                    { value: '900', label: '900 (Black)' },
                ],
            },
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: '400',
        },
        ownMessageFontFamily: {
            label: { en: 'Font Family' },
            type: 'FontFamily',
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: 'inherit',
        },
        ownMessageBorder: {
            label: { en: 'Border' },
            type: 'Border',
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: '1px solid #d0d0d0',
        },
        ownMessageRadius: {
            label: { en: 'Border Radius' },
            type: 'Spacing',
            options: {
                isCorner: true,
                unitChoices: [
                    { value: 'px', label: 'px', min: 0, max: 50, default: true },
                    { value: '%', label: '%', min: 0, max: 100, digits: 2, step: 1 },
                ],
            },
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: '18px 18px 18px 18px',
        },

        // Input styles
        inputBgColor: {
            label: { en: 'Background Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: '#ffffff',
        },
        inputAreaBorder: {
            label: { en: 'Area Border Top' },
            type: 'Border',
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: '1px solid #e2e8f0',
        },
        textareaBorder: {
            label: { en: 'Border' },
            type: 'Border',
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: '1px solid #e2e8f0',
        },
        textareaBorderHover: {
            label: { en: 'Border (Hover)' },
            type: 'Border',
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: '1px solid #cbd5e1',
        },
        textareaBorderFocus: {
            label: { en: 'Border (Focus)' },
            type: 'Border',
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: '1px solid #3b82f6',
        },
        inputTextColor: {
            label: { en: 'Text Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: '#334155',
        },
        inputFontSize: {
            label: { en: 'Font Size' },
            type: 'Length',
            section: 'style',
            options: {
                unitChoices: [
                    { value: 'px', label: 'px', min: 8, max: 100 },
                    { value: 'em', label: 'em', min: 0.5, max: 5, digits: 3, step: 0.1 },
                    { value: 'rem', label: 'rem', min: 0.5, max: 5, digits: 3, step: 0.1 },
                ],
            },
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: '0.875rem',
        },
        inputFontWeight: {
            label: { en: 'Font Weight' },
            type: 'TextSelect',
            section: 'style',
            options: {
                options: [
                    { value: '100', label: '100 (Thin)' },
                    { value: '200', label: '200 (Extra Light)' },
                    { value: '300', label: '300 (Light)' },
                    { value: '400', label: '400 (Normal)' },
                    { value: '500', label: '500 (Medium)' },
                    { value: '600', label: '600 (Semi Bold)' },
                    { value: '700', label: '700 (Bold)' },
                    { value: '800', label: '800 (Extra Bold)' },
                    { value: '900', label: '900 (Black)' },
                ],
            },
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: '400',
        },
        inputFontFamily: {
            label: { en: 'Font Family' },
            type: 'FontFamily',
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: 'inherit',
        },
        inputPlaceholderColor: {
            label: { en: 'Placeholder Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: '#94a3b8',
        },
        inputHeight: {
            label: { en: 'Height' },
            type: 'Length',
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: '38px',
        },
        inputBorderRadius: {
            label: { en: 'Border Radius' },
            type: 'Spacing',
            options: {
                isCorner: true,
                unitChoices: [
                    { value: 'px', label: 'px', min: 0, max: 50, default: true },
                    { value: '%', label: '%', min: 0, max: 100, digits: 2, step: 1 },
                ],
            },
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: '8px',
        },
        inputPlaceholder: {
            label: { en: 'Placeholder' },
            type: 'Text',
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: 'Message...',
        },
        inputActionAlign: {
            label: { en: 'Action Alignment' },
            type: 'TextSelect',
            section: 'style',
            options: {
                options: [
                    { value: 'start', label: 'Start' },
                    { value: 'end', label: 'End' },
                ],
            },
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: 'end',
        },

        // Send icon
        sendIcon: {
            label: { en: 'Icon' },
            type: 'SystemIcon',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: 'send',
        },
        sendIconColor: {
            label: { en: 'Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: '#334155',
        },
        sendIconSize: {
            label: { en: 'Size' },
            type: 'Length',
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: '20px',
        },
        attachmentIcon: {
            label: { en: 'Icon' },
            type: 'SystemIcon',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: 'paperclip',
        },
        attachmentIconColor: {
            label: { en: 'Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '#334155',
        },
        attachmentIconSize: {
            label: { en: 'Size' },
            type: 'Length',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '20px',
        },
        removeIcon: {
            label: { en: 'Icon' },
            type: 'SystemIcon',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: 'x',
        },
        removeIconColor: {
            label: { en: 'Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '#334155',
        },
        removeIconSize: {
            label: { en: 'Size' },
            type: 'Length',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '16px',
        },

        // Image preview (thumbnails inside messages)
        messagesAttachmentThumbMaxWidth: {
            label: { en: 'Attachment Max Width' },
            type: 'Length',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '250px',
        },
        messagesAttachmentThumbMaxHeight: {
            label: { en: 'Attachment Max Height' },
            type: 'Length',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '200px',
        },
        messagesAttachmentThumbMinWidth: {
            label: { en: 'Attachment Min Width' },
            type: 'Length',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '80px',
        },
        messagesAttachmentThumbMinHeight: {
            label: { en: 'Attachment Min Height' },
            type: 'Length',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '80px',
        },
        messagesAttachmentThumbBorderRadius: {
            label: { en: 'Attachment Border Radius' },
            type: 'Length',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '6px',
        },

        // Send button styles
        sendButtonBgColor: {
            label: { en: 'Background' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: 'linear-gradient(135deg, #3b82f6, #2563eb)',
        },
        sendButtonHoverBgColor: {
            label: { en: 'Background (Hover)' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
        },
        sendButtonBorder: {
            label: { en: 'Border' },
            type: 'Border',
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: 'none',
        },
        sendButtonBorderRadius: {
            label: { en: 'Border Radius' },
            type: 'Length',
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: '12px',
        },
        sendButtonSize: {
            label: { en: 'Size' },
            type: 'Length',
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: '42px',
        },
        sendButtonBoxShadow: {
            label: { en: 'Shadow' },
            type: 'Shadows',
            section: 'style',
            bindable: true,
            classes: true,
            responsive: true,
            defaultValue: '0 2px 4px rgba(59, 130, 246, 0.3)',
        },

        // Attachment button styles
        attachmentButtonBgColor: {
            label: { en: 'Background Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '#f8fafc',
        },
        attachmentButtonHoverBgColor: {
            label: { en: 'Hover Background' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '#f1f5f9',
        },
        attachmentButtonBorder: {
            label: { en: 'Border' },
            type: 'Border',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '1px solid #e2e8f0',
        },
        attachmentButtonBorderRadius: {
            label: { en: 'Border Radius' },
            type: 'Length',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '12px',
        },
        attachmentButtonSize: {
            label: { en: 'Size' },
            type: 'Length',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '42px',
        },
        attachmentButtonBoxShadow: {
            label: { en: 'Shadow' },
            type: 'Shadows',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '0 1px 2px rgba(0, 0, 0, 0.06)',
        },

        // ======== SETTINGS ========
        userLabel: {
            label: { en: 'User Label' },
            type: 'Text',
            section: 'settings',
            bindable: true,
            defaultValue: 'You',
        },
        assistantLabel: {
            label: { en: 'Assistant Label' },
            type: 'Text',
            section: 'settings',
            bindable: true,
            defaultValue: 'Assistant',
        },
        disabled: {
            label: { en: 'Disabled' },
            type: 'OnOff',
            section: 'settings',
            bindable: true,
            defaultValue: false,
        },
        enableMarkdown: {
            label: { en: 'Enable Markdown' },
            type: 'OnOff',
            section: 'settings',
            bindable: true,
            defaultValue: false,
        },
        allowAttachments: {
            label: { en: 'Allow Attachments' },
            type: 'OnOff',
            section: 'settings',
            bindable: true,
            defaultValue: false,
        },
        autoScrollBehavior: {
            label: { en: 'Auto Scroll Behavior' },
            type: 'TextSelect',
            section: 'settings',
            options: {
                options: [
                    { value: 'auto', label: 'Instant' },
                    { value: 'smooth', label: 'Smooth' },
                ],
            },
            bindable: true,
            defaultValue: 'auto',
        },

        // Chat data
        messages: {
            label: { en: 'Messages' },
            type: 'Info',
            section: 'settings',
            bindable: true,
            bindingValidation: {
                type: 'array',
                tooltip: 'Array of message objects: [{ text: string, role: "user"|"assistant", timestamp?: string }]',
            },
        },
        mappingMessageId: {
            label: { en: 'Message ID' },
            type: 'Formula',
            options: content => ({
                template: Array.isArray(content.messages) && content.messages.length ? content.messages[0] : null,
            }),
            defaultValue: {
                type: 'f',
                code: "context.mapping?.['id']",
            },
            section: 'settings',
            hidden: (content, _, boundProps) => !boundProps.messages,
        },
        mappingMessageText: {
            label: { en: 'Message Text' },
            type: 'Formula',
            options: content => ({
                template: Array.isArray(content.messages) && content.messages.length ? content.messages[0] : null,
            }),
            defaultValue: {
                type: 'f',
                code: "context.mapping?.['content']",
            },
            section: 'settings',
            hidden: (content, _, boundProps) => !boundProps.messages,
        },
        mappingRole: {
            label: { en: 'Message Role' },
            type: 'Formula',
            options: content => ({
                template: Array.isArray(content.messages) && content.messages.length ? content.messages[0] : null,
            }),
            defaultValue: {
                type: 'f',
                code: "context.mapping?.['role']",
            },
            section: 'settings',
            hidden: (content, _, boundProps) => !boundProps.messages,
        },
        mappingTimestamp: {
            label: { en: 'Timestamp' },
            type: 'Formula',
            options: content => ({
                template: Array.isArray(content.messages) && content.messages.length ? content.messages[0] : null,
            }),
            defaultValue: {
                type: 'f',
                code: "context.mapping?.['timestamp']",
            },
            section: 'settings',
            hidden: (content, _, boundProps) => !boundProps.messages,
        },
        mappingAttachments: {
            label: { en: 'Attachments' },
            type: 'Formula',
            options: content => {
                const messages = Array.isArray(content.messages) ? content.messages : [];
                const mapping = content?.mappingAttachments;
                return { template: __pickTemplateMessageByMapping(messages, mapping) };
            },
            defaultValue: {
                type: 'f',
                code: "context.mapping?.['attachments']",
            },
            section: 'settings',
            hidden: (content, _, boundProps) => !boundProps.messages,
        },

        // Attachments Data
        mappingAttachmentId: {
            label: { en: 'ID' },
            type: 'Formula',
            options: content => {
                const messages = Array.isArray(content.messages) ? content.messages : [];
                const mapping = content?.mappingAttachments;
                return { template: __pickFirstAttachmentByMapping(messages, mapping) };
            },
            defaultValue: { type: 'f', code: "context.mapping?.['id']" },
            section: 'settings',
            hidden: (content, _, boundProps) => {
                const hasMessages = !!boundProps?.messages;
                const hasAttachmentsMapping = !!content?.mappingAttachments?.code;
                return !(hasMessages && hasAttachmentsMapping);
            },
        },
        mappingAttachmentName: {
            label: { en: 'Name' },
            type: 'Formula',
            options: content => {
                const messages = Array.isArray(content.messages) ? content.messages : [];
                const mapping = content?.mappingAttachments;
                return { template: __pickFirstAttachmentByMapping(messages, mapping) };
            },
            defaultValue: { type: 'f', code: "context.mapping?.['name']" },
            section: 'settings',
            hidden: (content, _, boundProps) => {
                const hasMessages = !!boundProps?.messages;
                const hasAttachmentsMapping = !!content?.mappingAttachments?.code;
                return !(hasMessages && hasAttachmentsMapping);
            },
        },
        mappingAttachmentUrl: {
            label: { en: 'URL' },
            type: 'Formula',
            options: content => {
                const messages = Array.isArray(content.messages) ? content.messages : [];
                const mapping = content?.mappingAttachments;
                return { template: __pickFirstAttachmentByMapping(messages, mapping) };
            },
            defaultValue: { type: 'f', code: "context.mapping?.['url'] ?? context.mapping?.['href']" },
            section: 'settings',
            hidden: (content, _, boundProps) => {
                const hasMessages = !!boundProps?.messages;
                const hasAttachmentsMapping = !!content?.mappingAttachments?.code;
                return !(hasMessages && hasAttachmentsMapping);
            },
        },
        mappingAttachmentType: {
            label: { en: 'MIME Type' },
            type: 'Formula',
            options: content => {
                const messages = Array.isArray(content.messages) ? content.messages : [];
                const mapping = content?.mappingAttachments;
                return { template: __pickFirstAttachmentByMapping(messages, mapping) };
            },
            defaultValue: { type: 'f', code: "context.mapping?.['type'] ?? context.mapping?.['mime']" },
            section: 'settings',
            hidden: (content, _, boundProps) => {
                const hasMessages = !!boundProps?.messages;
                const hasAttachmentsMapping = !!content?.mappingAttachments?.code;
                return !(hasMessages && hasAttachmentsMapping);
            },
        },
        mappingAttachmentSize: {
            label: { en: 'Size (bytes)' },
            type: 'Formula',
            options: content => {
                const messages = Array.isArray(content.messages) ? content.messages : [];
                const mapping = content?.mappingAttachments;
                return { template: __pickFirstAttachmentByMapping(messages, mapping) };
            },
            defaultValue: { type: 'f', code: "context.mapping?.['size']" },
            section: 'settings',
            hidden: (content, _, boundProps) => {
                const hasMessages = !!boundProps?.messages;
                const hasAttachmentsMapping = !!content?.mappingAttachments?.code;
                return !(hasMessages && hasAttachmentsMapping);
            },
        },

        // Streaming
        isStreaming: {
            label: { en: 'Is Streaming' },
            type: 'OnOff',
            section: 'settings',
            bindable: true,
            defaultValue: false,
        },
        streamingText: {
            label: { en: 'Streaming Text' },
            type: 'Text',
            section: 'settings',
            bindable: true,
            defaultValue: '',
            hidden: content => !content.isStreaming,
        },
    },
};
