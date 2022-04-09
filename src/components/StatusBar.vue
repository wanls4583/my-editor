<!--
 * @Author: lisong
 * @Date: 2021-12-09 21:38:38
 * @Description: 
-->
<template>
    <div
        :style="{ height: height + 'px' }"
        @contextmenu.stop.prevent
        class="my-status-bar my-width-100"
    >
        <div class="my-height-100 my-center-between">
            <div class="bar-left">
                <div class="bar-item" v-if="hasEditor">
                    <span>Line {{ line }}, Column {{ column }}</span>
                </div>
            </div>
            <div class="bar-right">
                <div
                    @mousedown.stop="showTabsize"
                    class="bar-item my-hover"
                    v-if="hasEditor"
                >
                    <span>Tab Size:{{ tabSize }}</span>
                    <Menu
                        :menuList="tabSizeList"
                        :styles="{ right: 0, bottom: height + 'px' }"
                        :value="tabSize"
                        @change="onTabsizeChange"
                        v-show="tabsizeVisible"
                    ></Menu>
                </div>
                <div
                    @mousedown.stop="showLanguage"
                    class="bar-item my-hover"
                    v-if="hasEditor"
                >
                    <span>{{ _language }}</span>
                </div>
            </div>
        </div>
    </div>
</template>
<script>
import Menu from "./Menu";
import EventBus from "@/event";

export default {
    name: "StatusBar",
    props: {
        height: {
            type: Number,
            default: 25,
        },
        languageList: Array,
    },
    components: {
        Menu,
    },
    data() {
        return {
            line: 1,
            column: 0,
            tabSize: 4,
            language: "",
            tabsizeVisible: false,
            hasEditor: false,
            tabSizeList: [[]],
            languages: [[]],
            languageMap: {},
        };
    },
    watch: {
        languageList() {
            let languageMap = {};
            this.languageList.forEach((item) => {
                languageMap[item.value] = item.name;
            });
            this.languages = [this.languageList];
            this.languageMap = languageMap;
        },
    },
    computed: {
        _language() {
            return this.languageMap[this.language];
        },
    },
    created() {
        this.initEventBus();
        for (let i = 1; i <= 8; i++) {
            this.tabSizeList[0].push({
                name: `Tab Width：${i}`,
                value: i,
            });
        }
    },
    mounted() {},
    methods: {
        initEventBus() {
            EventBus.$on("tab-change", (data) => {
                if (data) {
                    this.language = data.language;
                    this.tabSize = data.tabSize;
                    this.line = data.line;
                    this.column = data.column;
                    this.hasEditor = true;
                } else {
                    this.hasEditor = false;
                }
            });
            EventBus.$emit("cursor-change", (data) => {
                this.line = data.line;
                this.column = data.column;
            });
            EventBus.$on("language-change", (language) => {
                this.language = language;
            });
        },
        showTabsize() {
            let visible = this.tabsizeVisible;
            this.closeAllMenu();
            this.tabsizeVisible = !visible;
        },
        showLanguage() {
            this.closeAllMenu();
            this.$emit("select-langeuage");
        },
        closeAllMenu() {
            this.tabsizeVisible = false;
        },
        onTabsizeChange(item) {
            if (this.tabSize != item.value) {
                this.$emit("tab-size-change", item.value);
            }
            this.tabsizeVisible = false;
        },
    },
};
</script>