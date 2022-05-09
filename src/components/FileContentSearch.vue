<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
    <div class="my-side-search">
        <div class="my-height-100" style="overflow: hidden">
            <div class="side-search-title my-shadow">SEARCH</div>
            <div style="position: relative; padding: 0 10px 0 20px">
                <div class="my-search-left active-click" style="border-radius: 0" tabindex="-1" @click="replaceVisible = !replaceVisible">
                    <span :class="{ 'icon-down1': replaceVisible, 'icon-right': !replaceVisible }" class="iconfont" style="font-size: 14px" title="Toggle Replace mode"></span>
                </div>
                <div style="flex-grow: 1">
                    <div class="my-search-top">
                        <div :class="{ 'my-active': input1Focus }" class="my-search-input">
                            <textarea
                                @blur="input1Focus = false"
                                @focus="input1Focus = true"
                                @keydown="onKeyDown"
                                @input="onInput"
                                ref="input1"
                                :style="{ height: input1Height + 'px' }"
                                type="text"
                                spellcheck="false"
                                v-model="text"
                            ></textarea>
                            <span :class="{ 'my-active': ignoreCase }" @click="changeCase" class="my-search-suffix" title="Match Case(Alt+C)">Aa</span>
                            <span :class="{ 'my-active': wholeWord }" @click="changeWhole" class="my-search-suffix iconfont icon-whole-word" title="Match Whole Word(Alt+W)"></span>
                        </div>
                    </div>
                    <div class="my-search-bottom">
                        <div :class="{ 'my-active': input2Focus }" class="my-search-input" style="margin-top: 10px" v-show="replaceVisible">
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
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<script>
export default {
    components: {},
    data() {
        return {
            text: '',
            replaceText: '',
            replaceVisible: true,
            wholeWord: false,
            ignoreCase: false,
            input1Focus: false,
            input2Focus: false,
            input1Height: 30,
            input2Height: 30,
        };
    },
    mounted() {},
    methods: {
        changeCase() {
            this.ignoreCase = !this.ignoreCase;
        },
        changeWhole() {
            this.wholeWord = !this.wholeWord;
        },
        replaceAll() {},
        onKeyDown(e) {
            if (e.keyCode === 13 || e.keyCode === 100) {
                e.preventDefault();
            }
        },
        onKeyDown2(e) {
            if (e.keyCode === 13 || e.keyCode === 100) {
                e.preventDefault();
                this.replaceAll();
            }
        },
        onInput() {},
    },
};
</script>
