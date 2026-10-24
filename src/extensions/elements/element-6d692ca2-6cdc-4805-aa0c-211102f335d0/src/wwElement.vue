<template>
    <div ref="html" class="ww-html" :class="{ isEditing: isEditing }">
        <div v-if="source" class="html-holder" v-html="source"></div>
    </div>
</template>

<script>
const REGEX_SRC = /.*?src="(.*?)"/gim;
const REGEX_CHARSET = /.*?charset="(.*?)"/gim;
const REGEX_CONTENT = /<script.*>(.*)<\/script>/gim;

export default {
    props: {
        content: { type: Object, required: true },
        uid: { type: String, required: true },
    },
    emits: ['update:content'],
    data() {
        return {
            reset: false,
        };
    },
    computed: {
        isEditing() {
            // eslint-disable-next-line no-unreachable
            return false;
        },
        source() {
            if (this.reset) return null;
            return this.content.source ? this.content.source : null;
        },
        scripts() {
            if (typeof this.content.source !== 'string') return [];
            const rawScripts = [...this.content.source.matchAll(/<script.*?>.*?<\/script>/gim)].map(item => item[0]);
            return rawScripts.map(script => {
                const srcResult = new RegExp(REGEX_SRC).exec(script);
                const charsetResult = new RegExp(REGEX_CHARSET).exec(script);
                const contentResult = new RegExp(REGEX_CONTENT).exec(script);
                return {
                    src: srcResult && srcResult[1],
                    charset: charsetResult && charsetResult[1],
                    async: script.includes(' async'),
                    content: contentResult && contentResult[1],
                    attributes: {
                        'ww-html-uid': this.uid,
                    },
                };
            });
        },
    },
    mounted() {
        this.init();
        /* wwFront:start */
        wwLib.getFrontWindow().addEventListener('resize', this.reinit);
        /* wwFront:end */
    },
    watch: {
        scripts() {
            this.init();
        },
        isEditing(value) {
            if (!value) this.init();
        },
    },
    methods: {
        async init() {
            try {
                await this.loadScripts();
                this.executeJavascript();
            } catch (error) {
                wwLib.wwLog.error(error, 'error');
            }
        },
        async loadScripts() {
            if (window.__WW_IS_PRERENDER__) return;
            // Remove old scripts
            wwLib
                .getFrontDocument()
                .head.querySelectorAll(`script[ww-html-uid="${this.uid}"]`)
                .forEach(script => script.remove());
            return Promise.all(
                this.scripts
                    .filter(script => script.src)
                    .map(script =>
                        wwLib.wwUtils.addScriptToHead(
                            {
                                link: script.src,
                                async: script.async,
                                charset: script.charset,
                                attributes: script.attributes,
                            },
                            true
                        )
                    )
            );
        },
        executeJavascript() {
            if (window.__WW_IS_PRERENDER__) return;
            this.scripts.filter(script => script.content).forEach(script => {
                const scriptFunction = new Function(script.content);
                scriptFunction();
            });
        },
        /* wwFront:start */
        reinit() {
            if (!this.content.refreshOnResize) return;
            this.reset = true;
            this.$nextTick(() => {
                this.reset = false;
                this.init();
            });
        },
        /* wwFront:end */
    },
    beforeUnmount() {
        /* wwFront:start */
        wwLib.getFrontWindow().removeEventListener('resize', this.reinit);
        /* wwFront:end */
    },
};
</script>

<style lang="scss" scoped>
.ww-html {
    position: relative;
    .html-holder {
        height: 100%;
    }
    iframe {
        position: relative;
        width: 100% !important;
        height: 100% !important;
    }
}
</style>

<style lang="scss">
.ww-html {
    iframe {
        width: 100%;
        height: 100%;
        border: 0;
    }

    a {
        display: inline;
    }
}
</style>
