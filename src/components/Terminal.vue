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
			class="my-terminal-textarea"
			ref="textarea"
			v-model="text"
		></textarea>
	</div>
</template>
<script>
import Util from '@/common/util';
import EventBus from '@/event';
import $ from 'jquery';

const ansiHTML = window.require('ansi-html');
const iconvLite = window.require('iconv-lite');
const spawn = window.require('child_process').spawn;
const CSI = /\x1B\[/g;
const ANSI_ESCAPE_SOURCE = [
	'(?<CURSOR_UP>\\x1B\\[(\\d+)A)',
	'(?<CURSOR_DOWN>\\x1B\\[(\\d+)B)',
	'(?<CURSOR_FORWARD>\\x1B\\[(\\d+)C)',
	'(?<CURSOR_BACK>\\x1B\\[(\\d+)D)',
	'(?<CURSOR_YX>\\x1B\\[(?:(\\d+);(\\d+))?H)',
	'(?<CLEAN_LINE>\\x1B\\[([012])K)',
	'(?<CLEAN_AREA>\\x1B\\[([012])J)',
];
const ANSI_ESCAPE = new RegExp(ANSI_ESCAPE_SOURCE.join('|'));
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
			list: [{ text: '', line: 1 }],
			renderList: [],
			cmdList: [],
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
				this.text = texts.pop();
				this.cmdList.push(...texts);
				this.execCmd();
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
		this.cmdCursorLine = 1;
		this.cmdProcess = spawn('powershell', { cwd: 'E:\\Users\\Administrator\\Desktop\\新建文件夹' });
		this.cmdProcess.stdout.on('data', (data) => {
			this.addLine(data);
		});
		this.cmdProcess.stderr.on('data', (data) => {
			this.addLine(data);
		});
		EventBus.$on('cmd-end', () => {
			this.execCmd();
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
		execCmd() {
			cancelIdleCallback(this.execCmdTimer);
			if (this.cmdList.length) {
				this.execCmdTimer = requestIdleCallback(() => {
					const cmd = this.cmdList.shift();
					this.cmdId = Util.getUUID();
					this.cmdCursorLine = this.list.length;
					this.startCmdLine = this.list.length + 1;
					this.cmdProcess.stdin.write(iconvLite.encode(cmd + '\r\n', 'cp936'));
					this.cmdProcess.stdin.write(`echo ${this.cmdId}` + '\r\n');
				});
			}
		},
		checkEnd(lintText) {
			if (lintText.endsWith(this.cmdId)) {
				return true;
			}
			return false;
		},
		addLine(data) {
			let texts = iconvLite.decode(data, 'cp936').split(/\r\n|\n|\r/);
			// 检测命令是否结束
			if (texts[0].endsWith(this.cmdId)) {
				let endCmd = `echo ${this.cmdId}`;
				// 结束命令可能跟在上条命令的文件目录后
				if (texts[0].endsWith(endCmd) && texts[0].length > endCmd.length) {
					this.cmdCursorLine++;
					this.writeLine(0, texts[0].slice(0, -endCmd.length));
					_render.call(this);
				}
				this.cmdEnd = this.cmdId;
				return;
			}
			// 命令结束时会输出当前文件目录
			if (this.cmdEnd) {
				this.cmdEnd = '';
				EventBus.$emit('cmd-end');
				return;
			}
			for (let i = 0; i < texts.length; i++) {
				let text = texts[i];
				let res = null;
				if (i === 0) {
					if (this.cmdCursorLine + 1 === this.startCmdLine) {
						text = this.list[this.cmdCursorLine - 1].text + text;
					}
				} else {
					this.cmdCursorLine++;
				}
				this.writeLine(0, text);
			}
			_render.call(this);

			function _render() {
				this.render();
				this.scrollToCursor();
				this.setLineWidth();
			}
		},
		writeLine(col, text) {
			let line = this.cmdCursorLine;
			let lineObj = this.list[line - 1];
			let res = ANSI_ESCAPE.exec(text);
			col = col || 0;
			col = col < 0 ? 0 : col;
			if (res) {
				var execObj = _getExecObj(res);
				if (res.groups.CURSOR_UP) {
					this.cursorUp(execObj, col);
				} else if (res.groups.CURSOR_DOWN) {
					this.cursorDown(execObj, col);
				} else if (res.groups.CURSOR_FORWARD) {
					this.cursorForward(execObj, col);
				} else if (res.groups.CURSOR_BACK) {
					this.cursorBack(execObj, col);
				} else if (res.groups.CURSOR_YX) {
					this.cursorTo(execObj, col);
				} else if (res.groups.CLEAN_LINE) {
					this.clearLine(execObj, col);
				} else if (res.groups.CLEAN_AREA) {
					this.clearArea(execObj, col);
				}
			} else if (lineObj) {
				let originText = lineObj.text;
				lineObj.text = originText.slice(0, col);
				lineObj.text += Util.space(col - lineObj.text.length);
				lineObj.text += text;
				lineObj.text += originText.slice(lineObj.text.length);
			} else {
				text = Util.space(col) + text;
				lineObj = {
					line: line,
					text: text,
				};
				this.list.push(lineObj);
			}

			function _getExecObj(res) {
				var result = [];
				res.slice(1).forEach((item) => {
					item && result.push(item);
				});
				result.index = res.index;
				result.input = res.input;
				return result;
			}
		},
		cursorUp(res, col) {
			let lines = res[1] - 0;
			let beforeText = res.input.slice(0, res.index);
			let afterText = res.input.slice(res.index + res[0].length);
			this.writeLine(col, beforeText);
			if (this.cmdCursorLine > this.startCmdLine) {
				this.cmdCursorLine -= lines;
				this.cmdCursorLine = this.cmdCursorLine < this.startCmdLine ? this.startCmdLine : this.cmdCursorLine;
			}
			this.writeLine(beforeText.length, afterText);
		},
		cursorDown(res, col) {
			let lines = res[1] - 0;
			let beforeText = res.input.slice(0, res.index);
			let afterText = res.input.slice(res.index + res[0].length);
			this.writeLine(col, beforeText);
			this.cmdCursorLine += lines;
			for (let i = this.list.length; i < this.cmdCursorLine; i++) {
				this.list.push({ text: '', line: i + 1 });
			}
			this.writeLine(beforeText.length, afterText);
		},
		cursorForward(res, col) {
			let cols = res[1] - 0;
			let beforeText = res.input.slice(0, res.index);
			let afterText = res.input.slice(res.index + res[0].length);
			this.writeLine(col, beforeText);
			this.writeLine(beforeText.length + cols, afterText);
		},
		cursorBack(res, col) {
			let cols = res[1] - 0;
			let beforeText = res.input.slice(0, res.index);
			let afterText = res.input.slice(res.index + res[0].length);
			this.writeLine(col, beforeText);
			this.writeLine(beforeText.length - cols, afterText);
		},
		cursorTo(res, col) {
			let rowTo = (res[1] && res[1] - 0) || 1;
			let colTo = (res[2] && res[2] - 0) || 1;
			let beforeText = res.input.slice(0, res.index);
			let afterText = res.input.slice(res.index + res[0].length);
			this.writeLine(col, beforeText);
			this.cmdCursorLine = this.startCmdLine + rowTo - 1;
			for (let i = this.list.length; i < this.cmdCursorLine; i++) {
				this.list.push({ text: '', line: i + 1 });
			}
			this.writeLine(colTo, afterText);
		},
		clearLine(res, col) {
			let lineObj = this.list[this.cmdCursorLine - 1];
			let afterText = res.input.slice(res.index + res[0].length);
			let beforeText = res.input.slice(0, res.index);
			let code = res[1] - 0;
			if (code === 0) {
				//清空之后的区域
				lineObj.text = lineObj.text.slice(0, res.index);
				this.writeLine(col, beforeText);
			} else if (code === 1) {
				//清空之前的区域
				lineObj.text = Util.space(res.index) + lineObj.text.slice(res.index + res[0].length);
			} else if (code === 2) {
				//清空整行
				lineObj.text = '';
			}
			this.writeLine(beforeText.length, afterText);
		},
		clearArea(res, col) {
			let lineObj = this.list[this.cmdCursorLine - 1];
			let afterText = res.input.slice(res.index + res[0].length);
			let beforeText = res.input.slice(0, res.index);
			let code = res[1] - 0;
			if (code === 0) {
				//清空之后的区域
				for (let i = this.cmdCursorLine; i < this.list.length; i++) {
					this.list[i] = '';
				}
				lineObj.text = lineObj.text.slice(0, res.index);
				this.writeLine(col, beforeText);
			} else if (code === 1) {
				//清空之前的区域
				for (let i = 0; i < this.cmdCursorLine - 1; i++) {
					this.list[i].text = '';
				}
				lineObj.text = Util.space(res.index) + lineObj.text.slice(res.index + res[0].length);
			} else if (code === 2) {
				//清空全部
				for (let i = 0; i < this.list.length; i++) {
					this.list[i].text = '';
				}
			}
			this.writeLine(beforeText.length, afterText);
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
					left += 15;
				}
				top = top > height - this.charObj.charHight ? height - this.charObj.charHight : top;
				top = top < 0 ? 0 : top;
				top += 10;
				this.textareaPos = {
					left: left,
					top: top,
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