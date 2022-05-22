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
						name: 'Close Ohter',
						op: 'closeOther',
					},
					{
						name: 'Close All',
						op: 'closeAll',
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
	},
	methods: {
		initEventBus() {
			EventBus.$on('close-menu', () => {
				this.menuVisible = false;
			});
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
				case 'close':
					EventBus.$emit('terminal-close', this.tabId);
					break;
				case 'closeToLeft':
					EventBus.$emit('terminal-close-to-left', this.tabId);
					break;
				case 'closeToRight':
					EventBus.$emit('terminal-close-to-right', this.tabId);
					break;
				case 'closeOther':
					EventBus.$emit('terminal-close-other', this.tabId);
					break;
				case 'closeAll':
					EventBus.$emit('terminal-close-all', this.tabId);
					break;
			}
			this.menuVisible = false;
		},
	},
};
</script>