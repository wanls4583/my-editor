<!--
 * @Author: lisong
 * @Date: 2021-12-24 11:00:11
 * @Description: 
-->
<template>
    <div @contextmenu.prevent @contextmenu.stop @mousedown.stop @selectstart.stop class="my-search">
        <div class="my-search-left active-click" tabindex="-1">
            <span :class="{ 'icon-down1': replaceVisible, 'icon-right': !replaceVisible }" @click="showReplace" class="iconfont" style="font-size: 14px" title="Toggle Replace mode"></span>
        </div>
        <div style="flex-grow: 1">
            <div class="my-search-top">
                <div :class="{ 'my-active': input1Focus }" class="my-search-input">
                    <input @blur="input1Focus = false" @focus="input1Focus = true" @keydown="onKeyDown" @input="onInput" ref="input1" type="text" v-model="text" />
                    <span :class="{ 'my-active': ignoreCase }" @click="changeCase" class="my-search-suffix" title="Match Case(Alt+C)">Aa</span>
                    <span :class="{ 'my-active': wholeWord }" @click="changeWhole" class="my-search-suffix iconfont icon-whole-word" title="Match Whole Word(Alt+W)"></span>
                </div>
                <div v-if="count">
                    <span>{{ now }}</span>
                    <span>&nbsp;of&nbsp;</span>
                    <span>{{ count }}</span>
                </div>
                <span class="no-result" :class="{ 'my-active': text }" v-else>No results</span>
            </div>
            <div class="my-search-bottom" style="margin-top: 5px" v-if="replaceVisible">
                <div :class="{ 'my-active': input2Focus }" class="my-search-input">
                    <input @blur="input2Focus = false" @focus="input2Focus = true" @keydown="onKeyDown2" ref="input2" type="text" v-model="replaceText" />
                </div>
                <span
                    :class="{ 'enabled-color': count > 0, 'disabled-color': count == 0 }"
                    @click="replace"
                    class="iconfont icon-replace active-click"
                    style="margin-right: 5px"
                    title="Replace(Enter)"
                    tabindex="-1"
                ></span>
                <span
                    :class="{ 'enabled-color': count > 0, 'disabled-color': count == 0 }"
                    @click="replaceAll"
                    class="iconfont icon-replace-all active-click"
                    style="margin-right: 5px"
                    title="Replace All(Ctrl+Alt+Enter)"
                    tabindex="-1"
                ></span>
            </div>
        </div>
        <div class="my-search-right">
            <span
                :class="{ 'enabled-color': count > 0, 'disabled-color': count == 0 }"
                @click="searchPrev"
                class="iconfont icon-up active-click"
                style="margin-right: 5px"
                title="Previous Match(Shift Enter)"
                tabindex="-1"
            ></span>
            <span
                :class="{ 'enabled-color': count > 0, 'disabled-color': count == 0 }"
                @click="searchNext"
                class="iconfont icon-down active-click"
                style="margin-right: 5px"
                title="Next Match(Enter)"
                tabindex="-1"
            ></span>
            <span @click="close" class="iconfont icon-close active-click" title="Close"></span>
        </div>
    </div>
</template>
<script>
export default {
    name: 'Search',
    props: {
        now: {
            type: Number,
            default: 1,
        },
        count: {
            type: Number,
            default: 0,
        },
    },
    data() {
        return {
            text: '',
            replaceText: '',
            replaceVisible: false,
            wholeWord: false,
            ignoreCase: false,
            searchPrevActive: false,
            searchNextActive: false,
            input1Focus: false,
            input2Focus: false,
        };
    },
    created() {},
    methods: {
        initData(obj) {
            for (let key in obj) {
                this[key] = obj[key];
            }
        },
        getData() {
            return {
                text: this.text,
                wholeWord: this.wholeWord,
                ignoreCase: this.ignoreCase,
            }
        },
        search() {
            let searchId = this.search.id || 1;
            this.search.id = searchId;
            this.$nextTick(() => {
                if (this.search.id !== searchId) {
                    return;
                }
                this.$emit('search', {
                    text: this.text,
                    ignoreCase: this.ignoreCase,
                    wholeWord: this.wholeWord,
                });
            });
        },
        changeCase() {
            this.ignoreCase = !this.ignoreCase;
            this.focus();
            this.search();
        },
        changeWhole() {
            this.wholeWord = !this.wholeWord;
            this.focus();
            this.search();
        },
        showReplace() {
            this.replaceVisible = !this.replaceVisible;
        },
        searchNext() {
            if (!this.count) {
                return;
            }
            this.searchNextActive = true;
            this.focus();
            this.$emit('next');
        },
        searchPrev() {
            if (!this.count) {
                return;
            }
            this.searchPrevActive = true;
            this.focus();
            this.$emit('prev');
        },
        replace() {
            if (!this.count) {
                return;
            }
            this.$emit('replace', { text: this.replaceText });
        },
        replaceAll() {
            if (!this.count) {
                return;
            }
            this.$emit('replaceAll', { text: this.replaceText });
        },
        close() {
            this.$emit('close');
        },
        focus() {
            this.$nextTick(() => {
                this.$refs.input1.focus();
            });
        },
        directBlur() {
            this.searchPrevActive = false;
            this.searchNextActive = false;
        },
        onKeyDown(e) {
            if (!this.count) {
                return;
            }
            if (e.keyCode === 13 || e.keyCode === 100) {
                if (this.searchPrevActive || (!this.searchNextActive && e.shiftKey)) {
                    this.$emit('prev');
                } else {
                    this.$emit('next');
                }
            }
        },
        onKeyDown2(e) {
            if (!this.count) {
                return;
            }
            if (e.keyCode === 13 || e.keyCode === 100) {
                if (e.ctrlKey && e.altKey) {
                    this.replaceAll();
                } else {
                    this.replace();
                }
            }
        },
        onInput() {
            clearTimeout(this.searchTimer);
            this.searchTimer = setTimeout(() => {
                this.search();
            }, 100);
        },
    },
};
</script>