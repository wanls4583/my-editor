<!--
 * @Author: lisong
 * @Date: 2021-12-09 21:38:38
 * @Description: 
-->
<template>
	<div :style="{height:height+'px'}" @contextmenu.stop.prevent class="my-editor-top-bar">
		<div class="bar-left">
			<div @mousedown.stop="showMemu('editMenuVisible')" class="bar-item clickable">
				<span>Edit</span>
				<Menu :checkable="false" :menuList="editMenuList" :styles="{left: 0, top: height+'px'}" @change="onEditMenuChange" v-show="editMenuVisible"></Menu>
			</div>
			<div @mousedown.stop="showMemu('selectionMenuVisible')" class="bar-item clickable">
				<span>Selection</span>
				<Menu :checkable="false" :menuList="selectionMenuList" :styles="{left: 0, top: height+'px'}" @change="onSelectionMenuChange" v-show="selectionMenuVisible"></Menu>
			</div>
		</div>
		<div class="bar-right"></div>
	</div>
</template>
<script>
import Util from '@/common/Util';
import Menu from './Menu';
export default {
    name: 'StatusBar',
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
            editMenuVisible: false,
            selectionMenuVisible: false,
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
    created() {

    },
    methods: {
        initData($editor) {
            this.$editor = $editor;
            this.context = $editor.getContext();
        },
        showMemu(prop) {
            this.closeAllMenu();
            this[prop] = true;
        },
        closeAllMenu() {
            this.editMenuVisible = false;
            this.selectionMenuVisible = false;
        },
        onEditMenuChange(item) {
            switch (item.op) {
                case 'undo':
                    this.$editor.history.undo();
                    break;
                case 'redo':
                    this.$editor.history.redo();
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
                    this.$editor.openSearch();
                    break;
                case 'replace':
                    this.$editor.openSearch(true);
                    break;
            }
            this.$editor.focus();
            this.editMenuVisible = false;
        },
        onSelectionMenuChange(item) {
            switch (item.op) {
                case 'selectAll':
                    this.$editor.selecter.selectAll();
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
                    this.$editor.cursor.addCursorAbove();
                    break;
                case 'addCursorBelow':
                    this.$editor.cursor.addCursorBelow();
                    break;
                case 'addCursorLineEnds':
                    this.$editor.cursor.addCursorLineEnds();
                    break;
                case 'addNextOccurence':
                    this.$editor.searchWord('next');
                    break;
                case 'addPrevOccurence':
                    this.$editor.searchWord('up');
                    break;
                case 'selectAllOccurence':
                    this.$editor.selecter.selectAllOccurence();
                    break;
                case 'switchMultiKeyCode':
                    this.$editor.cursor.switchMultiKeyCode();
                    item.keyCode = this.$editor.cursor.multiKeyCode;
                    item.name = `Switch ${item.keyCode === 'alt' ? 'Ctrl' : 'Alt'}+Click to Multi-Cursor`;
                    break;
            }
            this.$editor.focus();
            this.selectionMenuVisible = false;
        }
    }
}
</script>