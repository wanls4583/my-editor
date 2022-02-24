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
                    shortcut: 'Ctrl+Shift+Down'
                }, {
                    name: 'Move Line Down',
                    op: 'moveLineDown',
                    shortcut: 'Ctrl+Shift+Down'
                }]
            ]
        }
    },
    created() {

    },
    methods: {
        showMemu(prop) {
            this.closeAllMenu();
            this[prop] = true;
        },
        closeAllMenu() {
            this.editMenuVisible = false;
            this.selectionMenuVisible = false;
        },
        onEditMenuChange(item) {

            this.editMenuVisible = false;
        },
        onSelectionMenuChange() {
            this.selectionMenuVisible = false;
        }
    }
}
</script>