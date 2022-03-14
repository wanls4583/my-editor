<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
	<div :style="{'padding-top':_topBarHeight,'padding-bottom':_statusHeight}" @mousedown="onWindMouseDown" class="my-editor-window" ref="window">
		<!-- 侧边栏 -->
		<side-bar ref="sideBar"></side-bar>
		<div @contextmenu.prevent.stop="onContextmenu" class="my-editor-right-wrap" ref="rightWrap">
			<!-- tab栏 -->
			<editor-bar :editorList="editorList" @change="onChangeTab" @close="onCloseTab" ref="editorBar" v-show="editorList.length"></editor-bar>
			<!-- 编辑区 -->
			<template v-for="item in editorList">
				<editor
					:active="item.active"
					:id="item.id"
					:key="item.id"
					:ref="'editor'+item.id"
					@change="onFileChange(item.id)"
					@save="onSaveFile(item.id)"
					v-show="item.active"
				></editor>
			</template>
			<Menu :checkable="false" :menuList="menuList" :styles="menuStyle" @change="onMenuChange" ref="menu" v-show="menuVisible"></Menu>
		</div>
		<!-- 顶部菜单栏 -->
		<menu-bar :height="topBarHeight" ref="menuBar"></menu-bar>
		<!-- 状态栏 -->
		<status-bar :height="statusHeight" ref="statusBar"></status-bar>
		<Dialog :btns="dialogBtns" :content="dialogContent" :title="dialogTilte" @close="onDialogClose" v-show="dialogVisible"></Dialog>
	</div>
</template>
<script>
import EditorBar from './EditorBar.vue';
import Editor from './Editor.vue';
import MenuBar from './MenuBar';
import StatusBar from './StatusBar';
import SideBar from './SideBar.vue';
import Dialog from './Dialog.vue';
import Menu from './Menu.vue';
import $ from 'jquery';

const require = require || window.parent.require;
const remote = require('@electron/remote');
const fs = require('fs');

window.myEditorContext = {};

