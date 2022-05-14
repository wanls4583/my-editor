<!--
 * @Author: lisong
 * @Date: 2022-05-13 19:43:11
 * @Description: 
-->
<template>
	<div class="my-terminal" ref="terminal">
		<div :style="{'padding-bottom': _lineHeight}" @click="onClickTerminal" @contextmenu.stop.prevent="onContextmenu" @scroll="onScroll" class="my-height-100 my-scroll-overlay my-scroll-small">
			<template v-for="(item, index) in list">
				<span :style="{'line-height': _lineHeight}" class="my-terminal-line">{{item.text || '&nbsp;'}}</span>
				<br v-if="index < list.length - 1" />
			</template>
			<span class="my-terminal-line">{{text}}</span>
			<span :style="{opacity: opacity}" class="my-terminal-cursor" ref="cursor"></span>
		</div>
		<textarea
			:style="{left: textareaPos.left + 'px', top: textareaPos.top + 'px', height: _lineHeight, 'line-height': _lineHeight }"
			@blur="onBlur"
			@focus="onFocus"
			@keydown="onKeydown"
			class="my-terminal-textarea"
			ref="textarea"
			v-model="text"
		></textarea>
	</div>
</template>
<script>
const iconvLite = window.require('iconv-lite');
const spawn = window.require('child_process').spawn;
export default {
	name: 'Terminal',
	data() {
		return {
			list: [],
			opacity: 0,
			text: '',
			lineHeight: 21,
			scrollLeft: 0,
			scrollTop: 0,
			textareaPos: {
				left: 0,
				top: 0,
			},
		};
	},
	computed: {
		_lineHeight() {
			return this.lineHeight + 'px';
		},
	},
	watch: {
		text() {
			this.text = this.text.replace(/\r\n|\n|\r/, '\r\n');
			if (/\r\n/.test(this.text)) {
				let texts = this.text.split('\r\n');
				let text = texts.slice(0, texts.length - 1).join('\r\n');
				this.text = texts.pop();
				this.cmdProcess.stdin.write(iconvLite.encode(text + '\r\n', 'cp936'));
			}
		},
	},
	created() {
		this.cmdProcess = spawn('powershell');
		this.cmdProcess.stdout.on('data', (data) => {
			this.addLine(data);
		});
		this.cmdProcess.stderr.on('data', (data) => {
			this.addLine(data);
		});
	},
	mounted() {
		this.initResizeEvent();
	},
	methods: {
		initResizeEvent() {
			const resizeObserver = new ResizeObserver((entries) => {
				this.renderCursor();
			});
			resizeObserver.observe(this.$refs.terminal);
		},
		addLine(data) {
			let texts = iconvLite.decode(data, 'cp936').split(/\r\n|\n|\r/);
			texts = texts.map((item) => {
				return {
					text: item,
				};
			});
			if (this.list.length) {
				let firstLine = texts[0].text;
				texts = texts.slice(1);
				this.list.peek().text += firstLine;
			}
			this.list.push(...texts);
			this.added = true;
			requestAnimationFrame(() => {
				this.$refs.cursor.scrollIntoView();
				this.renderCursor();
				if (this.added) {
					setTimeout(() => {
						this.focus();
					}, 500);
				}
			});
		},
		// 显示光标
		showCursor() {
			if (this.cursorVisible) {
				return;
			}
			this.cursorVisible = true;
			this.opacity = 1;
			let _timer = () => {
				clearTimeout(this.curserTimer);
				this.curserTimer = setTimeout(() => {
					this.opacity = this.opacity === 1 ? 0 : 1;
					_timer();
				}, 500);
			};
			_timer();
		},
		// 隐藏光标
		hideCursor() {
			clearTimeout(this.curserTimer);
			this.cursorVisible = false;
			this.opacity = 0;
		},
		renderCursor() {
			this.$nextTick(() => {
				let terminal = this.$refs.terminal;
				let height = terminal.clientHeight;
				let cursor = this.$refs.cursor;
				let left = cursor.offsetLeft - this.scrollLeft;
				let top = cursor.offsetTop - this.scrollTop;
				left = left < 0 ? 0 : left;
				top = top > height - this.lineHeight ? height - this.lineHeight : top;
				top = top < 0 ? 0 : top;
				this.textareaPos = {
					left: left,
					top: top,
				};
			});
		},
		focus() {
			this.$refs.textarea.focus();
			requestAnimationFrame(() => {
				this.$refs.textarea.focus();
			});
		},
		onFocus() {
			this.showCursor();
		},
		onBlur() {
			this.hideCursor();
		},
		onKeydown(e) {
			if (e.keyCode === 13 || e.keyCode === 100) {
				e.preventDefault();
				this.text += '\r\n';
			}
		},
		onClickTerminal(e) {
			this.focus();
		},
		onContextmenu(e) {},
		onScroll(e) {
			this.scrollTop = e.target.scrollTop;
			this.scrollLeft = e.target.scrollLeft;
			this.renderCursor();
		},
	},
};
</script>