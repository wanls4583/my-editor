<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
	<div :style="{'padding-top':_topBarHeight,'padding-bottom':_statusHeight}" @mousedown="onClickEditor" class="my-editor-window" ref="window">
		<!-- 侧边栏 -->
		<side-bar ref="sideBar"></side-bar>
		<!-- 编辑区 -->
		<editor :height="topBarHeight" ref="editor"></editor>
		<!-- 顶部菜单栏 -->
		<menu-bar :height="topBarHeight" ref="menuBar"></menu-bar>
		<!-- 状态栏 -->
		<status-bar :height="statusHeight" ref="statusBar"></status-bar>
	</div>
</template>
<script>
import Editor from './Editor.vue';
import MenuBar from './MenuBar';
import StatusBar from './StatusBar';
import SideBar from './SideBar.vue';
export default {
    components: {
        Editor,
        MenuBar,
        StatusBar,
        SideBar
    },
    data() {
        return {
            statusHeight: 30,
            topBarHeight: 35,
        }
    },
    computed: {
        _topBarHeight() {
            return this.topBarHeight + 'px';
        },
        _statusHeight() {
            return this.statusHeight + 'px';
        },
    },
    provide() {
        return {
            getEditor: () => {
                return this.$refs.editor;
            },
            getContext: () => {
                return this.$refs.editor.getContext();
            }
        }
    },
    mounted() {
        this.$editor = this.$refs.editor;
        this.$menuBar = this.$refs.menuBar;
        this.$statusBar = this.$refs.statusBar;
    },
    methods: {
        // 点击编辑器
        onClickEditor() {
            this.$refs.statusBar.closeAllMenu();
            this.$refs.menuBar.closeAllMenu();
            this.$refs.sideBar.closeAllMenu();
            this.$refs.editor.closeAllMenu();
            this.$editor.menuVisble = false;
        },
    }
}
</script>>