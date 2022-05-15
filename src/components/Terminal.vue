<!--
 * @Author: lisong
 * @Date: 2022-05-13 19:43:11
 * @Description: 
-->
<template>
	<div class="my-terminal" ref="terminal">
		<div @click="onClickTerminal" @contextmenu.stop.prevent="onContextmenu" @scroll="onScroll" class="my-terminal-scroller my-scroll-overlay my-scroll-small" ref="scroller">
			<div :style="{ height: _scrollHeight, 'min-width': _scrollWidth }" class="my-terminal-content">
				<div :style="{ top: _top }" class="my-terminal-render" ref="render">
					<div :style="{height: _lineHeight}" class="my-terminal-line" v-for="(item, index) in renderList" v-if="index < renderList.length - 1">
						<span>{{item.text || '&nbsp;'}}</span>
					</div>
					<div :style="{height: _lineHeight}" class="my-terminal-line" ref="lastLine">
						<span ref="lastDir">{{_lastLine.text}}</span>
						<span ref="text" style="position:relative">
							<span :class="{'my-terminal-selection': textSelected}" v-html="_text"></span>
							<span :style="{opacity: opacity, height: _lineHeight, left: cursorLeft + 'px'}" class="my-terminal-cursor" ref="cursor"></span>
						</span>
					</div>
				</div>
			</div>
		</div>
		<textarea
			:style="{left: textareaPos.left + 'px', top: textareaPos.top + 'px', height: _lineHeight, 'line-height': _lineHeight }"
			@blur="onBlur"
			@copy.prevent="onCopy"
			@cut.prevent="onCopy"
			@focus="onFocus"
			@keydown="onKeyDown"
			@paste.prevent="onPaste"
			class="my-terminal-textarea"
			ref="textarea"
			v-model="text"
		></textarea>
	</div>
</template>
<script>
import Util from '@/common/util';
import $ from 'jquery';

