<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
    <div class="my-side-search">
        <div class="my-search-wrap">
            <div class="my-search-condition">
                <div class="side-search-title my-shadow">SEARCH</div>
                <div style="position: relative; padding: 0 10px 0 20px">
                    <div class="my-search-left active-click" style="border-radius: 0" tabindex="-1" @click="replaceVisible = !replaceVisible">
                        <span :class="{ 'icon-down1': replaceVisible, 'icon-right': !replaceVisible }" class="iconfont" style="font-size: 14px" title="Toggle Replace mode"></span>
                    </div>
                    <div :class="{ 'my-active': input1Focus }" class="my-search-input">
                        <textarea
                            @blur="input1Focus = false"
                            @focus="input1Focus = true"
                            @keydown="onKeyDown1"
                            ref="input1"
                            :style="{ height: input1Height + 'px' }"
                            type="text"
                            spellcheck="false"
                            v-model="text"
                        ></textarea>
                        <span :class="{ 'my-active': ignoreCase }" @click="changeCase" class="my-search-suffix" title="Match Case(Alt+C)">Aa</span>
                        <span :class="{ 'my-active': wholeWord }" @click="changeWhole" class="my-search-suffix iconfont icon-whole-word" title="Match Whole Word(Alt+W)"></span>
                    </div>
                    <div class="my-center-start" style="margin-top: 10px" v-show="replaceVisible">
                        <div :class="{ 'my-active': input2Focus }" class="my-search-input" style="flex-grow: 1">
                            <textarea
                                @blur="input2Focus = false"
                                @focus="input2Focus = true"
                                @keydown="onKeyDown2"
                                ref="input2"
                                :style="{ height: input2Height + 'px' }"
                                type="text"
                                v-model="replaceText"
                                spellcheck="false"
                            ></textarea>
                        </div>
                        <span
                            :class="{ 'enabled-color': results.length > 0, 'disabled-color': results.length == 0 }"
                            @click="replaceAll"
                            class="iconfont icon-replace-all active-click"
                            style="margin-left: 10px"
                            title="Replace All(Ctrl+Alt+Enter)"
                            tabindex="-1"
                        ></span>
                    </div>
                </div>
                <div style="padding: 0 10px 0 20px">
                    <div style="line-height: 30px">files to include</div>
                    <div :class="{ 'my-active': input3Focus }" class="my-search-input">
                        <textarea
                            @blur="input3Focus = false"
                            @focus="input3Focus = true"
                            @keydown="onKeyDown3"
                            ref="input2"
                            :style="{ height: input3Height + 'px' }"
                            type="text"
                            v-model="includePath"
                            spellcheck="false"
                        ></textarea>
                    </div>
                    <div style="line-height: 30px">files to include</div>
                    <div :class="{ 'my-active': input4Focus }" class="my-search-input">
                        <textarea
                            @blur="input4Focus = false"
                            @focus="input4Focus = true"
                            @keydown="onKeyDown4"
                            ref="input2"
                            :style="{ height: input4Height + 'px' }"
                            type="text"
                            v-model="excludePath"
                            spellcheck="false"
                        ></textarea>
                    </div>
                    <div style="height: 30px; line-height: 30px">
                        <span v-if="count">{{ count }} results in {{ results.length }} files</span>
                    </div>
                </div>
            </div>
            <div class="my-search-results">
                <file-content-search-results :list="results"></file-content-search-results>
            </div>
        </div>
    </div>
</template>
<script>
import FileContentSearchResults from './FileContentSearchResults.vue';
import Searcher from '../module/file-content-search';
export default {
    components: {
        FileContentSearchResults,
    },
    data() {
        return {
            text: '',
            replaceText: '',
            replaceVisible: true,
            wholeWord: false,
            ignoreCase: false,
            input1Focus: false,
            input2Focus: false,
            input3Focus: false,
            input4Focus: false,
            input1Height: 30,
            input2Height: 30,
            input3Height: 30,
            input4Height: 30,
            includePath: '',
            excludePath: '',
            results: [],
            count: 0,
        };
    },
    watch: {
        text() {
            let lines = this.text.split(/\n/);
            this.input1Height = lines.length * 20 + 10;
            this.search();
        },
        includePath() {
            this.search();
        },
        excludePath() {
            this.search();
        },
        replaceText() {
            let lines = this.replaceText.split(/\n/);
            this.input2Height = lines.length * 20 + 10;
        },
    },
    created() {
        this.searcher = new Searcher();
    },
    mounted() {},
    methods: {
        search() {
            if (!this.includePath || !this.text || this.includePath === this.excludePath) {
                this.results = [];
                return;
            }
            this.searchTimer = setTimeout(() => {
                let file = { path: '' };
                this.results = [];
                this.count = 0;
                this.searcher
                    .search({
                        path: this.includePath,
                        ignoreCase: this.ignoreCase,
                        wholeWord: this.wholeWord,
                        text: this.text,
                    })
                    .$on('find', (results) => {
                        let result = results[0];
                        results.forEach((item) => {
                            item.open = false;
                            item.active = false;
                        });
                        if (result.path !== file.path) {
                            file = { path: result.path, name: result.name, children: [], open: true };
                            this.results.push(file);
                        }
                        file.children.push(...results);
                        this.results = this.results.slice();
                        this.count += results.length;
                    });
            }, 300);
        },
        changeCase() {
            this.ignoreCase = !this.ignoreCase;
            this.search();
        },
        changeWhole() {
            this.wholeWord = !this.wholeWord;
            this.search();
        },
        replaceAll() {},
        onKeyDown1(e) {
            if (e.keyCode === 13 || e.keyCode === 100) {
                e.preventDefault();
                this.search();
            }
        },
        onKeyDown2(e) {
            if (e.keyCode === 13 || e.keyCode === 100) {
                e.preventDefault();
                this.replaceAll();
            }
        },
        onKeyDown3(e) {
            if (e.keyCode === 13 || e.keyCode === 100) {
                e.preventDefault();
                this.search();
            }
        },
        onKeyDown4(e) {
            if (e.keyCode === 13 || e.keyCode === 100) {
                e.preventDefault();
                this.search();
            }
        },
    },
};
</script>
