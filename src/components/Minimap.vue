<!--
 * @Author: lisong
 * @Date: 2022-11-12 13:15:02
 * @Description: 
-->
<template>
	<div class="my-minimap" ref="wrap">
		<canvas :height="height" :width="leftWidth" class="my-minimap-canvas-left" ref="leftDiffCanvas"></canvas>
		<canvas :height="height" :width="width" class="my-minimap-canvas-center" ref="canvas"></canvas>
		<canvas :height="height" :width="rightWidth" class="my-minimap-canvas-right" ref="rightDiffCanvas"></canvas>
		<div :style="{top: blockTop + 'px', height: blockHeight + 'px'}" @mousedown="onBlockMDown" class="my-minimap-block"></div>
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
			width: 0,
			leftWidth: 8,
			rightWidth: 14,
			height: 0,
			blockHeight: 0,
			scale: 0.1,
			top: 0,
			blockTop: 0,
		};
	},
	watch: {
		scrollTop() {
			this.setStartLine();
		},
		contentHeight() {
			this.setStartLine();
		},
		nowLine() {
			this.setTop();
		},
	},
	created() {
		this.worker = new Worker('work/minimap.js');
		this.renderedIdMap = {};
	},
	mounted() {
		let offscreen = this.$refs.canvas.transferControlToOffscreen();
		let leftOffscreen = this.$refs.leftDiffCanvas.transferControlToOffscreen();
		let rightOffscreen = this.$refs.rightDiffCanvas.transferControlToOffscreen();
		this.worker.postMessage(
			{
				event: 'init',
				data: {
					canvas: offscreen,
					leftDiffCanvas: leftOffscreen,
					rightDiffCanvas: rightOffscreen,
				},
			},
			[offscreen, leftOffscreen, rightOffscreen]
		);
		this.setSize();
		this.initWorkerData('theme');
		this.initEvent();
	},
	destroyed() {
		this.worker.terminate();
		this.unbindEvent();
	},
	methods: {
		initWorkerData(type) {
			let data = {};
			if (type === 'size' || !type) {
				Object.assign(data, {
					charHight: this.$parent.charObj.charHight * this.scale,
					width: this.width,
					height: this.height,
					leftWidth: this.leftWidth,
					rightWidth: this.rightWidth,
					scale: this.scale,
				});
			}
			if (type === 'theme' || !type) {
				Object.assign(data, {
					colors: globalData.colors,
					scopeIdMap: globalData.scopeIdMap,
				});
			}
			this.worker.postMessage({
				event: 'init-data',
				data: data,
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
						this.renderLine(data.lineId);
					}
				})
			);
		},
		initResizeEvent() {
			const resizeObserver = new ResizeObserver((entries) => {
				if (this.$refs.wrap && this.$refs.wrap.clientHeight) {
					requestAnimationFrame(() => {
						this.setSize();
						this.setStartLine();
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
			this.width = this.$refs.wrap.clientWidth - 22;
			this.height = this.$refs.wrap.clientHeight;
			this.blockHeight = this.height * this.scale;
			this.canvasHeight = this.height / this.scale;
			this.maxVisibleLines = Math.ceil(this.canvasHeight / this.$parent.charObj.charHight) + 1;
			this.initWorkerData('size');
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
			this.setTop();
		},
		setTop() {
			let top = (this.nowLine - this.startLine) * this.$parent.charObj.charHight - this.top;
			this.blockTop = top * this.scale;
		},
		render() {
			this.renderLines();
			this.renderDiff();
		},
		renderLines() {
			let lines = [];
			let renderedIdMap = {};
			for (let line = this.startLine, i = 0; line <= this.$parent.myContext.htmls.length && i < this.maxVisibleLines; i++) {
				let fold = this.$parent.folder.getFoldByLine(line);
				let lineObj = this.$parent.myContext.htmls[line - 1];
				let preLineObj = this.$parent.myContext.htmls[line - 2];
				let preRuleId = (preLineObj && preLineObj.states && preLineObj.states.ruleId) || null;
				let cache = this.renderedIdMap[lineObj.lineId];
				let renderObj = null;
				if (this.compairCache(cache, lineObj.text, preRuleId)) {
					renderObj = {
						top: (line - this.startLine) * this.$parent.charObj.charHight * this.scale,
						lineId: lineObj.lineId,
					};
				} else {
					renderObj = this.getRenderObj(line);
				}
				renderedIdMap[lineObj.lineId] = { num: line, text: lineObj.text, preRuleId };
				lines.push(renderObj);
				if (fold) {
					line = fold.end.line;
				} else {
					line++;
				}
			}
			this.renderedIdMap = renderedIdMap;
			this.worker.postMessage({ event: 'render', data: lines });
		},
		renderLine(lineId) {
			let cache = this.renderedIdMap[lineId];
			if (cache) {
				let lineObj = this.$parent.myContext.htmls[cache.num - 1];
				let preLineObj = this.$parent.myContext.htmls[cache.num - 2];
				let preRuleId = (preLineObj && preLineObj.states && preLineObj.states.ruleId) || null;
				if (lineObj && lineObj.lineId === lineId) {
					let renderObj = this.getRenderObj(cache.num);
					this.worker.postMessage({ event: 'render-line', data: renderObj });
					this.renderedIdMap[lineObj.lineId] = { num: cache.num, text: lineObj.text, preRuleId };
				}
			}
		},
		renderDiff() {
			let diffTree = [];
			if (this.$parent.diffTree) {
				for (let i = 0; i < this.$parent.diffTree.length; i++) {
					let item = this.$parent.diffTree[i];
					if (item.line >= this.startLine && item.line <= this.startLine + this.maxVisibleLines) {
						diffTree.push({
							line: item.line - this.startLine + 1,
							type: item.type,
							length: item.type === 'D' ? 1 : item.added.length,
						});
					}
				}
			}
			this.worker.postMessage({ event: 'render-diff', data: diffTree });
		},
		getRenderObj(line) {
			let top = (line - this.startLine) * this.$parent.charObj.charHight * this.scale;
			let lineObj = this.$parent.myContext.htmls[line - 1];
			let preLineObj = this.$parent.myContext.htmls[line - 2];
			let preRuleId = (preLineObj && preLineObj.states && preLineObj.states.ruleId) || null;
			if (!lineObj.html && lineObj.tokens) {
				lineObj.tokens.forEach((token) => {
					this.$parent.tokenizer.getScopeId(token);
				});
			}
			return {
				top,
				lineObj: {
					lineId: lineObj.lineId,
					text: lineObj.text,
					preRuleId: preRuleId,
					tokens:
						lineObj.tokens &&
						lineObj.tokens.map((item) => {
							return { startIndex: item.startIndex, endIndex: item.endIndex, scopeId: item.scopeId };
						}),
				},
			};
		},
		compairCache(cache, text, preRuleId) {
			if (cache && cache.text === text && cache.preRuleId === preRuleId) {
				return true;
			}
		},
		onBlockMDown(e) {
			this.startBlockMouseObj = e;
			this.bTop = this.blockTop;
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
				top = top < 0 ? 0 : top;
				top = top > maxScrollTop2 ? maxScrollTop2 : top;
				this.bTop += delta;
				this.startBlockMouseObj = e;
				this.moevScrollTop = top * (maxScrollTop1 / maxScrollTop2);
				if (this.moevScrollTop && !this.moveTask) {
					this.moveTask = globalData.scheduler.addUiTask(() => {
						if (this.moevScrollTop >= 0 && this.moevScrollTop !== this.scrollTop) {
							this.$parent.setStartLine(this.moevScrollTop);
							this.moevScrollTop = -1;
						} else {
							globalData.scheduler.removeUiTask(this.moveTask);
							this.moveTask = null;
						}
					});
				}
			}
		},
		onDocumentMouseUp(e) {
			globalData.scheduler.removeUiTask(this.moveTask);
			this.startBlockMouseObj = null;
			this.moveTask = null;
		},
	},
};
</script>
