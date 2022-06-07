<!--
 * @Author: lisong
 * @Date: 2022-11-12 13:15:02
 * @Description: 
-->
<template>
	<div class="my-minimap" ref="wrap">
		<canvas :height="canvasHeight" :width="canvasWidth" ref="canvas"></canvas>
		<div :style="{top: _top + 'px', height: blockHeight + 'px'}" @mousedown="onBlockMDown" class="my-minimap-block"></div>
	</div>
</template>
<script>
import EventBus from '@/event';
import globalData from '@/data/globalData';
import $ from 'jquery';
import Util from '@/common/util';

export default {
	name: 'Minimap',
	components: {},
	props: {
		contentHeight: Number,
		scrollTop: Number,
		nowLine: Number,
	},
	data() {
		return {
			startLine: 1,
			maxVisibleLines: 1,
			canvasWidth: 0,
			canvasHeight: 0,
			width: 120,
			height: 0,
			blockHeight: 0,
			scale: 0.1,
			top: 0,
		};
	},
	watch: {
		scrollTop() {
			this.setStartLine();
		},
		contentHeight() {
			this.setStartLine();
		},
	},
	computed: {
		_top() {
			let top = (this.nowLine - this.startLine) * this.$parent.charObj.charHight - this.top;
			return top * this.scale;
		},
	},
	created() {
		this.canvasWidth = this.width / this.scale;
		this.renderedIdMap = {};
	},
	mounted() {
		this.ctx = this.$refs.canvas.getContext('2d');
		this.initEvent();
		this.setSize();
	},
	destroyed() {
		this.unbindEvent();
	},
	methods: {
		initEvent() {
			this.initEvent.fn1 = (e) => {
				this.$parent.active && this.onDocumentMmove(e);
			};
			this.initEvent.fn2 = (e) => {
				this.$parent.active && this.onDocumentMouseUp(e);
			};
			$(document).on('mousemove', this.initEvent.fn1);
			$(document).on('mouseup', this.initEvent.fn2);
			this.initResizeEvent();
			this.initEventBus();
		},
		initEventBus() {
			EventBus.$on(
				'render-line',
				(this.initEventBus.fn1 = (data) => {
					if (this.$parent.editorId === data.editorId) {
						let line = this.renderedIdMap[data.lineId];
						line = (line && line.line) || 0;
						if (line && this.$parent.myContext.htmls[line - 1] && this.$parent.myContext.htmls[line - 1].lineId === data.lineId) {
							this.drawLine(line, true);
						}
					}
				})
			);
		},
		initResizeEvent() {
			const resizeObserver = new ResizeObserver((entries) => {
				if (this.$refs.wrap) {
					requestAnimationFrame(() => {
						this.setSize();
						this.render();
					});
				}
			});
			resizeObserver.observe(this.$refs.wrap);
		},
		unbindEvent() {
			$(document).unbind('mousemove', this.initEvent.fn1);
			$(document).unbind('mouseup', this.initEvent.fn2);
			EventBus.$off('render-line', this.initEventBus.fn1);
		},
		setSize() {
			this.height = this.$refs.wrap.clientHeight;
			this.blockHeight = this.height * this.scale;
			this.canvasHeight = this.height / this.scale;
			this.maxVisibleLines = Math.ceil(this.canvasHeight / this.$parent.charObj.charHight) + 1;
		},
		setStartLine() {
			let maxScrollTop1 = this.contentHeight - this.canvasHeight;
			let maxScrollTop2 = this.contentHeight - this.height;
			let scrollTop = 0;
			maxScrollTop1 = maxScrollTop1 < 0 ? 0 : maxScrollTop1;
			scrollTop = this.scrollTop * (maxScrollTop1 / maxScrollTop2);
			scrollTop = scrollTop > maxScrollTop1 ? maxScrollTop1 : scrollTop;
			this.startLine = Math.floor(scrollTop / this.$parent.charObj.charHight);
			this.startLine++;
			this.top = scrollTop % this.$parent.charObj.charHight;
		},
		drawLine(line, clear) {
			let charHight = this.$parent.charObj.charHight;
			let top = (line - this.startLine) * charHight - this.top;
			let lineObj = this.$parent.myContext.htmls[line - 1];
			let cache = this.renderedIdMap[lineObj.lineId];
			let tokens = lineObj.tokens;
			let html = '';
			if (clear) {
				this.ctx.clearRect(0, top, this.canvasWidth, charHight);
			}
			if (!lineObj.html) {
				if (lineObj.tokens && lineObj.tokens.length) {
					lineObj.tokens = this.$parent.tokenizer.splitLongToken(lineObj.tokens);
					lineObj.html = this.$parent.tokenizer.createHtml(lineObj.tokens, lineObj.text);
				}
			}
			html = lineObj.html || lineObj.text;
			if (cache && cache.html === html) {
				this.ctx.drawImage(cache.canvas, 20, top);
			} else {
				let canvas = document.createElement('canvas');
				let ctx = canvas.getContext('2d');
				canvas.width = this.$refs.canvas.width;
				canvas.height = charHight;
				ctx.font = `${14}px Consolas`;
				ctx.textBaseline = 'middle';
				if (tokens) {
					let left = 20;
					for (let i = 0; i < tokens.length; i++) {
						let token = tokens[i];
						let text = lineObj.text.slice(token.startIndex, token.endIndex);
						text = text.replace(/[a-zA-Z]/g, '▉ ');
						text = text.replace(/\t/g, '    ');
						ctx.fillStyle = globalData.colors['editor.foreground'];
						if (token.scopeId) {
							let scope = globalData.scopeIdMap[token.scopeId];
							if (scope.settings && scope.settings.foreground) {
								ctx.fillStyle = scope.settings.foreground;
							}
						}
						ctx.fillText(text, left, charHight / 2);
						left += ctx.measureText(text).width;
						// 退出无效渲染
						if (left > this.canvasWidth) {
							break;
						}
					}
				} else {
					ctx.fillStyle = globalData.colors['editor.foreground'];
					ctx.fillText(lineObj.text.replace(/[a-zA-Z]/g, '▉ ').replace(/\t/g, '    '), 20, charHight / 2);
				}
				this.ctx.drawImage(canvas, 20, top);
				this.renderedIdMap[lineObj.lineId] = {
					line: line,
					html: html,
					canvas: canvas,
				};
			}
		},
		render() {
			if (this.rendering) {
				return;
			}
			this.rendering = true;
			requestAnimationFrame(() => {
				this.renderLine();
				this.rendering = 0;
			});
		},
		renderLine() {
			this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
			for (let line = this.startLine, i = 0; line <= this.$parent.myContext.htmls.length && i < this.maxVisibleLines; i++) {
				let fold = this.$parent.folder.getFoldByLine(line);
				this.drawLine(line);
				if (fold) {
					line = fold.end.line;
				} else {
					line++;
				}
			}
		},
		onBlockMDown(e) {
			this.startBlockMouseObj = e;
			this.bTop = this._top;
		},
		onDocumentMmove(e) {
			if (this.startBlockMouseObj) {
				let maxScrollTop1 = this.contentHeight - this.height;
				let maxScrollTop2 = this.height - this.blockHeight;
				let delta = e.clientY - this.startBlockMouseObj.clientY;
				let top = this.bTop;
				top += delta;
				top = top > maxScrollTop2 ? maxScrollTop2 : top;
				this.startBlockMouseObj = e;
				this.bTop += delta;
				if (this.moving) {
					return;
				}
				this.moving = true;
				requestAnimationFrame(() => {
					this.$parent.setStartLine(top * (maxScrollTop1 / maxScrollTop2));
					this.moving = false;
				});
			}
		},
		onDocumentMouseUp(e) {
			this.startBlockMouseObj = null;
			this.moving = false;
		},
	},
};
</script>
