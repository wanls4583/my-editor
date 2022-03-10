<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
	<div :style="{'padding-top':_topBarHeight,'padding-bottom':_statusHeight}" @mousedown="onWindMouseDown" class="my-editor-window" ref="window">
		<!-- 侧边栏 -->
		<side-bar ref="sideBar"></side-bar>
		<div @contextmenu.prevent="onContextmenu" class="my-editor-right-wrap" ref="rightWrap">
			<!-- tab栏 -->
			<editor-bar :editorList="editorList" @change="onChangeTab" @close="onCloseTab" ref="editorBar"></editor-bar>
			<!-- 编辑区 -->
			<template v-for="item in editorList">
				<editor :active="item.active" :id="item.id" :key="item.id" :ref="'editor'+item.id" v-show="item.active"></editor>
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
window.myEditorContext = {};

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
            idCount: 1,
            editorList: [{
                id: 1,
                name: 'Untitled1',
                path: '',
                saved: false,
                active: true
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
            getNowContext: () => {
                return window.myEditorContext[this.nowId];
            },
        }
    },
    mounted() {

    },
    methods: {
        onContextmenu(e) {

        },
        // 点击编辑器
        onWindMouseDown() {
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
            let tab = this.getTabById(id);
            if (tab && !tab.active) {
                this.editorList.map((item) => {
                    item.active = false;
                });
                tab.active = true;
                this.nowId = id;
            }
        },
        onCloseTab(id) {
            let tab = this.getTabById(id);
            let index = this.editorList.indexOf(tab);
            this.editorList.splice(index, 1);
            if (tab.active) {
                tab.active = false;
                tab = this.editorList[index] || this.editorList[index - 1];
                if (tab) {
                    tab.active = true;
                    this.nowId = tab.id;
                } else {
                    this.nowId = null;
                }
            }
        },
        getTabById(id) {
            for (let i = 0; i < this.editorList.length; i++) {
                if (this.editorList[i].id === id) {
                    return this.editorList[i];
                }
            }
        }
    }
}
</script>>