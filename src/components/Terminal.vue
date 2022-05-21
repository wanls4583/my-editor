<!--
 * @Author: lisong
 * @Date: 2022-05-13 19:43:11
 * @Description: 
-->
<template>
	<div class="my-terminal">
		<div :id="_id" @contextmenu="onContextmenu" class="my-width-100 my-height-100" ref="terminal"></div>
	</div>
</template>
<script>
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import globalData from '@/data/globalData';
import Util from '@/common/util';
import EventBus from '@/event';
import $ from 'jquery';

const { ipcRenderer } = window.require('electron');

export default {
	name: 'Terminal',
	props: {
		id: { type: Number, default: 0 },
	},
	data() {
		return {};
	},
	computed: {
		_id() {
			return 'terminal-' + this.id;
		},
	},
	created() {
		window.terminal = this;
	},
	mounted() {
		this.terminal = new Terminal({
			windowsMode: true,
			fontFamily: 'Consolas',
			theme: {
				lineHeight: 21,
			},
		});
		this.fitAddon = new FitAddon(); //自适应容器大小插件
		this.terminal.loadAddon(this.fitAddon);
		this.terminal.open(this.$refs.terminal);
		this.fitAddon.fit();
		this.createTerminal();
		this.initEvent();
		this.initTerminalEvent();
		this.initResizeEvent();
	},
	methods: {
		setResize(data) {
			ipcRenderer.send('terminal-resize', {
				id: this.id,
				rows: data.rows,
				cols: data.cols,
			});
		},
		createTerminal() {
			ipcRenderer.send('terminal-add', {
				id: this.id,
				rows: this.terminal.rows,
				cols: this.terminal.cols,
			});
		},
		initEvent() {
			EventBus.$on('theme-change', () => {
				this.terminal.setOption('theme', {
					foreground: globalData.colors['terminal.foreground'],
					background: globalData.colors['terminal.background'],
					selection: globalData.colors['terminal.selectionBackground'],
				});
			});
		},
		initResizeEvent() {
			const resizeObserver = new ResizeObserver((entries) => {
				this.fitAddon.fit();
			});
			resizeObserver.observe(this.$refs.terminal);
		},
		initTerminalEvent() {
			ipcRenderer.on('terminal-data', (event, data) => {
				this.terminal.write(data.text);
			});
			this.terminal.onData((text) => {
				ipcRenderer.send('terminal-write', {
					id: this.id,
					text: text,
				});
			});
			this.terminal.onResize((data) => {
				this.setResize(data);
			});
			this.terminal.attachCustomKeyEventHandler((e) => {
				if (e.ctrlKey && e.code === 'KeyC' && e.type === 'keydown') {
					const selection = this.terminal.getSelection();
					if (selection) {
						this.terminal.clearSelection();
						Util.writeClipboard(selection);
						return false;
					}
				}
				return true;
			});
		},
		onContextmenu(e) {
			let selection = terminal.terminal.getSelection();
			if (selection) {
				this.terminal.clearSelection();
				Util.writeClipboard(selection);
			} else {
				Util.readClipboard().then((data) => {
					this.terminal.paste(data);
				});
			}
		},
	},
};
</script>