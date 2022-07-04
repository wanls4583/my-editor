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
						name: 'Reveal in File Explorer',
						op: 'revealInFileExplorer',
						shortcut: 'ignore',
					},
				],
				[
					{
						name: 'Format Document',
						op: 'format',
						shortcut: 'Ctrl+Shift+H',
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
			],
			menuVisible: false,
			menuStyle: {},
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
		show(e) {
			this.menuVisible = true;
			this.$nextTick(() => {
				this.menuStyle = Util.getMemnuPos(e, this.$refs.menu.$el, this.$parent.$refs.scroller);
			});
		},
		onMenuChange(item) {
			let editor = this.$parent;
			switch (item.op) {
				case 'revealInFileExplorer':
					EventBus.$emit('reveal-in-file-explorer', editor.tabData.path);
					break;
				case 'cut':
				case 'copy':
					Util.writeClipboard(this.myContext.getCopyText(menu.op === 'cut'));
					break;
				case 'paste':
					editor.$refs.textarea.focus();
					Util.readClipboard().then((text) => {
						editor.myContext.insertContent(text);
					});
					break;
				case 'format':
					EventBus.$emit('editor-format', editor.tabData.id);
					break;
			}
			this.menuVisible = false;
		},
	},
};
</script>