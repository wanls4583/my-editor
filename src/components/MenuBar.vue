<!--
 * @Author: lisong
 * @Date: 2021-12-09 21:38:38
 * @Description: 
-->
<template>
	<div :style="{height:height+'px'}" @contextmenu.stop.prevent class="my-editor-top-bar">
		<div class="bar-left">
			<div @mousedown.stop="showMemu('fileMenuVisible')" class="bar-item my-editor-clickable">
				<span>File</span>
				<Menu :checkable="false" :menuList="fileMenuList" :styles="{left: 0, top: height+'px'}" @change="onFileMenuChange" v-show="fileMenuVisible"></Menu>
			</div>
			<div @mousedown.stop="showMemu('editMenuVisible')" class="bar-item my-editor-clickable">
				<span>Edit</span>
				<Menu :checkable="false" :menuList="editMenuList" :styles="{left: 0, top: height+'px'}" @change="onEditMenuChange" v-show="editMenuVisible"></Menu>
			</div>
			<div @mousedown.stop="showMemu('selectionMenuVisible')" class="bar-item my-editor-clickable">
				<span>Selection</span>
				<Menu :checkable="false" :menuList="selectionMenuList" :styles="{left: 0, top: height+'px'}" @change="onSelectionMenuChange" v-show="selectionMenuVisible"></Menu>
			</div>
		</div>
		<div class="bar-right">
			<!-- 最小化 -->
			<div @click="onMinimize" class="bar-item my-editor-clickable" style="width:35px;height:35px">
				<span class="iconfont icon-zuixiaohua"></span>
			</div>
			<!-- 还原最大化 -->
			<div @click="onUnmaximize" class="bar-item my-editor-clickable" style="width:35px;height:35px" v-if="maximize">
				<span class="iconfont icon-huanyuan"></span>
			</div>
			<!-- 最大化 -->
			<div @click="onMaximize" class="bar-item my-editor-clickable" style="width:35px;height:35px" v-else>
				<span class="iconfont icon-zuidahua"></span>
			</div>
			<!-- 最小化 -->
			<div @click="onClose" class="bar-item my-editor-clickable-danger" style="width:35px;height:35px">
				<span class="iconfont icon-close" style="font-size:18px"></span>
			</div>
		</div>
	</div>
</template>
<script>
import Util from '@/common/Util';
import Menu from './Menu';
import ShortCut from '@/module/shortcut/menu-bar';
import $ from 'jquery';
const require = require || window.parent.require;
const remote = require('@electron/remote');
const currentWindow = remote.getCurrentWindow();

