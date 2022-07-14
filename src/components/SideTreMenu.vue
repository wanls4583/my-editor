<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
	<div ref="wrap" v-show="menuVisible">
		<Menu :checkable="false" :menuList="menuList" :styles="menuStyle" @change="onMenuChange" ref="menu"></Menu>
	</div>
</template>
<script>
import Menu from './Menu';
import EventBus from '@/event';
import Util from '@/common/util';
import $ from 'jquery';

const path = window.require('path');

export default {
	name: 'SideTreMenu',
	components: {
		Menu,
	},
	data() {
		return {
			rootMenu: [
				[
					{
						name: 'New File',
						op: 'newFile',
					},
					{
						name: 'New Folder',
						op: 'newFolder',
					},
					{
						name: 'Reveal in File Explorer',
						op: 'revealInFileExplorer',
					},
					{
						name: 'Find in Folder',
						op: 'findInFolder',
					},
					{
						name: 'Open in Terminal',
						op: 'openInTerminal',
					},
				],
				[
					{
						name: 'Add Folder to Workspace',
						op: 'addFolder',
					},
					{
						name: 'Remove Folder from Workspace',
						op: 'removeFolder',
					},
				],
				[
					{
						name: 'Copy',
						op: 'copy',
					},
					{
						name: 'Paste',
						op: 'paste',
					},
				],
				[
					{
						name: 'Copy Path',
						op: 'copyPath',
					},
					{
						name: 'Copy Relative Path',
						op: 'copyRelativePath',
					},
				],
			],
			dirMenu: [
				[
					{
						name: 'New File',
						op: 'newFile',
					},
					{
						name: 'New Folder',
						op: 'newFolder',
					},
					{
						name: 'Reveal in File Explorer',
						op: 'revealInFileExplorer',
					},
					{
						name: 'Find in Folder',
						op: 'findInFolder',
					},
					{
						name: 'Open in Terminal',
						op: 'openInTerminal',
					},
				],
				[
					{
						name: 'Cut',
						op: 'cut',
					},
					{
						name: 'Copy',
						op: 'copy',
					},
					{
						name: 'Paste',
						op: 'paste',
					},
				],
				[
					{
						name: 'Copy Path',
						op: 'copyPath',
					},
					{
						name: 'Copy Relative Path',
						op: 'copyRelativePath',
					},
				],
				[
					{
						name: 'Reaname',
						op: 'rename',
					},
					{
						name: 'Delete',
						op: 'delete',
					},
				],
			],
			fileMenu: [
				[
					{
						name: 'Reveal in File Explorer',
						op: 'revealInFileExplorer',
					},
					{
						name: 'Open in Terminal',
						op: 'openInTerminal',
					},
				],
				[
					{
						name: 'Cut',
						op: 'cut',
					},
					{
						name: 'Copy',
						op: 'copy',
					},
				],
				[
					{
						name: 'Copy Path',
						op: 'copyPath',
					},
					{
						name: 'Copy Relative Path',
						op: 'copyRelativePath',
					},
				],
				[
					{
						name: 'Reaname',
						op: 'rename',
					},
					{
						name: 'Delete',
						op: 'delete',
					},
				],
			],
			menuList: [],
			menuVisible: false,
			menuStyle: {
				left: '10px',
				top: '40px',
			},
		};
	},
	created() {
		this.initEventBus();
	},
	methods: {
		initEventBus() {
			EventBus.$on('close-menu', () => {
				this.menuVisible = false;
			});
		},
		show(e, treeItem) {
			let $parent = $(this.$refs.wrap).parent();
			this.menuVisible = true;
			this.treeItem = treeItem;
			if (treeItem.type === 'dir') {
				if (!treeItem.parentPath) {
					this.menuList = this.rootMenu;
				} else {
					this.menuList = this.dirMenu;
				}
			} else {
				this.menuList = this.fileMenu;
			}
			this.$nextTick(() => {
				let menuHeight = 0;
				menuHeight = this.$refs.menu.$el.clientHeight;
				let offset = $parent.offset();
				if (menuHeight + e.clientY > offset.top + $parent.height()) {
					this.menuStyle.top = e.clientY - offset.top - menuHeight + 'px';
				} else {
					this.menuStyle.top = e.clientY - offset.top + 'px';
				}
				this.menuStyle.left = e.clientX - offset.left + 'px';
			});
		},
		onMenuChange(item) {
			let dirPath = '';
			let treeItem = Object.assign({}, this.treeItem);
			switch (item.op) {
				case 'newFile':
					EventBus.$emit('file-create-tree', treeItem.path);
					break;
				case 'newFolder':
					EventBus.$emit('folder-create-tree', treeItem.path);
					break;
				case 'revealInFileExplorer':
					EventBus.$emit('reveal-in-file-explorer', treeItem.path);
					break;
				case 'findInFolder':
					dirPath = path.relative(treeItem.rootPath, treeItem.path);
					dirPath = path.join(path.basename(treeItem.rootPath), dirPath);
					dirPath = '.' + path.sep + dirPath;
					EventBus.$emit('find-in-folder', { path: dirPath });
					break;
				case 'openInTerminal':
					dirPath = '';
					if (this.treeItem.type === 'file') {
						dirPath = path.dirname(this.treeItem.path);
					} else {
						dirPath = this.treeItem.path;
					}
					EventBus.$emit('terminal-new', dirPath);
					break;
				case 'addFolder':
					EventBus.$emit('folder-add');
					break;
				case 'removeFolder':
					EventBus.$emit('folder-remove', treeItem.path);
					break;
				case 'cut':
					EventBus.$emit('file-cut', treeItem);
					break;
				case 'copy':
					EventBus.$emit('file-copy', treeItem);
					break;
				case 'paste':
					EventBus.$emit('file-paste', treeItem);
					break;
				case 'copyPath':
					Util.writeClipboard(treeItem.path);
					break;
				case 'copyRelativePath':
					dirPath = treeItem.name;
					while (treeItem.parent && treeItem.parent.parent) {
						dirPath = path.join(treeItem.parent.name, dirPath);
						treeItem = treeItem.parent;
					}
					Util.writeClipboard(dirPath);
					break;
				case 'rename':
					EventBus.$emit('file-rename-input', treeItem);
					break;
				case 'delete':
					EventBus.$emit('file-delete', treeItem);
					break;
			}
			this.menuVisible = false;
		},
	},
};
</script>
