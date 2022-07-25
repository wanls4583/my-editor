<!--
 * @Author: lisong
 * @Date: 2021-12-09 21:38:38
 * @Description: 
-->
<template>
	<div :style="{ height: height + 'px' }" @contextmenu.stop.prevent class="my-title-bar my-width-100">
		<div class="my-height-100 my-center-between">
			<div class="menu-bar">
				<div @mousedown.stop="showMemu('fileMenuVisible')" class="bar-item my-hover">
					<span>File</span>
					<Menu :hoverCheck="true" :menuList="fileMenuList" :styles="{ left: 0, top: _top }" @change="onFileMenuChange" v-if="fileMenuVisible"></Menu>
				</div>
				<div @mousedown.stop="showMemu('editMenuVisible')" class="bar-item my-hover">
					<span>Edit</span>
					<Menu :hoverCheck="true" :menuList="editMenuList" :styles="{ left: 0, top: _top }" @change="onEditMenuChange" v-if="editMenuVisible"></Menu>
				</div>
				<div @mousedown.stop="showMemu('selectionMenuVisible')" class="bar-item my-hover">
					<span>Selection</span>
					<Menu :hoverCheck="true" :menuList="selectionMenuList" :styles="{ left: 0, top: _top }" @change="onSelectionMenuChange" v-if="selectionMenuVisible"></Menu>
				</div>
				<div @mousedown.stop="showMemu('viewMenuVisible')" class="bar-item my-hover">
					<span>View</span>
					<Menu :hoverCheck="true" :left-select="true" :menuList="viewMenuList" :styles="{ left: 0, top: _top }" @change="onViewMenuChange" v-if="viewMenuVisible"></Menu>
				</div>
				<!--
				<div @mousedown.stop="showMemu('terminalMenuVisible')" class="bar-item my-hover">
					<span>Terminal</span>
					<Menu :hoverCheck="true" :menuList="terminalMenuList" :styles="{ left: 0, top: _top }" @change="onTerminalMenuChange" v-if="terminalMenuVisible"></Menu>
				</div>
				-->
				<div @mousedown.stop="showMemu('preferenceMenuVisible')" class="bar-item my-hover">
					<span>Preference</span>
					<Menu :hoverCheck="true" :menuList="preferenceMenuList" :styles="{ left: 0, top: _top }" @change="onPreferenceMenuChange" v-if="preferenceMenuVisible"></Menu>
				</div>
			</div>
			<div class="bar-right">
				<!-- 最小化 -->
				<div @click="onMinimize" class="bar-item my-hover" style="width: 35px; height: 35px">
					<span class="iconfont icon-zuixiaohua"></span>
				</div>
				<!-- 还原最大化 -->
				<div @click="onUnmaximize" class="bar-item my-hover" style="width: 35px; height: 35px" v-if="maximize">
					<span class="iconfont icon-huanyuan"></span>
				</div>
				<!-- 最大化 -->
				<div @click="onMaximize" class="bar-item my-hover" style="width: 35px; height: 35px" v-else>
					<span class="iconfont icon-zuidahua"></span>
				</div>
				<!-- 关闭 -->
				<div @click="onClose" class="bar-item my-hover-danger" style="width: 35px; height: 35px">
					<span class="iconfont icon-close" style="font-size: 18px"></span>
				</div>
			</div>
		</div>
	</div>
</template>
<script>
import Util from '@/common/util';
import Menu from './Menu';
import EventBus from '@/event';
import $ from 'jquery';
const remote = window.require('@electron/remote');
const currentWindow = remote && remote.getCurrentWindow();

