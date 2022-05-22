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
				<div @mousedown.stop="showMemu('terminalMenuVisible')" class="bar-item my-hover">
					<span>Terminal</span>
					<Menu :hoverCheck="true" :menuList="terminalMenuList" :styles="{ left: 0, top: _top }" @change="onTerminalMenuChange" v-if="terminalMenuVisible"></Menu>
				</div>
				<div @mousedown.stop="showMemu('preferenceMenuVisible')" class="bar-item my-hover">
					<span>Preference</span>
					<Menu :hoverCheck="true" :menuList="preferenceMenuList" :styles="{ left: 0, top: _top }" @change="onPreferenceMenuChange" v-if="preferenceMenuVisible"></Menu>
				</div>
			</div>
			<div class="bar-right" v-if="mode === 'app'">
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
import ShortCut from '@/module/shortcut/menu-bar';
import EventBus from '@/event';
import $ from 'jquery';
const require = window.require || window.parent.require || function () {};
const remote = require('@electron/remote');
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
			preferenceMenuVisible: false,
			terminalMenuVisible: false,
			maximize: false,
			mode: remote ? 'app' : 'web',
			fileMenuList: [
				[
					{
						name: 'New File',
						op: 'newFile',
						shortcut: 'Ctrl+N',
					},
				],
			],
			editMenuList: [
				[
					{
						name: 'Undo',
						op: 'undo',
						shortcut: 'Ctrl+Z',
					},
					{
						name: 'Redo',
						op: 'redo',
						shortcut: 'Ctrl+Y',
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
						op: 'deleteLine',
						shortcut: 'Ctrl+Shift+K',
					},
				],
				[
					{
						name: 'Find',
						op: 'find',
						shortcut: 'Ctrl+F',
					},
					{
						name: 'Replace',
						op: 'replace',
						shortcut: 'Ctrl+H',
					},
				],
				[
					{
						name: 'Find in Files',
						op: 'findInFiles',
						shortcut: 'Ctrl+Shift+F',
					},
					{
						name: 'Replace in Files',
						op: 'replaceInFiles',
						shortcut: 'Ctrl+Shift+H',
					},
				],
			],
			selectionMenuList: [
				[
					{
						name: 'Select All',
						op: 'selectAll',
						shortcut: 'Ctrl+A',
					},
				],
				[
					{
						name: 'Copy Line Up',
						op: 'copyLineUp',
						shortcut: 'Ctrl+Shift+D',
					},
					{
						name: 'Copy Line Down',
						op: 'copyLineDown',
						shortcut: 'Alt+Shift+Down',
					},
					{
						name: 'Move Line Up',
						op: 'moveLineUp',
						shortcut: 'Ctrl+Shift+Up',
					},
					{
						name: 'Move Line Down',
						op: 'moveLineDown',
						shortcut: 'Ctrl+Shift+Down',
					},
				],
				[
					{
						name: 'Add Cursor Above',
						op: 'addCursorAbove',
						shortcut: 'Ctrl+Alt+Up',
					},
					{
						name: 'Add Cursor Below',
						op: 'addCursorBelow',
						shortcut: 'Ctrl+Alt+Down',
					},
					{
						name: 'Add Cursor to Line Ends',
						op: 'addCursorLineEnds',
						shortcut: 'Ctrl+Shift+L',
					},
					{
						name: 'Add Next Occurence',
						op: 'addNextOccurence',
						shortcut: 'Ctrl+D',
					},
					{
						name: 'Add Previous Occurence',
						op: 'addPrevOccurence',
						shortcut: 'Shift+D',
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
			terminalMenuList: [
				[
					{
						name: 'New Terminal',
						op: 'newTerminal',
					},
					{
						name: 'Toogle Terminal',
						op: 'toogleTerminal',
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
		editor() {
			return this.getNowEditor();
		},
		context() {
			return this.getNowContext();
		},
	},
	inject: ['getNowEditor', 'getNowContext', 'openFile', 'openFolder'],
	created() {
		if (this.mode === 'app') {
			this.fileMenuList.push([
				{
					name: 'Open File',
					op: 'openFile',
					shortcut: 'Ctrl+O',
				},
				{
					name: 'Open Folder',
					op: 'openFolder',
					shortcut: 'Ctrl+K Ctrl+O',
				},
			]);
		}
		this.shortcut = new ShortCut(this);
		this.initEventBus();
		$(window).on('keydown', (e) => {
			this.shortcut.onKeyDown(e);
		});
	},
	mounted() {
		if (this.mode === 'app') {
			this.maximize = currentWindow.isMaximized();
		}
	},
	methods: {
		initEventBus() {
			EventBus.$on('close-menu', () => {
				this.fileMenuVisible = false;
				this.editMenuVisible = false;
				this.selectionMenuVisible = false;
				this.preferenceMenuVisible = false;
				this.terminalMenuVisible = false;
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
			switch (item.op) {
				case 'findInFiles':
					EventBus.$emit('find-in-folder');
					break;
				case 'replaceInFiles':
					EventBus.$emit('find-in-folder', { replace: true });
					break;
			}
			if (!this.editor) {
				this.editMenuVisible = false;
				return;
			}
			switch (item.op) {
				case 'undo':
					this.editor.history.undo();
					this.editor.focus();
					break;
				case 'redo':
					this.editor.history.redo();
					this.editor.focus();
					break;
				case 'cut':
					Util.writeClipboard(this.context.getCopyText(true));
					this.editor.focus();
					break;
				case 'copy':
					Util.writeClipboard(this.context.getCopyText());
					this.editor.focus();
					break;
				case 'paste':
					Util.readClipboard().then((text) => {
						this.context.insertContent(text);
					});
					this.editor.focus();
					break;
				case 'deleteLine':
					this.context.deleteLine();
					this.editor.focus();
					break;
				case 'find':
					this.editor.openSearch();
					this.editor.focus();
					break;
				case 'replace':
					this.editor.openSearch(true);
					this.editor.focus();
					break;
			}
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
					this.editor.searchWord('down');
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
		onPreferenceMenuChange(item) {
			switch (item.op) {
				case 'changeTheme':
					this.$emit('change', item);
					break;
				case 'changeIconTheme':
					this.$emit('change', item);
			}
			this.preferenceMenuVisible = false;
		},
		onTerminalMenuChange(item) {
			switch (item.op) {
				case 'newTerminal':
					EventBus.$emit('terminal-new');
					break;
				case 'changeIconTheme':
					EventBus.$emit('terminal-toogle');
					break;
			}
			this.terminalMenuVisible = false;
		},
	},
};
</script>
