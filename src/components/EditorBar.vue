<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
    <div @selectstart.prevent class="my-editor-bar" ref="editorBar">
        <div class="bar-scroller my-scroll-overlay my-scroll-mini">
            <div
                :class="[item.active ? 'my-active' : '']"
                :title="item.path"
                @click="onClickItem(item.id)"
                @contextmenu.prevent.stop="onContextmenu($event, item.id)"
                class="bar-item my-hover"
                v-for="item in editorList"
            >
                <div class="bar-content" :class="[item.icon]">
                    <span class="bar-text">{{ item.name }}</span>
                    <div class="bar-icon">
                        <span @click.stop="onClose(item.id)" class="bar-close-icon iconfont icon-close" title="close" v-show="item.saved"></span>
                        <span class="bar-dot" v-show="!item.saved"></span>
                    </div>
                </div>
            </div>
        </div>
        <editor-bar-menu ref="editorBarMenu"></editor-bar-menu>
    </div>
</template>
<script>
import EditorBarMenu from './EditorBarMenu';
import ShortCut from '@/module/shortcut/editor-bar';
import EventBus from '@/event';
import $ from 'jquery';

export default {
    name: 'EditorBar',
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
        this.initEventBus();
        $(window).on('keydown', (e) => {
            this.shortcut.onKeyDown(e);
        });
    },
    methods: {
        initEventBus() {
            EventBus.$on('tab-change', (data) => {
                this.$nextTick(() => {
                    let $tab = $(this.$refs.editorBar).find('div.my-active');
                    $tab.length && $tab[0].scrollIntoView();
                });
            });
        },
        onClickItem(id) {
            this.$emit('change', id);
        },
        onClose(id) {
            this.$emit('close', id);
        },
        onContextmenu(e, id) {
            this.$refs.editorBarMenu.show(e, id);
        },
    },
};
</script>