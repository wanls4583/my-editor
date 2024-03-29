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
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import globalData from '@/data/globalData';
import Util from '@/common/util';
import EventBus from '@/event';
import $ from 'jquery';

const path = window.require('path');
const { ipcRenderer } = window.require('electron');

export default {
	name: 'Terminal',
	props: {
		id: String,
		path: String,
		active: Boolean,
	},
	data() {
		return {};
	},
	computed: {
		_id() {
			return 'terminal-' + this.id;
		},
	},
	watch: {
		active() {
			this.active && this.terminal.focus();
		}
	},
	created() {},
	mounted() {
		this.terminal = new Terminal({
			windowsMode: true,
			fontFamily: 'Consolas',
			fontSize: 16,
			lineHeight: 1,
			cursorBlink: true,
			allowTransparency: true,
		});
		this.setTheme();
		this.fitAddon = new FitAddon(); //自适应容器大小插件
		this.searchAddon = new SearchAddon();
		this.terminal.loadAddon(this.fitAddon);
		this.terminal.loadAddon(this.searchAddon);
		this.terminal.loadAddon(new WebLinksAddon());
		this.terminal.open(this.$refs.terminal);
		this.initEvent();
		this.initTerminalEvent();
		this.initResizeEvent();
		requestAnimationFrame(() => {
			this.fitAddon.fit();
			this.terminal.focus();
			this.createPty();
		});
	},
	beforeDestroy() {
		this.resizeObserver.unobserve(this.$refs.terminal);
	},
	destroyed() {
		this.terminal.dispose();
		ipcRenderer.send('terminal-destroy', {
			id: this.id,
		});
	},
	methods: {
		setResize(data) {
			ipcRenderer.send('terminal-resize', {
				id: this.id,
				rows: data.rows,
				cols: data.cols,
			});
		},
		createPty() {
			ipcRenderer.send('terminal-add', {
				id: this.id,
				rows: this.terminal.rows,
				cols: this.terminal.cols,
				cwd: this.path,
			});
		},
		initEvent() {
			EventBus.$on('theme-changed', () => {
				this.setTheme();
			});
		},
		initResizeEvent() {
			this.resizeObserver = new ResizeObserver((entries) => {
				cancelAnimationFrame(this.fitTimer);
				this.fitTimer = requestAnimationFrame(() => {
					if (this.$refs.terminal && this.$refs.terminal.clientHeight) {
						this.fitAddon.fit();
					}
				});
			});
			this.resizeObserver.observe(this.$refs.terminal);
		},
		initTerminalEvent() {
			ipcRenderer.on('terminal-data', (event, data) => {
				if (this.id === data.id) {
					this.terminal.write(data.text);
				}
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
			this.terminal.onTitleChange((data) => {
				let title = '';
				try {
					title = path.parse(data);
					title = title.name;
				} catch (e) {
					title = data;
				}
				EventBus.$emit('terminal-title-change', { id: this.id, title });
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
		setTheme() {
			this.terminal.setOption('theme', {
				cursor: globalData.colors['terminal.foreground'],
				foreground: globalData.colors['terminal.foreground'],
				background: 'rgba(0,0,0,0)',
				selection: globalData.colors['terminal.selectionBackground'],
				brightWhite: globalData.colors['terminal.ansiBrightWhite'],
			    bhite: globalData.colors['terminal.ansiWhite'],
			    brightBlack: globalData.colors['terminal.ansiBrightBlack'],
			    black: globalData.colors['terminal.ansiBlack'],
			    blue: globalData.colors['terminal.ansiBlue'],
			    brightBlue: globalData.colors['terminal.ansiBrightBlue'],
			    green: globalData.colors['terminal.ansiGreen'],
			    brightGreen: globalData.colors['terminal.ansiBrightGreen'],
			    cyan: globalData.colors['terminal.ansiCyan'],
			    brightCyan: globalData.colors['terminal.ansiBrightCyan'],
			    red: globalData.colors['terminal.ansiRed'],
			    brightRed: globalData.colors['terminal.ansiBrightRed'],
			    magenta: globalData.colors['terminal.ansiMagenta'],
			    brightMagenta: globalData.colors['terminal.ansiBrightMagenta'],
			    yellow: globalData.colors['terminal.ansiYellow'],
			    brightYellow: globalData.colors['terminal.ansiBrightYellow'],
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