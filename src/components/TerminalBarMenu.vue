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
import Util from '@/common/util';
import Menu from './Menu';
import EventBus from '@/event';
import globalData from '@/data/globalData';

export default {
	name: 'TerminalBarMenu',
	components: {
		Menu,
	},
	data() {
		return {
			menuList: [
				[
					{
						value: 'closeTerminalTab',
						op: 'command'
					},
					{
						value: 'closeLeftTerminalTab',
						op: 'command'
					},
					{
						value: 'closeRightTerminalTab',
						op: 'command'
					},
					{
						value: 'closeOhterTerminalTab',
						op: 'command'
					},
					{
						value: 'closeAllTerminalTab',
						op: 'command'
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
						list.shortcut = command.key || '';
						list.name = list.name || command.name || '';
					}
				}
			}
		},
		show(e, id) {
			this.tabId = id;
			this.menuVisible = true;
			this.$nextTick(() => {
				this.menuStyle = Util.getMemnuPos(e, this.$refs.menu.$el, document.body);
			});
		},
		onMenuChange(item) {
			switch (item.op) {
				case 'command':
					globalData.shortcut.doComand({ command: item.value }, { termianlTabId: this.tabId });
					break;
			}
			this.menuVisible = false;
		},
	},
};
</script>