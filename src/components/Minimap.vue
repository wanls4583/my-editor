<!--
 * @Author: lisong
 * @Date: 2022-11-12 13:15:02
 * @Description: 
-->
<template>
	<div class="my-minimap" ref="wrap">
		<canvas :height="height" :width="width" ref="canvas"></canvas>
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
		this.worker = new Worker('work/minimap.js');
		this.renderedIdMap = {};
	},
	mounted() {
		let offscreen = this.$refs.canvas.transferControlToOffscreen();
		this.worker.postMessage({ event: 'init', data: { canvas: offscreen } }, [offscreen]);
		this.setSize();
		this.initEvent();
	},
	destroyed() {
		this.worker.terminate();
		this.unbindEvent();
	},
	methods: {
		initWorkerData() {
			this.worker.postMessage({
				event: 'init-data',
				data: {
					charHight: this.$parent.charObj.charHight * this.scale,
					width: this.width,
					height: this.height,
					scale: this.scale,
					colors: globalData.colors,
					scopeIdMap: globalData.scopeIdMap,
				},
			});
		},
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
						if (line) {
							this.worker.postMessage({ event: 'render-line', data: this.getRenderObj(line.num) });
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
			this.initWorkerData();
		},
		setStartLine() {
			let maxScrollTop1 = this.contentHeight - this.canvasHeight;
			let maxScrollTop2 = this.contentHeight - this.height;
			let scrollTop = 0;
			maxScrollTop1 = maxScrollTop1 < 0 ? 0 : maxScrollTop1;
			scrollTop = maxScrollTop2 ? this.scrollTop * (maxScrollTop1 / maxScrollTop2) : 0;
			scrollTop = scrollTop > maxScrollTop1 ? maxScrollTop1 : scrollTop;
			this.startLine = Math.floor(scrollTop / this.$parent.charObj.charHight);
			this.startLine++;
			this.top = scrollTop % this.$parent.charObj.charHight;
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
			let lines = [];
			for (let line = this.startLine, i = 0; line <= this.$parent.myContext.htmls.length && i < this.maxVisibleLines; i++) {
				let fold = this.$parent.folder.getFoldByLine(line);
				let lineObj = this.$parent.myContext.htmls[line - 1];
				let renderObj = this.getRenderObj(line);
				lines.push(renderObj);
				if (fold) {
					line = fold.end.line;
				} else {
					line++;
				}
			}
			this.worker.postMessage({ event: 'render', data: lines });
		},
		getRenderObj(line) {
			let top = (line - this.startLine) * this.$parent.charObj.charHight * this.scale;
			let lineObj = this.$parent.myContext.htmls[line - 1];
			let cache = this.renderedIdMap[lineObj.lineId];
			if (!lineObj.html) {
				if (lineObj.tokens && lineObj.tokens.length) {
					lineObj.tokens = this.$parent.tokenizer.splitLongToken(lineObj.tokens);
					lineObj.html = this.$parent.tokenizer.createHtml(lineObj.tokens, lineObj.text);
				}
			}
			if (cache && cache.html === lineObj.html) {
				return {
					top,
					lineId: lineObj.lineId,
				};
			}
			this.renderedIdMap[lineObj.lineId] = { num: line, html: lineObj.html };
			return {
				top,
				lineObj: {
					lineId: lineObj.lineId,
					text: lineObj.text,
					html: lineObj.html,
					tokens:
						lineObj.tokens &&
						lineObj.tokens.map((item) => {
							return { startIndex: item.startIndex, endIndex: item.endIndex, scopeId: item.scopeId };
						}),
				},
			};
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
				if (maxScrollTop2 > this.contentHeight * this.scale - this.blockHeight) {
					maxScrollTop2 = this.contentHeight * this.scale - this.blockHeight;
				}
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