export default {
	name: 'TitleBar',
	props: {
		height: {
			type: Number,
			default: 25,
		},
	},
	components: {
		Menu,
	},
	data() {
		return {
			fileMenuVisible: false,
			editMenuVisible: false,
			selectionMenuVisible: false,
			viewMenuVisible: false,
			terminalMenuVisible: false,
			preferenceMenuVisible: false,
			maximize: false,
			fileMenuList: [
				[
					{
						name: 'New File',
						value: 'newFile',
						op: 'command',
					},
				],
				[
					{
						name: 'Add Folder to Workspace',
						op: 'addFolder',
					},
					{
						name: 'Save Workspace As',
						value: 'saveWorkspaceAs',
						op: 'command',
					},
				],
				[
					{
						name: 'Save',
						value: 'saveFile',
						op: 'command',
					},
					{
						name: 'Save As',
						value: 'saveFileAs',
						op: 'command',
					},
				],
				[
					{
						name: 'Reload',
						value: 'reloadWindow',
						op: 'command',
					},
					{
						name: 'Exit',
						op: 'exit',
					},
				],
			],
			editMenuList: [
				[
					{
						name: 'Undo',
						value: 'undo',
						op: 'command',
					},
					{
						name: 'Redo',
						value: 'redo',
						op: 'command',
					},
				],
				[
					{
						name: 'Cut',
						op: 'cut',
						shortcut: 'Ctrl+X',
					},
					{
						name: 'Copy',
						op: 'copy',
						shortcut: 'Ctrl+C',
					},
					{
						name: 'Paste',
						op: 'paste',
						shortcut: 'Ctrl+V',
					},
				],
				[
					{
						name: 'Delete Line',
						value: 'deleteLine',
						op: 'command',
					},
				],
				[
					{
						name: 'Find',
						value: 'openSearch',
						op: 'command',
					},
					{
						name: 'Replace',
						value: 'openReplace',
						op: 'command',
					},
				],
				[
					{
						name: 'Find in Files',
						value: 'findInFiles',
						op: 'command',
					},
					{
						name: 'Replace in Files',
						value: 'replaceInFiles',
						op: 'command',
					},
				],
			],
			selectionMenuList: [
				[
					{
						name: 'Select All',
						value: 'selectAll',
						op: 'command',
					},
				],
				[
					{
						name: 'Copy Line Up',
						value: 'copyLineUp',
						op: 'command',
					},
					{
						name: 'Copy Line Down',
						value: 'copyLineDown',
						op: 'command',
					},
					{
						name: 'Move Line Up',
						value: 'moveLineUp',
						op: 'command',
					},
					{
						name: 'Move Line Down',
						value: 'moveLineDown',
						op: 'command',
					},
					{
						name: 'Go to Line',
						value: 'gotoLine',
						op: 'command',
					},
				],
				[
					{
						name: 'Add Cursor Above',
						value: 'addCursorAbove',
						op: 'command',
					},
					{
						name: 'Add Cursor Below',
						value: 'addCursorBelow',
						op: 'command',
					},
					{
						name: 'Add Cursor to Line Ends',
						value: 'addCursorLineEnds',
						op: 'command',
					},
					{
						name: 'Add Next Occurence',
						value: 'searchWordDown',
						op: 'command',
					},
					{
						name: 'Add Previous Occurence',
						value: 'searchWordUp',
						op: 'command',
					},
					{
						name: 'Select All Occurence',
						op: 'selectAllOccurence',
					},
				],
				[
					{
						name: 'Switch Alt+Click to Multi-Cursor',
						op: 'switchMultiKeyCode',
						keyCode: 'ctrl',
					},
				],
			],
			viewMenuList: [
				[
					{
						name: 'Command Palette',
						value: 'openCmdPanel',
						op: 'command',
					},
					{
						name: 'Terminal',
						value: 'toggleTerminal',
						op: 'command',
						selected: globalData.views.terminal,
					},
					{
						name: 'Minimap',
						value: 'toggleMinimap',
						op: 'command',
						selected: globalData.views.minimap,
					},
					{
						name: 'Sidebar',
						value: 'toggleSidebar',
						op: 'command',
						selected: globalData.views.sidebar,
					},
					{
						name: 'Statusbar',
						value: 'toggleStatusbar',
						op: 'command',
						selected: globalData.views.statusbar,
					},
				],
			],
			terminalMenuList: [
				[
					{
						name: 'New Terminal',
						op: 'newTerminal',
					},
				],
			],
			preferenceMenuList: [
				[
					{
						name: 'Color Theme',
						value: 'changeTheme',
						op: 'command',
					},
					{
						name: 'Icon Theme',
						value: 'changeIconTheme',
						op: 'command',
					},
					{
						name: 'Keyboard Shortcuts',
						value: 'openShortcut',
						op: 'command',
					},
				],
			],
		};
	},
	computed: {
		_top() {
			return this.height + 2 + 'px';
		},
	},
	created() {
		this.fileMenuList.splice(1, 0, [
			{
				name: 'Open File',
				value: 'openFile',
				op: 'command',
			},
			{
				name: 'Open Folder',
				value: 'openFolder',
				op: 'command',
			},
			{
				name: 'Open Workspace',
				value: 'openWorkspace',
				op: 'command',
			},
		]);
		this.initEventBus();
		this.initShortcut();
	},
	mounted() {
		this.maximize = currentWindow.isMaximized();
	},
	methods: {
		initEventBus() {
			EventBus.$on('close-menu', () => {
				this.fileMenuVisible = false;
				this.editMenuVisible = false;
				this.selectionMenuVisible = false;
				this.viewMenuVisible = false;
				this.terminalMenuVisible = false;
				this.preferenceMenuVisible = false;
			});
			EventBus.$on('terminal-toggle', () => {
				this.viewMenuList[0][1].selected = !this.viewMenuList[0][1].selected;
				globalData.views.terminal = !globalData.views.terminal;
			});
			EventBus.$on('minimap-toggle', () => {
				this.viewMenuList[0][2].selected = !this.viewMenuList[0][2].selected;
				globalData.views.minimap = !globalData.views.minimap;
			});
			EventBus.$on('sidebar-toggle', () => {
				this.viewMenuList[0][3].selected = !this.viewMenuList[0][3].selected;
				globalData.views.sidebar = !globalData.views.sidebar;
			});
			EventBus.$on('statusbar-toggle', () => {
				this.viewMenuList[0][4].selected = !this.viewMenuList[0][4].selected;
				globalData.views.statusbar = !globalData.views.statusbar;
			});
			EventBus.$on('shortcut-change', () => {
				this.initShortcut();
			});
		},
		initShortcut() {
			_check(this.fileMenuList);
			_check(this.editMenuList);
			_check(this.selectionMenuList);
			_check(this.viewMenuList);
			_check(this.preferenceMenuList);

			function _check(list) {
				if (list instanceof Array) {
					list.forEach((item) => {
						_check(item);
					});
				} else if (list.op === 'command') {
					let command = globalData.shortcut.findCommandByName(list.value);
					if (command) {
						list.shortcut = command.label || '';
						list.name = list.name || command.name || '';
					}
				}
			}
		},
		showMemu(prop) {
			EventBus.$emit('close-menu');
			this[prop] = true;
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
				case 'addFolder':
					EventBus.$emit('folder-add');
					break;
				case 'exit':
					currentWindow.close();
					break;
				case 'command':
					globalData.shortcut.doComand({ command: item.value });
					break;
			}
			requestAnimationFrame(() => {
				this.fileMenuVisible = false;
			});
		},
		onEditMenuChange(item) {
			let editor = globalData.$mainWin.getNowEditor();
			let context = globalData.$mainWin.getNowContext();
			let hit = false;
			switch (item.op) {
				case 'command':
					globalData.shortcut.doComand({ command: item.value });
					hit = true;
					break;

			}
			if (!editor || hit) {
				requestAnimationFrame(() => {
					this.editMenuVisible = false;
				});
				return;
			}
			switch (item.op) {
				case 'cut':
					Util.writeClipboard(context.getCopyText(true));
					editor.focus();
					break;
				case 'copy':
					Util.writeClipboard(context.getCopyText());
					editor.focus();
					break;
				case 'paste':
					Util.readClipboard().then((text) => {
						context.insertContent(text);
					});
					editor.focus();
					break;
				case 'command':
					globalData.shortcut.doComand({ command: item.value });
					break;
			}
			requestAnimationFrame(() => {
				this.editMenuVisible = false;
			});
		},
		onSelectionMenuChange(item) {
			let editor = globalData.$mainWin.getNowEditor();
			let context = globalData.$mainWin.getNowContext();
			let hit = false;
			switch (item.op) {
				case 'command':
					globalData.shortcut.doComand({ command: item.value });
					hit = true;
					break;
			}
			if (!editor || hit) {
				requestAnimationFrame(() => {
					this.selectionMenuVisible = false;
				});
				return;
			}
			switch (item.op) {
				case 'selectAllOccurence':
					editor.selecter.selectAllOccurence();
					break;
				case 'switchMultiKeyCode':
					editor.cursor.switchMultiKeyCode();
					item.keyCode = editor.cursor.multiKeyCode;
					item.name = `Switch ${item.keyCode === 'alt' ? 'Ctrl' : 'Alt'}+Click to Multi-Cursor`;
					break;
				case 'command':
					globalData.shortcut.doComand({ command: item.value });
					break;
			}
			editor.focus();
			requestAnimationFrame(() => {
				this.selectionMenuVisible = false;
			});
		},
		onPreferenceMenuChange(item) {
			switch (item.op) {
				case 'command':
					globalData.shortcut.doComand({ command: item.value });
					break;
			}
			requestAnimationFrame(() => {
				this.preferenceMenuVisible = false;
			});
		},
		onViewMenuChange(item) {
			switch (item.op) {
				case 'command':
					globalData.shortcut.doComand({ command: item.value });
					break;
			}
			requestAnimationFrame(() => {
				this.viewMenuVisible = false;
			});
		},
		onTerminalMenuChange(item) {
			switch (item.op) {
				case 'newTerminal':
					EventBus.$emit('terminal-new');
					break;
			}
			requestAnimationFrame(() => {
				this.terminalMenuVisible = false;
			});
		},
	},
};
</script>
