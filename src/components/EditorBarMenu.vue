<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
	<div ref="wrap">
		<Menu :checkable="false" :menuList="menuList" :styles="menuStyle" @change="onMenuChange" ref="menu" v-show="menuVisible"></Menu>
	</div>
</template>
<script>
import $ from 'jquery';
import Menu from './Menu';
import EventBus from '@/event';
import globalData from '@/data/globalData';

export default {
	name: 'EditorBarMenu',
	components: {
		Menu,
	},
	data() {
		return {
			menuList: [
				[
					{
						name: 'Close',
						op: 'close',
					},
					{
						name: 'Close to the Left',
						op: 'closeToLeft',
					},
					{
						name: 'Close to the Right',
						op: 'closeToRight',
					},
					{
						value: 'closeSavedTab',
						op: 'command',
					},
					{
						name: 'Close Other',
						op: 'closeOther',
					},
					{
						value: 'closeAllTab',
						op: 'command',
					},
				],
			],
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
						list.shortcut = command.label || '';
						list.name = list.name || command.name || '';
					}
				}
			}
		},
		show(e, id) {
			this.tabId = id;
			this.menuVisible = true;
			let $parent = $(this.$refs.wrap).parent();
			this.$nextTick(() => {
				let offset = $parent.offset();
				let menuWidth = this.$refs.menu.$el.clientWidth;
				if (menuWidth + e.clientX > offset.left + $parent[0].clientWidth) {
					this.menuStyle.left = e.clientX - offset.left - menuWidth + 'px';
				} else {
					this.menuStyle.left = e.clientX - offset.left + 'px';
				}
				this.menuStyle.top = e.clientY - offset.top + 'px';
			});
		},
		onMenuChange(item) {
			switch (item.op) {
				case 'close':
					EventBus.$emit('editor-close', this.tabId);
					break;
				case 'closeToLeft':
					EventBus.$emit('editor-close-to-left', this.tabId);
					break;
				case 'closeToRight':
					EventBus.$emit('editor-close-to-right', this.tabId);
					break;
				case 'closeOther':
					EventBus.$emit('editor-close-other', this.tabId);
					break;
				case 'command':
					globalData.shortcut.doComand({ command: item.value });
					break;
			}
			this.menuVisible = false;
		},
	},
};
</script>