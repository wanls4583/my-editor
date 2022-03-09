<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
	<div :style="{'padding-top':_topBarHeight,'padding-bottom':_statusHeight}" @mousedown="onClickEditor" class="my-editor-window" ref="window">
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
export default {
    components: {
        Editor,
        MenuBar,
        StatusBar
    },
    data() {
        return {
            statusHeight: 23,
            topBarHeight: 28,
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
    mounted() {
        this.$editor = this.$refs.editor;
        this.$menuBar = this.$refs.menuBar;
        this.$statusBar = this.$refs.statusBar;
        this.$refs.menuBar.initData(this.$editor);
        this.$refs.statusBar.initData(this.$editor);
    },
    methods: {
        // 点击编辑器
        onClickEditor() {
            this.$refs.statusBar.closeAllMenu();
            this.$refs.menuBar.closeAllMenu();
            this.$editor.menuVisble = false;
        },
    }
}
</script>>