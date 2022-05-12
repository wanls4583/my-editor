<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
    <div @contextmenu.prevent.stop="onContextmenu" @selectstart.prevent class="my-side-bar" ref="sideBar">
        <div class="my-height-100" style="overflow: hidden">
            <div class="side-bar-title my-shadow">EXPLORER</div>
            <side-tree :list="list"></side-tree>
        </div>
        <SideBarMenu ref="sideBarMenu"></SideBarMenu>
        <SideTreMenu ref="sideTreeMenu"></SideTreMenu>
    </div>
</template>
<script>
import SideTree from './SideTree';
import SideBarMenu from './SideBarMenu';
import SideTreMenu from './SideTreMenu';
import globalData from '@/data/globalData';

export default {
    components: {
        SideTree,
        SideBarMenu,
        SideTreMenu,
    },
    data() {
        return {
            list: globalData.fileTree,
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
        initEvent() {},
        onContextmenu(e) {},
    },
};
</script>