const iconvLite = window.require('iconv-lite');
const spawn = window.require('child_process').spawn;
export default {
	name: 'Terminal',
	data() {
		return {
			charObj: {
				charWidth: 7.15,
				fullAngleCharWidth: 15,
				charHight: 19,
			},
			textareaPos: {
				left: 0,
				top: 0,
			},
			cursorColumn: 0,
			cursorLeft: 0,
			tabSize: 4,
			list: [],
			renderList: [],
			opacity: 0,
			text: '',
			scrollLeft: 0,
			scrollTop: 0,
			startLine: 1,
			maxWidthObj: {
				width: 0,
				line: '',
			},
			textSelected: false,
		};
	},
	computed: {
		_lineHeight() {
			return this.charObj.charHight + 'px';
		},
		_lastLine() {
			if (this.renderList.length) {
				return this.renderList.peek();
			} else {
				return { text: '', line: '' };
			}
		},
		_scrollHeight() {
			return this.list.length * this.charObj.charHight + 'px';
		},
		_scrollWidth() {
			return this.maxWidthObj.width + 'px';
		},
		_top() {
			return (this.startLine - 1) * this.charObj.charHight + 'px';
		},
		_text() {
			let preText = this.text.slice(0, this.cursorColumn);
			let nextText = this.text.slice(this.cursorColumn);
			let result = preText + '<span class="my-terminal-anchor">' + nextText;
			this.$nextTick(() => {
				this.cursorLeft = $('.my-terminal-anchor')[0].offsetLeft;
				this.setTextareaPos();
			});
			return result;
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
			} else {
				this.updateLineWidth();
				this.scrollToCursor();
			}
		},
		cursorColumn() {
			this.showCursor(true);
		},
	},
	created() {
		this.line = 1;
		this.cmdProcess = spawn('powershell');
		this.cmdProcess.stdout.on('data', (data) => {
			this.addLine(data);
		});
		this.cmdProcess.stderr.on('data', (data) => {
			this.addLine(data);
		});
		window.terminal = this;
	},
	mounted() {
		this.charObj = Util.getCharWidth(this.$refs.render, '<div class="my-terminal-line">[dom]</div>');
		this.initResizeEvent();
	},
	methods: {
		initResizeEvent() {
			const resizeObserver = new ResizeObserver((entries) => {
				this.render();
			});
			resizeObserver.observe(this.$refs.terminal);
		},
		addLine(data) {
			let texts = iconvLite.decode(data, 'cp936').split(/\r\n|\n|\r/);
			let widthStart = this.list.length - 1;
			widthStart = widthStart >= 0 ? widthStart : 0;
			texts = texts.map((item) => {
				item = item.replace(/(?<=\s)\s+$/, '');
				return {
					text: item,
				};
			});
			if (this.list.length) {
				let firstLine = texts[0].text;
				texts = texts.slice(1);
				this.list.peek().text += firstLine;
			}
			texts.forEach((item) => {
				item.line = this.line++;
			});
			this.list.push(...texts);
			this.render();
			this.scrollToCursor();
			this.setLineWidth(this.list.slice(widthStart));
			requestAnimationFrame(() => {
				if (this.added) {
					setTimeout(() => {
						this.focus();
					}, 500);
				}
			});
		},
		focus() {
			this.$refs.textarea.focus();
		},
		// 显示光标
		showCursor(force) {
			if (this.cursorVisible && !force) {
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
		render(forceCursorView) {
			this.maxVisibleLines = Math.ceil(this.$refs.terminal.clientHeight / this.charObj.charHight) + 1;
			this.renderList = this.list.slice(this.startLine - 1, this.startLine - 1 + this.maxVisibleLines);
			this.setTextareaPos();
		},
		scrollToCursor() {
			this.$nextTick(() => {
				let $scroller = this.$refs.scroller;
				$scroller.scrollTop = $scroller.scrollHeight - $scroller.clientHeight;
				requestAnimationFrame(() => {
					let width = $scroller.clientWidth;
					let $cursor = this.$refs.cursor;
					let $lastDir = this.$refs.lastDir;
					if ($cursor.offsetLeft + $lastDir.offsetWidth - this.scrollLeft > width - 35) {
						$scroller.scrollLeft = $cursor.offsetLeft + $lastDir.offsetWidth - width + 35;
					}
				});
			});
		},
		setTextareaPos() {
			this.$nextTick(() => {
				let width = this.$refs.scroller.clientWidth;
				let height = this.$refs.scroller.clientHeight;
				let left = this.textareaPos.left;
				let top = this.$refs.lastLine.offsetTop;
				if (this._lastLine.line === this.list.length) {
					let $cursor = this.$refs.cursor;
					let $lastDir = this.$refs.lastDir;
					left = $cursor.offsetLeft + $lastDir.offsetWidth - this.scrollLeft;
					left = left > width - 10 ? width - 10 : left;
					left = left < 0 ? 0 : left;
				}
				top = top > height - this.charObj.charHight ? height - this.charObj.charHight : top;
				top = top < 0 ? 0 : top;
				this.textareaPos = {
					left: left + 15,
					top: top + 10,
				};
			});
		},
		/**
		 * 设置每行文本的宽度
		 * @param {Array} texts
		 */
		setLineWidth(texts) {
			let that = this;
			let index = 0;
			if (!texts) {
				let last = this.list.peek();
				this.maxWidthObj = { width: 0 };
				texts = this.list.slice(0, -1);
				texts.push({
					text: last.text + this.text,
					line: last.line,
				});
			}
			cancelIdleCallback(this.setLineWidthTimer);
			_setLineWidth();

			function _setLineWidth() {
				let startTime = Date.now();
				let count = 0;
				while (index < texts.length) {
					let textObj = texts[index];
					let width = that.getStrWidth(textObj.text);
					if (width > that.maxWidthObj.width) {
						that.maxWidthObj = {
							line: textObj.line,
							width: width,
						};
					}
					index++;
					count++;
					if (count % 5 === 0 && Date.now() - startTime > 20) {
						break;
					}
				}
				if (index < texts.length) {
					that.setLineWidthTimer = requestIdleCallback(() => {
						_setLineWidth();
					});
				}
			}
		},
		updateLineWidth() {
			cancelAnimationFrame(this.updateLineWidthTimer);
			this.updateLineWidthTimer = requestAnimationFrame(() => {
				let width = this.getStrWidth(this._lastLine.text + this.text);
				if (width >= this.maxWidthObj.width) {
					this.maxWidthObj = {
						line: this.list.peek().line,
						width: width,
					};
				} else if (this.maxWidthObj.line === this.list.length) {
					this.setLineWidth();
				}
			});
		},
		// 获取文本在浏览器中的宽度
		getStrWidth(str, start, end) {
			return Util.getStrWidth(str, this.charObj.charWidth, this.charObj.fullAngleCharWidth, this.tabSize, start, end);
		},
		onKeyDown(e) {
			switch (e.keyCode) {
				case 13: //回车
				case 100:
					e.preventDefault();
					this.text += '\r\n';
					break;
			}
			requestAnimationFrame(() => {
				const $textarea = this.$refs.textarea;
				this.textSelected = $textarea.selectionEnd != $textarea.selectionStart;
				this.cursorColumn = $textarea.selectionEnd;
			});
		},
		// 复制事件
		onCopy(e) {
			let mime = window.clipboardData ? 'Text' : 'text/plain';
			let clipboardData = e.clipboardData || window.clipboardData;
			let text = window.getSelection().toString();
			clipboardData.setData(mime, text);
		},
		// 粘贴事件
		onPaste(e) {
			let mime = window.clipboardData ? 'Text' : 'text/plain';
			let clipboardData = e.clipboardData || window.clipboardData;
			let copyText = '';
			copyText = clipboardData.getData(mime);
			this.text += copyText;
		},
		onFocus() {
			this.showCursor();
		},
		onBlur() {
			this.hideCursor();
		},
		onClickTerminal(e) {
			if (window.getSelection().toString()) {
				return;
			}
			this.focus();
		},
		onContextmenu(e) {},
		onScroll(e) {
			this.scrollTop = e.target.scrollTop;
			this.scrollLeft = e.target.scrollLeft;
			this.startLine = Math.floor(this.scrollTop / this.charObj.charHight) + 1;
			this.render();
		},
	},
};
</script>