export default {
    name: 'MenuBar',
    props: {
        height: {
            type: Number,
            default: 25
        },
    },
    components: {
        Menu
    },
    data() {
        return {
            fileMenuVisible: false,
            editMenuVisible: false,
            selectionMenuVisible: false,
            maximize: false,
            fileMenuList: [
                [{
                    name: 'New File',
                    op: 'newFile',
                    shortcut: 'Ctrl+N'
                }],
                [{
                    name: 'Open File',
                    op: 'openFile',
                    shortcut: 'Ctrl+O'
                }, {
                    name: 'Open Folder',
                    op: 'openFolder',
                    shortcut: 'Ctrl+K Ctrl+O'
                }]
            ],
            editMenuList: [
                [{
                    name: 'Undo',
                    op: 'undo',
                    shortcut: 'Ctrl+Z'
                }, {
                    name: 'Redo',
                    op: 'redo',
                    shortcut: 'Ctrl+Y'
                }],
                [{
                    name: 'Cut',
                    op: 'cut',
                    shortcut: 'Ctrl+X'
                }, {
                    name: 'Copy',
                    op: 'copy',
                    shortcut: 'Ctrl+C'
                }, {
                    name: 'Paste',
                    op: 'paste',
                    shortcut: 'Ctrl+V'
                }],
                [{
                    name: 'Delete Line',
                    op: 'deleteLine',
                    shortcut: 'Ctrl+Shift+K'
                }],
                [{
                    name: 'Find',
                    op: 'find',
                    shortcut: 'Ctrl+F'
                }, {
                    name: 'Replace',
                    op: 'replace',
                    shortcut: 'Ctrl+H'
                }]
            ],
            selectionMenuList: [
                [{
                    name: 'Select All',
                    op: 'selectAll',
                    shortcut: 'Ctrl+A'
                }],
                [{
                    name: 'Copy Line Up',
                    op: 'copyLineUp',
                    shortcut: 'Ctrl+Shift+D'
                }, {
                    name: 'Copy Line Down',
                    op: 'copyLineDown',
                    shortcut: 'Alt+Shift+Down'
                }, {
                    name: 'Move Line Up',
                    op: 'moveLineUp',
                    shortcut: 'Ctrl+Shift+Up'
                }, {
                    name: 'Move Line Down',
                    op: 'moveLineDown',
                    shortcut: 'Ctrl+Shift+Down'
                }],
                [{
                    name: 'Add Cursor Above',
                    op: 'addCursorAbove',
                    shortcut: 'Ctrl+Alt+Up'
                }, {
                    name: 'Add Cursor Below',
                    op: 'addCursorBelow',
                    shortcut: 'Ctrl+Alt+Down'
                }, {
                    name: 'Add Cursor to Line Ends',
                    op: 'addCursorLineEnds',
                    shortcut: 'Ctrl+Shift+L'
                }, {
                    name: 'Add Next Occurence',
                    op: 'addNextOccurence',
                    shortcut: 'Ctrl+D'
                }, {
                    name: 'Add Previous Occurence',
                    op: 'addPrevOccurence',
                    shortcut: 'Shift+D'
                }, {
                    name: 'Select All Occurence',
                    op: 'selectAllOccurence',
                }],
                [{
                    name: 'Switch Alt+Click to Multi-Cursor',
                    op: 'switchMultiKeyCode',
                    keyCode: 'ctrl'
                }]
            ]
        }
    },
    computed: {
        editor() {
            return this.getNowEditor();
        },
        context() {
            return this.getNowContext();
        }
    },
    inject: ['getNowEditor', 'getNowContext', 'openFile', 'openFolder'],
    created() {
        this.shortcut = new ShortCut(this);
        $(window).on('keydown', (e) => {
            this.shortcut.onKeyDown(e);
        });
    },
    mounted() {
        this.maximize = currentWindow.isMaximized();
    },
    methods: {
        showMemu(prop) {
            this.closeAllMenu();
            this[prop] = true;
        },
        closeAllMenu() {
            this.fileMenuVisible = false;
            this.editMenuVisible = false;
            this.selectionMenuVisible = false;
        },
        // 最小化
        onMinimize() {
            currentWindow.minimize();
        },
        // 最大化
        onMaximize() {
            currentWindow.maximize();
            this.maximize = true;
        },
        // 最大化
        onUnmaximize() {
            currentWindow.unmaximize();
            this.maximize = false;
        },
        // 关闭窗口
        onClose() {
            currentWindow.close();
        },
        onFileMenuChange(item) {
            switch (item.op) {
                case 'newFile':
                    this.openFile();
                    break;
                case 'openFile':
                    this.openFile(null, true);
                    break;
                case 'openFolder':
                    this.openFolder();
                    break;
            }
            this.fileMenuVisible = false;
        },
        onEditMenuChange(item) {
            if (!this.editor) {
                this.editMenuVisible = false;
                return;
            }
            switch (item.op) {
                case 'undo':
                    this.editor.history.undo();
                    break;
                case 'redo':
                    this.editor.history.redo();
                    break;
                case 'cut':
                    Util.writeClipboard(this.context.getCopyText(true));
                    break;
                case 'copy':
                    Util.writeClipboard(this.context.getCopyText());
                    break;
                case 'paste':
                    Util.readClipboard().then((text) => {
                        this.context.insertContent(text);
                    });
                    break;
                case 'deleteLine':
                    this.context.deleteLine();
                    break;
                case 'find':
                    this.editor.openSearch();
                    break;
                case 'replace':
                    this.editor.openSearch(true);
                    break;
            }
            this.editor.focus();
            this.editMenuVisible = false;
        },
        onSelectionMenuChange(item) {
            if (!this.editor) {
                this.selectionMenuVisible = false;
                return;
            }
            switch (item.op) {
                case 'selectAll':
                    this.editor.selecter.selectAll();
                    break;
                case 'copyLineUp':
                    this.context.copyLineUp();
                    break;
                case 'copyLineDown':
                    this.context.copyLineDown();
                    break;
                case 'moveLineUp':
                    this.context.moveLineUp();
                    break;
                case 'moveLineDown':
                    this.context.moveLineDown();
                    break;
                case 'addCursorAbove':
                    this.editor.cursor.addCursorAbove();
                    break;
                case 'addCursorBelow':
                    this.editor.cursor.addCursorBelow();
                    break;
                case 'addCursorLineEnds':
                    this.editor.cursor.addCursorLineEnds();
                    break;
                case 'addNextOccurence':
                    this.editor.searchWord('next');
                    break;
                case 'addPrevOccurence':
                    this.editor.searchWord('up');
                    break;
                case 'selectAllOccurence':
                    this.editor.selecter.selectAllOccurence();
                    break;
                case 'switchMultiKeyCode':
                    this.editor.cursor.switchMultiKeyCode();
                    item.keyCode = this.editor.cursor.multiKeyCode;
                    item.name = `Switch ${item.keyCode === 'alt' ? 'Ctrl' : 'Alt'}+Click to Multi-Cursor`;
                    break;
            }
            this.editor.focus();
            this.selectionMenuVisible = false;
        },
    }
}
</script>