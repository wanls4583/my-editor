<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
	<div :style="{'padding-top':_topBarHeight,'padding-bottom':_statusHeight}" @mousedown="onClickEditor" class="my-editor-window" ref="window">
		<!-- 侧边栏 -->
		<side-bar ref="sideBar"></side-bar>
		<div class="my-editor-right-wrap">
			<!-- tab栏 -->
			<editor-bar :editorList="editorList" @change="onChangeTab" ref="editorBar"></editor-bar>
			<!-- 编辑区 -->
			<template v-for="item in editorList">
				<editor :height="topBarHeight" :id="item.id" :ref="'editor'+item.id" v-show="item.id===nowId"></editor>
			</template>
		</div>
		<!-- 顶部菜单栏 -->
		<menu-bar :height="topBarHeight" ref="menuBar"></menu-bar>
		<!-- 状态栏 -->
		<status-bar :height="statusHeight" ref="statusBar"></status-bar>
	</div>
</template>
<script>
import EditorBar from './EditorBar.vue';
import Editor from './Editor.vue';
import MenuBar from './MenuBar';
import StatusBar from './StatusBar';
import SideBar from './SideBar.vue';
export default {
    components: {
        Editor,
        EditorBar,
        MenuBar,
        StatusBar,
        SideBar
    },
    data() {
        return {
            statusHeight: 30,
            topBarHeight: 35,
            nowId: 1,
            editorList: [{
                id: 1,
                name: 'Untitled1',
                path: '',
                saved: false,
                active: true
            }, {
                id: 2,
                name: 'Untitled2',
                path: '',
                saved: true,
                active: false
            }]
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
            getNowEditor: () => {
                return this.$refs[`editor${this.nowId}`][0];
            },
        }
    },
    mounted() {
        this.$editorBar = this.$refs.editorBar;
        this.$menuBar = this.$refs.menuBar;
        this.$statusBar = this.$refs.statusBar;
    },
    methods: {
        // 点击编辑器
        onClickEditor() {
            this.$refs.statusBar.closeAllMenu();
            this.$refs.menuBar.closeAllMenu();
            this.$refs.sideBar.closeAllMenu();
            this.$refs.editorBar.closeAllMenu();
            if (this.nowId) {
                this.$refs[`editor${this.nowId}`][0].closeAllMenu();
                this.$refs[`editor${this.nowId}`][0].menuVisble = false;
            }
        },
        onChangeTab(id) {
            this.nowId = id;
        }
    }
}
</script>>