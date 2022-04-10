<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
    <div @selectstart.prevent class="my-editor-bar">
        <div class="bar-scroller my-scroll-overlay">
            <div
                :class="{ active: item.active }"
                :title="item.path"
                @click="onClickItem(item.id)"
                @contextmenu.prevent.stop="onContextmenu($event, item.id)"
                class="bar-item my-hover"
                v-for="item in editorList"
            >
                <span class="bar-text">{{ item.name }}</span>
                <div class="bar-icon">
                    <span
                        @click.stop="onClose(item.id)"
                        class="bar-close-icon iconfont icon-close"
                        title="close"
                        v-show="item.saved"
                    ></span>
                    <span class="bar-dot" v-show="!item.saved"></span>
                </div>
            </div>
        </div>
        <editor-bar-menu ref="editorBarMenu"></editor-bar-menu>
    </div>
</template>
<script>
import EditorBarMenu from "./EditorBarMenu";
import ShortCut from "@/module/shortcut/editor-bar";
import $ from "jquery";

export default {
    name: "EditorBar",
    components: {
        EditorBarMenu,
    },
    props: {
        editorList: {
            type: Array,
        },
    },
    data() {
        return {
            list: [],
        };
    },
    provide() {
        return {
            rootList: this.list,
        };
    },
    created() {
        this.shortcut = new ShortCut(this);
        $(window).on("keydown", (e) => {
            this.shortcut.onKeyDown(e);
        });
    },
    mounted() {},
    methods: {
        onClickItem(id) {
            this.$emit("change", id);
        },
        onClose(id) {
            this.$emit("close", id);
        },
        onContextmenu(e, id) {
            this.$refs.editorBarMenu.show(e, id);
        },
    },
};
</script>