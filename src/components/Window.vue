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
			<editor-bar
				:editorList="editorList"
				@change="onChangeTab"
				@close="onCloseTab"
				@close-all="onCloseAll"
				@close-saved="onCloseSaved"
				@close-to-left="onCloseToLeft"
				@close-to-right="onCloseToRight"
				ref="editorBar"
				v-show="editorList.length"
			></editor-bar>
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
			<window-menu ref="winMenu"></window-menu>
		</div>
		<!-- 顶部菜单栏 -->
		<menu-bar :height="topBarHeight" ref="menuBar"></menu-bar>
		<!-- 状态栏 -->
		<status-bar :height="statusHeight" ref="statusBar"></status-bar>
		<Dialog
			:btns="dialogBtns"
			:content="dialogContent"
			:icon="this.dialogIcon"
			:icon-color="this.dialogIconColor"
			:overlay="true"
			:title="dialogTilte"
			@close="onDialogClose"
			v-show="dialogVisible"
		></Dialog>
	</div>
</template>
<script>
import EditorBar from './EditorBar.vue';
import Editor from './Editor.vue';
import MenuBar from './MenuBar';
import StatusBar from './StatusBar';
import SideBar from './SideBar.vue';
import Dialog from './Dialog.vue';
import WindowMenu from './WindowMenu.vue';
import $ from 'jquery';

const require = require || window.parent.require;
const remote = require('@electron/remote');
const currentWindow = remote.getCurrentWindow();
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
        WindowMenu,
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
            dialogIcon: '',
            dialogIconColor: '',
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
            openFile: (fileObj, choseFile) => {
                this.openFile(fileObj, choseFile);
            },
            openFolder: () => {
                this.openFolder();
            }
        }
    },
    created() {
        currentWindow.on('resize', () => {
            let editor = this.getNowEditor();
            editor && editor.showEditor();
        });
    },
    mounted() {
        window.test = this;
    },
    methods: {
        onContextmenu(e) {
            // this.$refs.winMenu.show(e);
        },
        // 点击编辑器
        onWindMouseDown() {
            this.$refs.winMenu.hide();
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
                this.editorList.forEach((item) => {
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
            if (!this.nowId) {
                return;
            }
            let tab = this.getTabById(id || this.nowId);
            let index = this.editorList.indexOf(tab);
            if (!tab.saved) {
                this.showDialog({
                    content: '文件尚未保存，是否先保存文件？',
                    cancel: true,
                    icon: 'icon-warnfill',
                    iconColor: 'rgba(255,196,0)',
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
        onCloseAll() {
            this.editorList = this.editorList.filter((item) => {
                return !item.saved;
            });
            this.editorList.forEach((item) => {
                this.onCloseTab(item.id);
            });
            this.nowId = null;
        },
        onCloseSaved() {
            this.editorList.slice().forEach((item) => {
                if (item.saved) {
                    this.onCloseTab(item.id);
                }
            });
        },
        onCloseToLeft(id) {
            let tab = null;
            id = id || this.nowId;
            while (tab = this.editorList[0]) {
                if (tab.id !== id) {
                    this.onCloseTab(tab.id);
                } else {
                    break;
                }
            }
        },
        onCloseToRight(id) {
            let tab = null;
            id = id || this.nowId;
            while (tab = this.editorList.peek()) {
                if (tab.id !== id) {
                    this.onCloseTab(tab.id);
                } else {
                    break;
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
        openFolder() {
            this.choseFolder().then((results) => {
                if (results) {
                    this.$refs.sideBar.list = results;
                    this.editorList = [];
                    this.nowId = null;
                }
            });
        },
        choseFolder() {
            let win = remote.getCurrentWindow();
            let options = {
                title: '选择文件夹',
                properties: ['openDirectory', 'multiSelections']
            };
            return remote.dialog.showOpenDialog(win, options).then(result => {
                let results = [];
                if (!result.canceled && result.filePaths) {
                    result.filePaths.forEach((item) => {
                        let obj = {
                            name: item.match(/[^\\\/]+$/)[0],
                            path: item,
                            type: 'dir',
                            active: false,
                            open: false,
                            children: []
                        };
                        results.push(Object.assign({}, obj));
                    });
                    return results;
                }
            }).catch(err => {
                console.log(err)
            })
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
                        if (results) {
                            tab = results[0];
                            this.editorList = this.editorList.slice(0, index).concat(results).concat(this.editorList.slice(index));
                            _done.call(this);
                        }
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
                this.$nextTick(() => {
                    if (tab && tab.path && !tab.loaded) {
                        let fileType = tab.name.match(/\.[^\.]+?$/i);
                        let language = '';
                        fileType = fileType && fileType[0].toLowerCase().slice(1) || '';
                        switch (fileType) {
                            case 'html':
                            case 'xml':
                            case 'vue':
                                language = 'HTML';
                                break;
                            case 'js':
                                language = 'JavaScript';
                                break;
                            case 'css':
                                language = 'CSS';
                                break;
                        }
                        this.getEditor(tab.id).language = language;
                        fs.readFile(tab.path, { encoding: 'utf8' }, (err, data) => {
                            if (err) {
                                throw err;
                            }
                            this.getContext(tab.id).insertContent(data);
                            tab.saved = true;
                            tab.loaded = true;
                        });
                    }
                    this.onChangeTab(tab.id);
                });
            }
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
                    result.filePaths.forEach((item) => {
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
        sortFileList() {
            this.list.sort((a, b) => {
                if (a.type === b.type) {
                    if (a.name === b.name) {
                        return 0;
                    } else if (a.name > b.name) {
                        return 1
                    } else {
                        return -1;
                    }
                }
                if (a.type === 'dir') {
                    return -1;
                }
                return 1;
            });
        },
        showDialog(option) {
            this.dialogTilte = option.title || '';
            this.dialogContent = option.content || '';
            this.dialogBtns = option.btns;
            this.dialogVisible = true;
            this.dialogIconColor = option.iconColor || '';
            this.dialogIcon = option.icon || '';
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
                statusBar.setLanguage(editor.language);
                statusBar.setTabsize(editor.tabSize);
                if (editor.nowCursorPos) {
                    statusBar.setLine(editor.nowCursorPos.line);
                    statusBar.setColumn(editor.nowCursorPos.column);
                } else {
                    statusBar.setLine('?');
                    statusBar.setColumn('?');
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
        getEditor(id) {
            let editor = this.$refs[`editor${id}`];
            return editor && editor[0];
        },
        getNowEditor() {
            return this.getEditor(this.nowId);
        },
        getContext(id) {
            return window.myEditorContext[id];
        },
        getNowContext() {
            return this.getContext(this.nowId);
        },
    }
}
</script>