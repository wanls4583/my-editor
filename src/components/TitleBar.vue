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
						shortcut: globalData.shortcut.findLabelByNmae('newFile'),
					},
				],
				[
					{
						name: 'Add Folder to Workspace',
						op: 'addFolder',
					},
					{
						name: 'Save Workspace As',
						op: 'saveWorkspaceAs',
					},
				],
				[
					{
						name: 'Save',
						value: 'saveFile',
						op: 'command',
						shortcut: globalData.shortcut.findLabelByNmae('saveFile'),
					},
					{
						name: 'Save As',
						value: 'saveFileAs',
						op: 'command',
						shortcut: globalData.shortcut.findLabelByNmae('saveFileAs'),
					},
				],
				[
					{
						name: 'Reload',
						value: 'reloadWindow',
						op: 'command',
						shortcut: globalData.shortcut.findLabelByNmae('reloadWindow'),
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
						shortcut: globalData.shortcut.findLabelByNmae('undo'),
					},
					{
						name: 'Redo',
						value: 'redo',
						op: 'command',
						shortcut: globalData.shortcut.findLabelByNmae('redo'),
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
						shortcut: globalData.shortcut.findLabelByNmae('deleteLine'),
					},
				],
				[
					{
						name: 'Find',
						value: 'openSearch',
						op: 'command',
						shortcut: globalData.shortcut.findLabelByNmae('openSearch'),
					},
					{
						name: 'Replace',
						value: 'openReplace',
						op: 'command',
						shortcut: globalData.shortcut.findLabelByNmae('openReplace'),
					},
				],
				[
					{
						name: 'Find in Files',
						value: 'findInFiles',
						op: 'command',
						shortcut: globalData.shortcut.findLabelByNmae('findInFiles'),
					},
					{
						name: 'Replace in Files',
						value: 'replaceInFiles',
						op: 'command',
						shortcut: globalData.shortcut.findLabelByNmae('replaceInFiles'),
					},
				],
			],
			selectionMenuList: [
				[
					{
						name: 'Select All',
						value: 'selectAll',
						op: 'command',
						shortcut: globalData.shortcut.findLabelByNmae('selectAll'),
					},
				],
				[
					{
						name: 'Copy Line Up',
						value: 'copyLineUp',
						op: 'command',
						shortcut: globalData.shortcut.findLabelByNmae('copyLineUp'),
					},
					{
						name: 'Copy Line Down',
						value: 'copyLineDown',
						op: 'command',
						shortcut: globalData.shortcut.findLabelByNmae('copyLineDown'),
					},
					{
						name: 'Move Line Up',
						value: 'moveLineUp',
						op: 'command',
						shortcut: globalData.shortcut.findLabelByNmae('moveLineUp'),
					},
					{
						name: 'Move Line Down',
						value: 'moveLineDown',
						op: 'command',
						shortcut: globalData.shortcut.findLabelByNmae('moveLineDown'),
					},
					{
						name: 'Go to Line',
						value: 'gotoLine',
						op: 'command',
						shortcut: globalData.shortcut.findLabelByNmae('gotoLine'),
					},
				],
				[
					{
						name: 'Add Cursor Above',
						value: 'addCursorAbove',
						op: 'command',
						shortcut: globalData.shortcut.findLabelByNmae('addCursorAbove'),
					},
					{
						name: 'Add Cursor Below',
						value: 'addCursorBelow',
						op: 'command',
						shortcut: globalData.shortcut.findLabelByNmae('addCursorBelow'),
					},
					{
						name: 'Add Cursor to Line Ends',
						value: 'addCursorLineEnds',
						op: 'command',
						shortcut: globalData.shortcut.findLabelByNmae('addCursorLineEnds'),
					},
					{
						name: 'Add Next Occurence',
						value: 'searchWordDown',
						op: 'command',
						shortcut: globalData.shortcut.findLabelByNmae('searchWordDown'),
					},
					{
						name: 'Add Previous Occurence',
						value: 'searchWordUp',
						op: 'command',
						shortcut: globalData.shortcut.findLabelByNmae('searchWordUp'),
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
						shortcut: globalData.shortcut.findLabelByNmae('openCmdPanel'),
					},
					{
						name: 'Terminal',
						value: 'toggleTerminal',
						op: 'command',
						shortcut: globalData.shortcut.findLabelByNmae('toggleTerminal'),
						selected: globalData.views.terminal,
					},
					{
						name: 'Minimap',
						value: 'toggleMinimap',
						op: 'command',
						shortcut: globalData.shortcut.findLabelByNmae('toggleMinimap'),
						selected: globalData.views.minimap,
					},
					{
						name: 'Sidebar',
						value: 'toggleSidebar',
						op: 'command',
						shortcut: globalData.shortcut.findLabelByNmae('toggleSidebar'),
						selected: globalData.views.sidebar,
					},
					{
						name: 'Statusbar',
						value: 'toggleStatusbar',
						op: 'command',
						shortcut: globalData.shortcut.findLabelByNmae('toggleStatusbar'),
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
						op: 'changeTheme',
					},
					{
						name: 'Icon Theme',
						op: 'changeIconTheme',
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
				shortcut: globalData.shortcut.findLabelByNmae('openFile'),
			},
			{
				name: 'Open Folder',
				value: 'openFolder',
				op: 'command',
				shortcut: globalData.shortcut.findLabelByNmae('openFolder'),
			},
			{
				name: 'Open Workspace',
				op: 'openWorkspace',
			},
		]);
		this.initEventBus();
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
				case 'saveWorkspaceAs':
					EventBus.$emit('workspace-save-as');
					break;
				case 'openWorkspace':
					EventBus.$emit('workspace-open');
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
				case 'changeTheme':
					EventBus.$emit('cmd-menu-theme-open');
					break;
				case 'changeIconTheme':
					EventBus.$emit('cmd-menu-icon-theme-open');
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