export default {
    components: {
        Editor,
        EditorBar,
        MenuBar,
        StatusBar,
        SideBar,
        Dialog,
        Menu,
    },
    data() {
        return {
            statusHeight: 30,
            topBarHeight: 35,
            nowId: null,
            idCount: 1,
            titleCount: 1,
            editorList: [],
            dialogTilte: '',
            dialogContent: '',
            dialogVisible: false,
            dialogBtns: [],
            menuList: [
                [{
                    name: 'New File',
                    op: 'newFile',
                    shortcut: 'Ctrl+N'
                }, {
                    name: 'Open File',
                    op: 'openFile',
                    shortcut: 'Ctrl+O'
                }]
            ],
            menuVisible: false,
            menuStyle: {
                left: '50%',
                top: '50%'
            }
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
            this.menuVisible = true;
            let $rightWrap = $(this.$refs.rightWrap);
            this.$nextTick(() => {
                let offset = $rightWrap.offset();
                let menuWidth = this.$refs.menu.$el.clientWidth;
                let menuHeight = this.$refs.menu.$el.clientHeight;
                if (menuHeight + e.clientY > offset.top + $rightWrap[0].clientHeight) {
                    this.menuStyle.top = e.clientY - offset.top - menuHeight + 'px';
                } else {
                    this.menuStyle.top = e.clientY - offset.top + 'px';
                }
                if (menuWidth + e.clientX > offset.left + $rightWrap[0].clientWidth) {
                    this.menuStyle.left = e.clientX - offset.left - menuWidth + 'px';
                } else {
                    this.menuStyle.left = e.clientX - offset.left + 'px';
                }
            });
        },
        onMenuChange(item) {
            switch (item.op) {
                case 'newFile':
                    this.openFile();
                    break;
                case 'openFile':
                    this.openFile(null, true);
                    break;
            }
            this.menuVisible = false;
        },
        // 点击编辑器
        onWindMouseDown() {
            this.closeAllMenu();
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
            if (!tab.active) {
                this.editorList.map((item) => {
                    item.active = false;
                });
                tab.active = true;
                this.nowId = id;
                this.changStatus();
            } else {
                this.getNowEditor().focus();
            }
        },
        onCloseTab(id) {
            let tab = this.getTabById(id);
            let index = this.editorList.indexOf(tab);
            if (!tab.saved) {
                this.showDialog({
                    content: '文件尚未保存，是否先保存文件？',
                    cancel: true,
                    btns: [{
                        name: '保存',
                        callback: () => {
                            this.writeFile(tab.path, window.myEditorContext[id].getAllText());
                            _closeTab.call(this);
                            this.onDialogClose();
                        }
                    }, {
                        name: '不保存',
                        callback: () => {
                            _closeTab.call(this);
                            this.onDialogClose();
                        }
                    }]
                });
            } else {
                _closeTab.call(this);
            }

            function _closeTab() {
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
            }
        },
        openFile(fileObj, choseFile) {
            let tab = fileObj && this.getTabByPath(fileObj.path);
            if (!tab) {
                let index = -1;
                let name = fileObj && fileObj.name || `Untitled${this.titleCount++}`;
                if (this.editorList.length) {
                    tab = this.getTabById(this.nowId);
                    index = this.editorList.indexOf(tab);
                }
                if (choseFile) { //从资源管理器中选择文件
                    this.choseFile().then((results) => {
                        tab = results[0];
                        this.editorList = this.editorList.slice(0, index).concat(results).concat(this.editorList.slice(index));
                        _done.call(this);
                    });
                } else {
                    tab = {
                        id: this.idCount++,
                        name: name,
                        path: fileObj && fileObj.path || '',
                        saved: true,
                        active: false
                    }
                    this.editorList.splice(index + 1, 0, tab);
                    _done.call(this);
                }
            } else {
                _done.call(this);
            }

            function _done() {
                this.onChangeTab(tab.id);
                if (tab && tab.path && !tab.loaded) {
                    fs.readFile(tab.path, { encoding: 'utf8' }, (err, data) => {
                        if (err) {
                            throw err;
                        }
                        this.getNowContext().insertContent(data);
                        tab.saved = true;
                        tab.loaded = true;
                    });
                }
            }
        },
        onFileChange(id) {
            let tab = this.getTabById(id);
            tab.saved = false;
        },
        onSaveFile(id) {
            let tab = this.getTabById(id);
            if (!tab.saved) {
                if (tab.path) {
                    this.writeFile(tab.path, window.myEditorContext[id].getAllText());
                    tab.saved = true;
                } else {
                    let win = remote.getCurrentWindow();
                    let options = {
                        title: "请选择要保存的文件名",
                        buttonLabel: "保存",
                    };
                    return remote.dialog.showSaveDialog(win, options).then(result => {
                        if (!result.canceled && result.filePath) {
                            tab.path = result.filePath;
                            tab.name = tab.path.match(/[^\\\/]+$/)[0];
                            this.writeFile(tab.path, window.myEditorContext[id].getAllText());
                            tab.saved = true;
                        }
                    }).catch(err => {
                        console.log(err)
                    })
                }
            }
        },
        onDialogClose() {
            this.dialogVisible = false;
        },
        choseFile() {
            let win = remote.getCurrentWindow();
            let options = {
                title: '选择文件',
                properties: ['openFile', 'multiSelections']
            };
            return remote.dialog.showOpenDialog(win, options).then(result => {
                let results = [];
                if (!result.canceled && result.filePaths) {
                    result.filePaths.map((item) => {
                        let obj = {
                            id: this.idCount++,
                            name: item.match(/[^\\\/]+$/)[0],
                            path: item,
                            saved: true,
                            active: false
                        }
                        results.push(Object.assign({}, obj));
                    });
                    return results;
                }
            }).catch(err => {
                console.log(err)
            })
        },
        showDialog(option) {
            this.dialogTilte = option.title || '';
            this.dialogContent = option.content || '';
            this.dialogBtns = option.btns;
            this.dialogVisible = true;
        },
        writeFile(path, text) {
            fs.writeFileSync(path, text, { encoding: 'utf-8' });
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
        closeAllMenu() {
            this.menuVisible = false;
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