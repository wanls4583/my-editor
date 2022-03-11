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
				<editor :active="item.active" :id="item.id" :key="item.id" :ref="'editor'+item.id" @change="onFileChange" v-show="item.active"></editor>
			</template>
		</div>
		<!-- 顶部菜单栏 -->
		<menu-bar :height="topBarHeight" ref="menuBar"></menu-bar>
		<!-- 状态栏 -->
		<status-bar :height="statusHeight" ref="statusBar"></status-bar>
		<!-- <Dialog content="测试内容" title="测试"></Dialog> -->
	</div>
</template>
<script>
import EditorBar from './EditorBar.vue';
import Editor from './Editor.vue';
import MenuBar from './MenuBar';
import StatusBar from './StatusBar';
import SideBar from './SideBar.vue';
import Dialog from './Dialog.vue';
const require = require || window.parent.require;
window.myEditorContext = {};

export default {
    components: {
        Editor,
        EditorBar,
        MenuBar,
        StatusBar,
        SideBar,
        Dialog,
    },
    data() {
        return {
            statusHeight: 30,
            topBarHeight: 35,
            nowId: null,
            idCount: 1,
            titleCount: 1,
            editorList: []
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
                return this.getNowEditor();
            },
            getNowContext: () => {
                return this.getNowContext();
            },
            openFile: (fileObj) => {
                this.openFile(fileObj);
            }
        }
    },
    mounted() {
        window.test = this;
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
                this.getNowEditor().closeAllMenu();
                this.getNowEditor().menuVisble = false;
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
                this.changStatus();
            }
        },
        onCloseTab(id) {
            let tab = this.getTabById(id);
            let index = this.editorList.indexOf(tab);
            this.editorList.splice(index, 1);
            window.myEditorContext[id] = null;
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
        openFile(fileObj) {
            const fs = require('fs');
            let tab = fileObj && this.getTabByPath(fileObj.path);
            if (!tab) {
                let index = -1;
                let name = fileObj && fileObj.name || `Untitled${this.titleCount++}`;
                if (this.editorList.length) {
                    tab = this.getTabById(this.nowId);
                    index = this.editorList.indexOf(tab);
                }
                tab = {
                    id: this.idCount++,
                    name: name,
                    path: fileObj && fileObj.path || '',
                    saved: true,
                    active: false
                }
                this.editorList.splice(index + 1, 0, tab);
            }
            this.onChangeTab(tab.id);
            if (fileObj) {
                fs.readFile(fileObj.path, { encoding: 'utf8' }, (err, data) => {
                    if (err) {
                        throw err;
                    }
                    this.getNowContext().insertContent(data);
                    tab.saved = true;
                });
            }
        },
        onFileChange(id) {
            let tab = this.getTabById(id);
            tab.saved = false;
        },
        changStatus() {
            let changStatusId = this.changStatus.id || 1;
            this.changStatus.id = changStatusId;
            this.$nextTick(() => {
                if (this.changStatus.id !== changStatusId) {
                    return;
                }
                let editor = this.getNowEditor();
                let statusBar = this.$refs.statusBar;
                statusBar.language = editor.language;
                statusBar.tabSize = editor.tabSize;
                if (editor.nowCursorPos) {
                    statusBar.line = editor.nowCursorPos.line;
                    statusBar.column = editor.nowCursorPos.column;
                } else {
                    statusBar.line = '?';
                    statusBar.column = '?';
                }
            });
        },
        getTabById(id) {
            for (let i = 0; i < this.editorList.length; i++) {
                if (this.editorList[i].id === id) {
                    return this.editorList[i];
                }
            }
        },
        getTabByPath(path) {
            for (let i = 0; i < this.editorList.length; i++) {
                if (this.editorList[i].path === path) {
                    return this.editorList[i];
                }
            }
        },
        getNowEditor() {
            let editor = this.$refs[`editor${this.nowId}`];
            return editor && editor[0];
        },
        getNowContext() {
            return window.myEditorContext[this.nowId];
        },
    }
}
</script>