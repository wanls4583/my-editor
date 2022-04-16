<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
    <div
        @contextmenu.prevent.stop="onContextmenu"
        @selectstart.prevent
        class="my-side-bar"
        ref="sideBar"
        :style="{ width: width + 'px' }"
    >
        <div class="my-height-100" style="overflow: hidden">
            <div class="side-bar-title my-shadow">EXPLORER</div>
            <side-tree :list="list"></side-tree>
        </div>
        <SideBarMenu ref="sideBarMenu"></SideBarMenu>
        <div class="my-sash-v" @mousedown="onSashBegin"></div>
    </div>
</template>
<script>
import SideTree from './SideTree';
import SideBarMenu from './SideBarMenu';
import EventBus from '@/event';
import $ from 'jquery';

export default {
    components: {
        SideTree,
        SideBarMenu,
    },
    data() {
        return {
            width: 300,
            list: [],
        };
    },
    provide() {
        return {
            getRootList: () => {
                return this.list;
            },
        };
    },
    mounted() {
        this.initEvent();
    },
    methods: {
        initEvent() {
            $(document)
                .on('mousemove', (e) => {
                    if (this.mouseObj) {
                        let width = (this.width += e.clientX - this.mouseObj.clientX);
                        let pWidth = $(this.$refs.sideBar).parent().width();
                        width = width < 10 ? 10 : width;
                        width = width > pWidth - 100 ? pWidth - 100 : width;
                        this.width = width;
                        this.mouseObj = e;
                    }
                })
                .on('mouseup', (e) => {
                    this.mouseObj = null;
                });
        },
        onContextmenu(e) {
            // EventBus.$emit("open-side-menu");
        },
        onSashBegin(e) {
            this.originMouseObj = e;
            this.mouseObj = e;
        },
    },
};
</script>