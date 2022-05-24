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
import $ from 'jquery';

const path = window.require('path');

export default {
	name: 'SideTreMenu',
	components: {
		Menu,
	},
	data() {
		return {
			dirMenu: [
				[
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
	provide() {},
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
				this.menuList = this.dirMenu;
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
				case 'revealInFileExplorer':
					EventBus.$emit('reveal-in-file-explorer', this.treeItem.path);
					break;
				case 'findInFolder':
					dirPath = treeItem.name;
					while (treeItem.parent) {
						dirPath = path.join(treeItem.parent.name, dirPath);
						treeItem = treeItem.parent;
					}
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
				case 'cut':
					EventBus.$emit('file-cut', treeItem);
					break;
				case 'copy':
					EventBus.$emit('file-copy', treeItem);
					break;
				case 'paste':
					EventBus.$emit('file-paste', treeItem);
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
