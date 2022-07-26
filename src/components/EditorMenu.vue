<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
	<Menu :checkable="false" :menuList="menuList" :styles="menuStyle" @change="onMenuChange" ref="menu" v-show="menuVisible"></Menu>
</template>
<script>
import $ from 'jquery';
import Menu from './Menu';
import EventBus from '@/event';
import Util from '@/common/util';

export default {
	name: 'EditorMenu',
	components: {
		Menu,
	},
	data() {
		return {
			menuList: [
				[
					{
						value: 'revealEditorInFileExplorer',
						op: 'command'
					},
				],
				[
					{
						value: 'formatCode',
						op: 'command'
					},
				],
				[
					{
						value: 'cutContent',
						op: 'command'
					},
					{
						value: 'copyContent',
						op: 'command'
					},
					{
						value: 'pasteContent',
						op: 'command'
					},
				],
			],
			menuVisible: false,
			menuStyle: {},
		};
	},
	created() {
		this.initEventBus();
		this.initShortcut();
	},
	destroyed() {
		this.unbindEvent();
	},
	methods: {
		initEventBus() {
			this.initEventBusFn = {};
			EventBus.$on(
				'close-menu',
				(this.initEventBusFn['close-menu'] = () => {
					this.menuVisible = false;
				})
			);
			EventBus.$on('shortcut-change', () => {
				this.initShortcut();
			});
			EventBus.$on('shortcut-loaded', () => {
				this.initShortcut();
			});
		},
		initShortcut() {
			_check(this.menuList);

			function _check(list) {
				if (list instanceof Array) {
					list.forEach((item) => {
						_check(item);
					});
				} else if (list.op === 'command') {
					let command = globalData.shortcut.findCommandByName(list.value);
					if (command) {
						list.shortcut = command.key || '';
						list.name = command.name || list.name || '';
					}
				}
			}
		},
		unbindEvent() {
			EventBus.$off('close-menu', this.initEventBusFn['close-menu']);
		},
		show(e) {
			this.menuVisible = true;
			this.$nextTick(() => {
				this.menuStyle = Util.getMemnuPos(e, this.$refs.menu.$el, this.$parent.$refs.scroller);
			});
		},
		onMenuChange(item) {
			let editor = this.$parent;
			switch (item.op) {
				case 'command':
					globalData.shortcut.doComand({ command: item.value });
					break;
			}
			this.menuVisible = false;
		},
	},
};
</script>