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
						value: 'createFile',
						op: 'command'
					},
					{
						value: 'createFolder',
						op: 'command'
					},
					{
						value: 'revealInFileExplorer',
						op: 'command'
					},
					{
						value: 'findInFolder',
						op: 'command'
					},
					{
						value: 'openInTerminal',
						op: 'command'
					},
				],
				[
					{
						value: 'addFolder',
						op: 'command'
					},
					{
						value: 'removeFolder',
						op: 'command'
					},
				],
				[
					{
						value: 'copyFile',
						op: 'command'
					},
					{
						value: 'pasteFile',
						op: 'command'
					},
				],
				[
					{
						value: 'copyPath',
						op: 'command'
					},
					{
						value: 'copyRelativePath',
						op: 'command'
					},
				],
			],
			dirMenu: [
				[
					{
						value: 'createFile',
						op: 'command'
					},
					{
						value: 'createFolder',
						op: 'command'
					},
					{
						value: 'revealInFileExplorer',
						op: 'command'
					},
					{
						value: 'findInFolder',
						op: 'command'
					},
					{
						value: 'openInTerminal',
						op: 'command'
					},
				],
				[
					{
						value: 'cutFile',
						op: 'command'
					},
					{
						value: 'copyFile',
						op: 'command'
					},
					{
						value: 'pasteFile',
						op: 'command'
					},
				],
				[
					{
						value: 'copyPath',
						op: 'command'
					},
					{
						value: 'copyRelativePath',
						op: 'command'
					},
				],
				[
					{
						value: 'rename',
						op: 'command'
					},
					{
						value: 'deleteFile',
						op: 'command'
					},
				],
			],
			fileMenu: [
				[
					{
						value: 'revealInFileExplorer',
						op: 'command'
					},
					{
						value: 'openInTerminal',
						op: 'command'
					},
				],
				[
					{
						value: 'cutFile',
						op: 'command'
					},
					{
						value: 'copyFile',
						op: 'command'
					},
				],
				[
					{
						value: 'copyPath',
						op: 'command'
					},
					{
						value: 'copyRelativePath',
						op: 'command'
					},
				],
				[
					{
						value: 'rename',
						op: 'command'
					},
					{
						value: 'deleteFile',
						op: 'command'
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
		this.initShortcut();
	},
	methods: {
		initEventBus() {
			EventBus.$on('close-menu', () => {
				this.menuVisible = false;
			});
			EventBus.$on('shortcut-change', () => {
				this.initShortcut();
			});
			EventBus.$on('shortcut-loaded', () => {
				this.initShortcut();
			});
			EventBus.$on('open-side-tree-menu', (e, item) => {
				this.show(e, item);
			});
		},
		initShortcut() {
			_check(this.rootMenu);
			_check(this.dirMenu);
			_check(this.fileMenu);

			function _check(list) {
				if (list instanceof Array) {
					list.forEach((item) => {
						_check(item);
					});
				} else if (list.op === 'command') {
					let command = globalData.shortcut.findCommandByName(list.value);
					if (command) {
						list.shortcut = command.key || '';
						list.name = list.name || command.name || '';
					}
				}
			}
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
				case 'command':
					globalData.shortcut.doComand({ command: item.value }, { treeItem });
					break;
			}
			this.menuVisible = false;
		},
	},
};
</script>
