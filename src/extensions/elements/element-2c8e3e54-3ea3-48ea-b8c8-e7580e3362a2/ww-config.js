// Common helpers for mappingAttachments evaluation
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
        label: { en: 'Chat' },
        icon: 'chat',
        customStylePropertiesOrder: [
            'fontFamily',
            // Header styles
            {
                label: "Header",
                isCollapsible: true,
                properties: [
                    'displayHeader',
                    'headerBgColor',
                    'headerTextColor',
                    'headerBorder',
                    'headerPadding',
                    'headerNameFontSize',
                    'headerNameFontWeight',
                    'headerLocationFontSize',
                    'headerLocationOpacity',
                    // Group chat avatar styling
                    'groupChatAvatarColor',
                    // Close button controls grouped at the end of header
                    'headerShowCloseButton',
                    'headerCloseButtonColor',
                    'headerCloseButtonBgHover',
                ],
            },
            // Messages area styles
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
            // Date separator styles
            {
                label: "Date separator",
                isCollapsible: true,
                properties: [
                    'dateSeparatorTextColor',
                    'dateSeparatorLineColor',
                    'dateSeparatorBgColor',
                    'dateSeparatorBorderRadius',
                ],
            },
            // Message styles
            {
                label: "Others' messages",
                isCollapsible: true,
                properties: [
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
                label: "Your messages",
                isCollapsible: true,
                properties: [
                    'ownMessageBgColor',
                    'ownMessageTextColor',
                    'ownMessageFontSize',
                    'ownMessageFontWeight',
                    'ownMessageFontFamily',
                    'ownMessageBorder',
                    'ownMessageRadius',
                ],
            },
            // Input styles
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
            // Icons
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
                    'messagesAttachmentThumbBorderRadius',
                ],
            },
            // Send button styles
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
            // Attachment button styles
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
            // Chat settings
            {
                label: "Chat settings",
                isCollapsible: true,
                properties: [
                    'groupChatText', 
                    'groupChatAvatar',
                    'allowAttachments',
                    'disabled',
                    'autoScrollBehavior'
                ],
            },
            // Chat data + message mapping
            {
                label: "Chat data",
                isCollapsible: true,
                properties: [
                    'messages',
                    'mappingMessageId',
                    'mappingMessageText',
                    'mappingSenderId',
                    'mappingTimestamp',
                    'mappingAttachments',
                ],
            },
            // Attachments Data mapping (visible only when mappingAttachments is bound)
            {
                label: "Attachment data",
                isCollapsible: true,
                properties: [
                    'mappingAttachmentId',
                    'mappingAttachmentName',
                    'mappingAttachmentUrl',
                    'mappingAttachmentType',
                    'mappingAttachmentSize',
                ],
            },
            // Participant data
            {
                label: "Participant data",
                isCollapsible: true,
                properties: [
                    'participants',
                    'mappingParticipantId',
                    'mappingParticipantName',
                    'mappingParticipantAvatar',
                    'mappingParticipantLocation',
                    'mappingParticipantStatus',
                    'mappingIsCurrentUser',
                ],
            },
            // Localization settings
            {
                label: "Localization",
                isCollapsible: true,
                properties: [
                    'locale', 
                    'timeFormat',
                    'todayText',
                    'yesterdayText',
                    'justNowText'
                ],  
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
                    text: 'Hello there!',
                    senderId: 'current-user',
                    userName: 'User',
                    timestamp: new Date().toISOString(),
                    attachments: [
                        {
                            name: 'demo.txt',
                            type: 'text/plain',
                            size: 12,
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
                    text: 'New message received',
                    senderId: 'other-user',
                    userName: 'Other User',
                    timestamp: new Date().toISOString(),
                    attachments: [
                        {
                            id: 'file-2',
                            name: 'spec.pdf',
                            type: 'application/pdf',
                            size: 102400,
                            url: 'https://example.com/spec.pdf',
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
                    text: 'Message content',
                    senderId: 'user-id',
                    userName: 'User Name',
                    timestamp: new Date().toISOString(),
                    attachments: [
                        {
                            id: 'file-2',
                            name: 'spec.pdf',
                            type: 'application/pdf',
                            size: 102400,
                            url: 'https://example.com/spec.pdf',
                        },
                    ],
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
                // attachment is a File object (unsent local upload)
                attachment: {
                    name: 'image.png',
                    type: 'image/png',
                    size: 204800,
                    // lastModified: 1695489600000
                },
                index: 0,
            },
        },
        {
            name: 'close',
            label: { en: 'On close' },
            event: {},
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
            states: true,
            responsive: true,
            defaultValue: 'inherit',
        },

        // Header styles
        displayHeader: {
            label: { en: 'Display Header' },
            type: 'OnOff',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: true,
        },
        headerBgColor: {
            label: { en: 'Background Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '#ffffff',
            hidden: content => content.displayHeader === false,
        },
        headerTextColor: {
            label: { en: 'Text Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '#1e293b',
            hidden: content => content.displayHeader === false,
        },
        headerBorder: {
            label: { en: 'Border Bottom' },
            type: 'Border',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '1px solid #e2e8f0',
            hidden: content => content.displayHeader === false,
        },

        headerPadding: {
            label: { en: 'Padding' },
            type: 'Spacing',
            section: 'style',
            defaultValue: '12px 16px',
            classes: true,
            states: true,
            responsive: true,
            bindable: true,
            hidden: content => content.displayHeader === false,
        },

        // Group chat avatar color (for initials fallback)
        groupChatAvatarColor: {
            label: { en: 'Group Avatar Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '#4f46e5',
            hidden: content => content.displayHeader === false,
        },
        headerNameFontSize: {
            label: { en: 'Name Font Size' },
            type: 'Length',
            options: {
                unitChoices: [
                    { value: 'px', label: 'px', min: 8, max: 100 },
                    { value: 'em', label: 'em', min: 0.5, max: 5, digits: 3, step: 0.1 },
                    { value: 'rem', label: 'rem', min: 0.5, max: 5, digits: 3, step: 0.1 },
                ],
            },
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '1rem',
            hidden: content => content.displayHeader === false,
        },
        headerNameFontWeight: {
            label: { en: 'Name Font Weight' },
            type: 'TextSelect',
            options: {
                options: [
                    { value: '100', label: { en: '100 - Thin' } },
                    { value: '200', label: { en: '200 - Extra Light' } },
                    { value: '300', label: { en: '300 - Light' } },
                    { value: '400', label: { en: '400 - Normal' } },
                    { value: '500', label: { en: '500 - Medium' } },
                    { value: '600', label: { en: '600 - Semi Bold' } },
                    { value: '700', label: { en: '700 - Bold' } },
                    { value: '800', label: { en: '800 - Extra Bold' } },
                    { value: '900', label: { en: '900 - Black' } },
                ],
            },
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '600',
            hidden: content => content.displayHeader === false,
        },
        headerLocationFontSize: {
            label: { en: 'Location Font Size' },
            type: 'Length',
            options: {
                unitChoices: [
                    { value: 'px', label: 'px', min: 8, max: 100 },
                    { value: 'em', label: 'em', min: 0.5, max: 5, digits: 3, step: 0.1 },
                    { value: 'rem', label: 'rem', min: 0.5, max: 5, digits: 3, step: 0.1 },
                ],
            },
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '0.875rem',
            hidden: content => content.displayHeader === false,
        },
        headerLocationOpacity: {
            label: { en: 'Location Opacity' },
            type: 'Number',
            options: {
                min: 0,
                max: 1,
                step: 0.1,
            },
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: 0.7,
            hidden: content => content.displayHeader === false,
        },
        headerCloseButtonColor: {
            label: { en: 'Close Button Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '',
            hidden: content => content.displayHeader === false || content.headerShowCloseButton === false,
        },
        headerCloseButtonBgHover: {
            label: { en: 'Close Button Hover BG' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: 'rgba(0, 0, 0, 0.05)',
            hidden: content => content.displayHeader === false || content.headerShowCloseButton === false,
        },

        headerShowCloseButton: {
            label: { en: 'Display Close Button' },
            type: 'OnOff',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: true,
            hidden: content => content.displayHeader === false,
        },

        // Messages area styles
        messagesAreaBgColor: {
            label: { en: 'Background Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '#ffffff',
        },
        messagesAreaPadding: {
            label: { en: 'Padding' },
            type: 'Spacing',
            section: 'style',
            defaultValue: '16px',
            classes: true,
            states: true,
            responsive: true,
            bindable: true,
        },

        // Attachment thumbnails (messages area)
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

        emptyMessageText: {
            label: { en: 'Empty Message Text' },
            type: 'Text',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: 'No messages yet',
        },
        emptyMessageColor: {
            label: { en: 'Empty Message Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '#64748b',
        },
        dateSeparatorTextColor: {
            label: { en: 'Text Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '#64748b',
        },
        dateSeparatorLineColor: {
            label: { en: 'Line Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '#e2e8f0',
        },
        dateSeparatorBgColor: {
            label: { en: 'Background Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '#ffffff',
        },
        dateSeparatorBorderRadius: {
            label: { en: 'Border Radius' },
            type: 'Length',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '4px',
        },

        // Message styles
        messageBgColor: {
            label: { en: 'Background Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '#f1f5f9',
        },
        messageTextColor: {
            label: { en: 'Text Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '#334155',
        },
        messageFontSize: {
            label: { en: 'Font Size' },
            type: 'Length',
            options: {
                unitChoices: [
                    { value: 'px', label: 'px', min: 8, max: 100 },
                    { value: 'em', label: 'em', min: 0.5, max: 5, digits: 3, step: 0.1 },
                    { value: 'rem', label: 'rem', min: 0.5, max: 5, digits: 3, step: 0.1 },
                ],
            },
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '0.875rem',
        },
        messageFontWeight: {
            label: { en: 'Font Weight' },
            type: 'TextSelect',
            options: {
                options: [
                    { value: '100', label: { en: '100 - Thin' } },
                    { value: '200', label: { en: '200 - Extra Light' } },
                    { value: '300', label: { en: '300 - Light' } },
                    { value: '400', label: { en: '400 - Normal' } },
                    { value: '500', label: { en: '500 - Medium' } },
                    { value: '600', label: { en: '600 - Semi Bold' } },
                    { value: '700', label: { en: '700 - Bold' } },
                    { value: '800', label: { en: '800 - Extra Bold' } },
                    { value: '900', label: { en: '900 - Black' } },
                ],
            },
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '400',
        },
        messageFontFamily: {
            label: { en: 'Font Family' },
            type: 'FontFamily',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: 'inherit',
        },
        messageBorder: {
            label: { en: 'Border' },
            type: 'Border',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '1px solid #e2e8f0',
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
            states: true,
            responsive: true,
            defaultValue: '18px 18px 18px 18px',
        },

        // Own message styles
        ownMessageBgColor: {
            label: { en: 'Background Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '#dbeafe',
        },
        ownMessageTextColor: {
            label: { en: 'Text Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '#1e40af',
        },
        ownMessageFontSize: {
            label: { en: 'Font Size' },
            type: 'Length',
            options: {
                unitChoices: [
                    { value: 'px', label: 'px', min: 8, max: 100 },
                    { value: 'em', label: 'em', min: 0.5, max: 5, digits: 3, step: 0.1 },
                    { value: 'rem', label: 'rem', min: 0.5, max: 5, digits: 3, step: 0.1 },
                ],
            },
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '0.875rem',
        },
        ownMessageFontWeight: {
            label: { en: 'Font Weight' },
            type: 'TextSelect',
            options: {
                options: [
                    { value: '100', label: { en: '100 - Thin' } },
                    { value: '200', label: { en: '200 - Extra Light' } },
                    { value: '300', label: { en: '300 - Light' } },
                    { value: '400', label: { en: '400 - Normal' } },
                    { value: '500', label: { en: '500 - Medium' } },
                    { value: '600', label: { en: '600 - Semi Bold' } },
                    { value: '700', label: { en: '700 - Bold' } },
                    { value: '800', label: { en: '800 - Extra Bold' } },
                    { value: '900', label: { en: '900 - Black' } },
                ],
            },
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '400',
        },
        ownMessageFontFamily: {
            label: { en: 'Font Family' },
            type: 'FontFamily',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: 'inherit',
        },
        ownMessageBorder: {
            label: { en: 'Border' },
            type: 'Border',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '1px solid #bfdbfe',
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
            states: true,
            responsive: true,
            defaultValue: '18px 18px 18px 18px',
        },

        // Input area styles
        inputBgColor: {
            label: { en: 'Background Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '#ffffff',
        },
        inputAreaBorder: {
            label: { en: 'Input Area Border Top' },
            type: 'Border',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '1px solid #e2e8f0',
        },
        textareaBorder: {
            label: { en: 'Border' },
            type: 'Border',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '1px solid #e2e8f0',
        },
        textareaBorderHover: {
            label: { en: 'Border (Hover)' },
            type: 'Border',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '1px solid #cbd5e1',
        },
        textareaBorderFocus: {
            label: { en: 'Border (Focus)' },
            type: 'Border',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '1px solid #3b82f6',
        },
        inputTextColor: {
            label: { en: 'Text Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '#334155',
        },
        inputFontSize: {
            label: { en: 'Font Size' },
            type: 'Length',
            options: {
                unitChoices: [
                    { value: 'px', label: 'px', min: 8, max: 100 },
                    { value: 'em', label: 'em', min: 0.5, max: 5, digits: 3, step: 0.1 },
                    { value: 'rem', label: 'rem', min: 0.5, max: 5, digits: 3, step: 0.1 },
                ],
            },
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '0.875rem',
        },
        inputFontWeight: {
            label: { en: 'Font Weight' },
            type: 'TextSelect',
            options: {
                options: [
                    { value: '100', label: { en: '100 - Thin' } },
                    { value: '200', label: { en: '200 - Extra Light' } },
                    { value: '300', label: { en: '300 - Light' } },
                    { value: '400', label: { en: '400 - Normal' } },
                    { value: '500', label: { en: '500 - Medium' } },
                    { value: '600', label: { en: '600 - Semi Bold' } },
                    { value: '700', label: { en: '700 - Bold' } },
                    { value: '800', label: { en: '800 - Extra Bold' } },
                    { value: '900', label: { en: '900 - Black' } },
                ],
            },
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '400',
        },
        inputFontFamily: {
            label: { en: 'Font Family' },
            type: 'FontFamily',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: 'inherit',
        },
        inputPlaceholderColor: {
            label: { en: 'Placeholder Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '#94a3b8',
        },
        inputHeight: {
            label: { en: 'Height' },
            type: 'Length',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
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
            states: true,
            responsive: true,
            defaultValue: '20px',
        },
        inputActionAlign: {
            label: { en: 'Action Align' },
            type: 'TextSelect',
            options: {
                options: [
                    { value: 'start', label: { en: 'Start' } },
                    { value: 'center', label: { en: 'Center' } },
                    { value: 'end', label: { en: 'End' } },
                ],
            },
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: 'end',
        },
        inputPlaceholder: {
            label: { en: 'Placeholder Text' },
            type: 'Text',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: 'Type a message...',
        },

        // Icon properties
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
            states: true,
            responsive: true,
            defaultValue: '#334155',
        },
        sendIconSize: {
            label: { en: 'Size' },
            type: 'Length',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
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
        // Send button styles
        sendButtonBgColor: {
            label: { en: 'Background Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: 'linear-gradient(135deg, #3b82f6, #2563eb)',
        },
        sendButtonHoverBgColor: {
            label: { en: 'Hover Background' },
            type: 'Color',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
        },
        sendButtonBorder: {
            label: { en: 'Border' },
            type: 'Border',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: 'none',
        },
        sendButtonBorderRadius: {
            label: { en: 'Border Radius' },
            type: 'Length',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '12px',
        },
        sendButtonSize: {
            label: { en: 'Size' },
            type: 'Length',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
            defaultValue: '42px',
        },
        sendButtonBoxShadow: {
            label: { en: 'Shadow' },
            type: 'Shadows',
            section: 'style',
            bindable: true,
            classes: true,
            states: true,
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

        // User settings

        // Chat settings
        groupChatAvatar: {
            label: { en: 'Group Avatar URL' },
            type: 'Text',
            section: 'settings',
            bindable: true,
            defaultValue: '',
        },
        groupChatText: {
            label: { en: 'Group Chat Text' },
            type: 'Text',
            section: 'settings',
            bindable: true,
            defaultValue: '',
        },

        allowAttachments: {
            label: { en: 'Allow Attachments' },
            type: 'OnOff',
            section: 'settings',
            bindable: true,
            defaultValue: false,
        },
        disabled: {
            label: { en: 'Disabled' },
            type: 'OnOff',
            section: 'settings',
            bindable: true,
            defaultValue: false,
        },
        autoScrollBehavior: {
            label: { en: 'Auto-scroll Behavior' },
            type: 'TextSelect',
            options: {
                options: [
                    { value: 'smooth', label: { en: 'Smooth' } },
                    { value: 'auto', label: { en: 'Instant' } },
                ],
            },
            section: 'settings',
            bindable: true,
            defaultValue: 'auto',
        },

        // Localization settings
        locale: {
            label: { en: 'Locale' },
            type: 'TextSelect',
            options: {
                options: [
                    // English variants
                    { value: 'enUS', label: { en: 'English (US)' } },
                    { value: 'enGB', label: { en: 'English (UK)' } },
                    { value: 'enCA', label: { en: 'English (Canada)' } },
                    { value: 'enAU', label: { en: 'English (Australia)' } },
                    { value: 'enNZ', label: { en: 'English (New Zealand)' } },
                    { value: 'enIE', label: { en: 'English (Ireland)' } },
                    { value: 'enIN', label: { en: 'English (India)' } },
                    { value: 'enZA', label: { en: 'English (South Africa)' } },

                    // French variants
                    { value: 'fr', label: { en: 'French (France)' } },
                    { value: 'frCA', label: { en: 'French (Canada)' } },
                    { value: 'frCH', label: { en: 'French (Switzerland)' } },

                    // German variants
                    { value: 'de', label: { en: 'German (Germany)' } },
                    { value: 'deAT', label: { en: 'German (Austria)' } },

                    // Spanish
                    { value: 'es', label: { en: 'Spanish' } },

                    // Italian variants
                    { value: 'it', label: { en: 'Italian (Italy)' } },
                    { value: 'itCH', label: { en: 'Italian (Switzerland)' } },

                    // Portuguese variants
                    { value: 'pt', label: { en: 'Portuguese (Portugal)' } },
                    { value: 'ptBR', label: { en: 'Portuguese (Brazil)' } },

                    { value: 'ru', label: { en: 'Russian' } },

                    // East Asian languages
                    { value: 'ja', label: { en: 'Japanese' } },
                    { value: 'jaHira', label: { en: 'Japanese (Hiragana)' } },
                    { value: 'zh', label: { en: 'Chinese (Simplified)' } },
                    { value: 'zhHK', label: { en: 'Chinese (Hong Kong)' } },
                    { value: 'zhTW', label: { en: 'Chinese (Taiwan)' } },
                    { value: 'ko', label: { en: 'Korean' } },

                    // Arabic variants
                    { value: 'ar', label: { en: 'Arabic' } },
                    { value: 'arDZ', label: { en: 'Arabic (Algeria)' } },
                    { value: 'arEG', label: { en: 'Arabic (Egypt)' } },
                    { value: 'arMA', label: { en: 'Arabic (Morocco)' } },
                    { value: 'arSA', label: { en: 'Arabic (Saudi Arabia)' } },
                    { value: 'arTN', label: { en: 'Arabic (Tunisia)' } },

                    // Indian subcontinent languages
                    { value: 'hi', label: { en: 'Hindi (India)' } },
                    { value: 'bn', label: { en: 'Bengali' } },

                    // Other European languages
                    { value: 'nl', label: { en: 'Dutch (Netherlands)' } },
                    { value: 'nlBE', label: { en: 'Dutch (Belgium)' } },
                    { value: 'sv', label: { en: 'Swedish' } },
                    { value: 'nb', label: { en: 'Norwegian (Bokmål)' } },
                    { value: 'nn', label: { en: 'Norwegian (Nynorsk)' } },
                    { value: 'da', label: { en: 'Danish' } },
                    { value: 'fi', label: { en: 'Finnish' } },
                    { value: 'el', label: { en: 'Greek' } },
                    { value: 'tr', label: { en: 'Turkish' } },
                    { value: 'cs', label: { en: 'Czech' } },
                    { value: 'pl', label: { en: 'Polish' } },
                    { value: 'ro', label: { en: 'Romanian' } },
                    { value: 'hu', label: { en: 'Hungarian' } },

                    // Southeast Asian languages
                    { value: 'vi', label: { en: 'Vietnamese' } },
                    { value: 'th', label: { en: 'Thai' } },
                    { value: 'id', label: { en: 'Indonesian' } },
                    { value: 'ms', label: { en: 'Malay' } },

                    // Other languages
                    { value: 'uk', label: { en: 'Ukrainian' } },
                ],
            },
            section: 'settings',
            bindable: true,
            defaultValue: 'enUS',
        },
        timeFormat: {
            label: { en: 'Time Format' },
            type: 'Text',
            section: 'settings',
            bindable: true,
            defaultValue: 'h:mm a',
        },
        todayText: {
            label: { en: 'Today Text' },
            type: 'Text',
            section: 'settings',
            bindable: true,
            defaultValue: 'Today',
        },
        yesterdayText: {
            label: { en: 'Yesterday Text' },
            type: 'Text',
            section: 'settings',
            bindable: true,
            defaultValue: 'Yesterday',
        },
        justNowText: {
            label: { en: 'Just Now Text' },
            type: 'Text',
            section: 'settings',
            bindable: true,
            defaultValue: 'just now',
        },

        // Chat data
        messages: {
            label: { en: 'Messages' },
            type: 'Info',
            section: 'settings',
            bindable: true,
            defaultValue: [],
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
                code: "context.mapping?.['text']",
            },
            section: 'settings',
            hidden: (content, _, boundProps) => !boundProps.messages,
        },
        mappingSenderId: {
            label: { en: 'Sender ID' },
            type: 'Formula',
            options: content => ({
                template: Array.isArray(content.messages) && content.messages.length ? content.messages[0] : null,
            }),
            defaultValue: {
                type: 'f',
                code: "context.mapping?.['senderId']",
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

        // Attachments Data (visible only when mappingAttachments is provided)
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
                const evalCode = (code, type, ctx) => {
                    try {
                        if (typeof code !== 'string') return undefined;
                        const body = type === 'js' ? code : `return (${code});`;
                        // eslint-disable-next-line no-new-func
                        const fn = new Function('context', body);
                        return fn(ctx);
                    } catch (e) {
                        return undefined;
                    }
                };
                let attachment = null;
                if (mapping?.code && messages.length) {
                    for (const msg of messages) {
                        const arr = evalCode(mapping.code, mapping.type || 'f', { mapping: msg });
                        if (Array.isArray(arr) && arr.length) {
                            attachment = arr[0];
                            break;
                        }
                    }
                }
                if (!attachment) {
                    const withAtt = messages.find(m => Array.isArray(m?.attachments) && m.attachments.length);
                    attachment = withAtt ? withAtt.attachments[0] : null;
                }
                return { template: attachment };
            },
            defaultValue: { type: 'f', code: "context.mapping?.['size'] ?? context.mapping?.['length']" },
            section: 'settings',
            hidden: (content, _, boundProps) => {
                const hasMessages = !!boundProps?.messages;
                const hasAttachmentsMapping = !!content?.mappingAttachments?.code;
                return !(hasMessages && hasAttachmentsMapping);
            },
        },

        // Participant data
        participants: {
            label: { en: 'Participants' },
            type: 'Array',
            section: 'settings',
            bindable: true,
            defaultValue: [],
            options: {
                item: {
                    type: 'Object',
                    options: {
                        item: {
                            id: { label: { en: 'Participant ID' }, type: 'Text' },
                            name: { label: { en: 'Name' }, type: 'Text' },
                            avatar: { label: { en: 'Avatar URL' }, type: 'Text' },
                            location: { label: { en: 'Location' }, type: 'Text' },
                            status: {
                                label: { en: 'Status' },
                                type: 'TextSelect',
                                options: {
                                    options: [
                                        { value: 'online', label: { en: 'Online' } },
                                        { value: 'offline', label: { en: 'Offline' } },
                                        { value: 'away', label: { en: 'Away' } },
                                        { value: 'busy', label: { en: 'Busy' } },
                                    ],
                                },
                            },
                            isCurrentUser: { label: { en: 'Is Current User' }, type: 'OnOff' },
                        },
                    },
                },
            },
        },
        mappingParticipantId: {
            label: { en: 'ID' },
            type: 'Formula',
            options: content => ({
                template:
                    Array.isArray(content.participants) && content.participants.length ? content.participants[0] : null,
            }),
            defaultValue: {
                type: 'f',
                code: "context.mapping?.['id'] ?? context.mapping?.['userId'] ?? context.mapping?.['_id']",
            },
            section: 'settings',
        },
        mappingParticipantName: {
            label: { en: 'Name' },
            type: 'Formula',
            options: content => ({
                template:
                    Array.isArray(content.participants) && content.participants.length ? content.participants[0] : null,
            }),
            defaultValue: {
                type: 'f',
                code: "context.mapping?.['name'] ?? context.mapping?.['userName'] ?? context.mapping?.['fullName']",
            },
            section: 'settings',
        },
        mappingParticipantAvatar: {
            label: { en: 'Avatar URL' },
            type: 'Formula',
            options: content => ({
                template:
                    Array.isArray(content.participants) && content.participants.length ? content.participants[0] : null,
            }),
            defaultValue: {
                type: 'f',
                code: "context.mapping?.['avatar'] ?? context.mapping?.['avatarUrl'] ?? context.mapping?.['photo']",
            },
            section: 'settings',
        },
        mappingParticipantLocation: {
            label: { en: 'Location' },
            type: 'Formula',
            options: content => ({
                template:
                    Array.isArray(content.participants) && content.participants.length ? content.participants[0] : null,
            }),
            defaultValue: { type: 'f', code: "context.mapping?.['location'] ?? context.mapping?.['subtitle']" },
            section: 'settings',
        },
        mappingParticipantStatus: {
            label: { en: 'Status' },
            type: 'Formula',
            options: content => ({
                template:
                    Array.isArray(content.participants) && content.participants.length ? content.participants[0] : null,
            }),
            defaultValue: { type: 'f', code: "context.mapping?.['status']" },
            section: 'settings',
        },
        mappingIsCurrentUser: {
            label: { en: 'Is Current User' },
            type: 'Formula',
            options: content => ({
                template:
                    Array.isArray(content.participants) && content.participants.length ? content.participants[0] : null,
            }),
            defaultValue: { type: 'f', code: "!!context.mapping?.['isCurrentUser']" },
            section: 'settings',
        },
    },
};
