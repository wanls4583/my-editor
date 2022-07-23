<!--
 * @Author: lisong
 * @Date: 2022-11-12 13:15:02
 * @Description: 
-->
<template>
	<div @mousedown="onMinimapDown" class="my-minimap" ref="wrap">
		<canvas :height="height" :width="leftWidth" class="my-minimap-canvas-left" ref="leftCanvas"></canvas>
		<canvas :height="height" :width="width" class="my-minimap-canvas-center" ref="ovarlay"></canvas>
		<canvas :height="height" :width="width" class="my-minimap-canvas-center" ref="canvas"></canvas>
		<canvas :height="height" :width="rightWidth" class="my-minimap-canvas-right" ref="rightCanvas"></canvas>
		<div :style="{top: blockTop + 'px', height: blockHeight + 'px', opacity: blockClicked ? '0.8' : ''}" @mousedown="onBlockMDown" class="my-minimap-block" ref="block"></div>
	</div>
</template>
<script>
import EventBus from '@/event';
import globalData from '@/data/globalData';
import $ from 'jquery';
import Util from '@/common/util';
import minimapWorker from '@/work/minimap';

const path = window.require('path');

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
			relStartLine: 1,
			maxVisibleLines: 1,
			canvasHeight: 0,
			width: 0,
			leftWidth: 8,
			rightWidth: 14,
			height: 0,
			miniMapCharHight: 2,
			blockHeight: 0,
			top: 0,
			blockTop: 0,
			blockClicked: false,
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
		if (globalData.miniMapWorker) {
			this.worker = globalData.miniMapWorker;
		} else {
			this.worker = Util.createWorker(minimapWorker);
			globalData.miniMapWorker = this.worker;
		}
		this.renderedIdMap = {};
		this.workerId = Util.getUUID();
	},
	mounted() {
		let centerScreen = this.$refs.canvas.transferControlToOffscreen();
		let overlayScreen = this.$refs.ovarlay.transferControlToOffscreen();
		let leftOffscreen = this.$refs.leftCanvas.transferControlToOffscreen();
		let rightOffscreen = this.$refs.rightCanvas.transferControlToOffscreen();
		this.worker.postMessage(
			{
				id: this.workerId,
				event: 'init',
				data: {
					canvas: centerScreen,
					overlayCanvas: overlayScreen,
					leftCanvas: leftOffscreen,
					rightCanvas: rightOffscreen,
				},
			},
			[centerScreen, overlayScreen, leftOffscreen, rightOffscreen]
		);
		this.setSize();
		this.initWorkerData('theme');
		this.initEvent();
	},
	beforeDestroy() {
		this.resizeObserver.unobserve(this.$refs.wrap);
	},
	destroyed() {
		this.unbindEvent();
		this.clearRenderTask();
		globalData.scheduler.removeUiTask(this.moveTask);
		cancelAnimationFrame(this.resizeTimer);
		cancelAnimationFrame(this.renderLinesTimer);
		cancelAnimationFrame(this.renderSelectedBgTimer);
		cancelAnimationFrame(this.renderAllSearchdBgTimer);
		cancelAnimationFrame(this.renderDiffTimer);
		cancelAnimationFrame(this.renderAllDiffTimer);
		cancelAnimationFrame(this.renderCursorTimer);
		cancelAnimationFrame(this.renderAllCursorTimer);
	},
	methods: {
		initWorkerData(type) {
			let data = {};
			if (type === 'size' || !type) {
				Object.assign(data, {
					charHight: this.miniMapCharHight,
					space: this.$parent.space,
					width: this.width,
					height: this.height,
					leftWidth: this.leftWidth,
					rightWidth: this.rightWidth,
				});
			}
			if (type === 'theme' || !type) {
				Object.assign(data, {
					colors: globalData.colors,
					scopeIdMap: globalData.scopeIdMap,
				});
			}
			this.preCursorResult = null;
			this.preAllCursorResult = null;
			this.preAllSearchResult = null;
			this.renderedIdMap = {};
			this.worker.postMessage({ id: this.workerId, event: 'set-data', data: data, });
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
			this.resizeObserver = new ResizeObserver((entries) => {
				if (this.$refs.wrap && this.$refs.wrap.clientHeight) {
					this.resizeTimer && cancelAnimationFrame(this.resizeTimer);
					this.resizeTimer = requestAnimationFrame(() => {
						this.resizeTimer = null;
						this.setSize();
						this.setStartLine();
						this.render();
						this.renderAllDiff();
						this.renderAllSearchdBg();
					});
				}
			});
			this.resizeObserver.observe(this.$refs.wrap);
		},
		unbindEvent() {
			$(document).unbind('mousemove', this.initEvent.fn1);
			$(document).unbind('mouseup', this.initEvent.fn2);
			EventBus.$off('render-line', this.initEventBus.fn1);
		},
		render() {
			this.renderLines();
			this.renderDiff();
			this.renderSelectedBg();
		},
		renderLines() {
			if (this.renderLinesing) {
				this.renderLinesCount = 1;
				return;
			}
			this.renderLinesing = true;
			this.renderLinesCount = 0;
			this.renderedIdMap = {};
			let line = this.startLine;
			let count = 0;
			let limit = 100;
			let maxLine = this.$parent.maxLine;
			if (this.renderLinesTimer) {
				cancelAnimationFrame(this.renderLinesTimer);
				this.renderLinesTimer = null;
			}
			this.renderLinesTask = globalData.scheduler.addTask(() => {
				_renderLines.call(this);
			});

			function _renderLines() {
				let i = 0;
				let lines = [];
				while (line <= maxLine && count < this.maxVisibleLines && i < limit) {
					let fold = this.$parent.folder.getFoldByLine(line);
					let lineObj = this.$parent.myContext.htmls[line - 1];
					let preLineObj = this.$parent.myContext.htmls[line - 2];
					let preRuleId = (preLineObj && preLineObj.states && preLineObj.states.ruleId) || null;
					let cache = this.renderedIdMap[lineObj.lineId];
					let renderObj = null;
					if (this.compairCache(cache, lineObj.text, preRuleId)) {
						renderObj = {
							top: (this.$parent.folder.getRelativeLine(line) - this.relStartLine) * this.miniMapCharHight,
							lineId: lineObj.lineId,
						};
					} else {
						renderObj = this.getRenderObj(line);
						this.renderedIdMap[lineObj.lineId] = renderObj;
					}
					lines.push(renderObj);
					if (fold) {
						line = fold.end.line;
					} else {
						line++;
					}
					i++;
					count++;
				}
				this.worker.postMessage({ id: this.workerId, event: 'render-data', data: lines });
				if (line > maxLine || count === this.maxVisibleLines) {
					this.worker.postMessage({ id: this.workerId, event: 'render' });
					this.renderLinesing = false;
					if (this.renderLinesCount) {
						this.renderLinesTimer = requestAnimationFrame(() => {
							this.renderLines();
						});
					}
				} else {
					this.renderLinesTask = globalData.scheduler.addTask(() => {
						_renderLines.call(this);
					});
				}
			}
		},
		renderLine(lineId) {
			let cache = this.renderedIdMap[lineId];
			if (cache) {
				let lineObj = this.$parent.myContext.htmls[cache.line - 1];
				if (lineObj && lineObj.lineId === lineId) {
					let renderObj = this.getRenderObj(cache.line);
					this.renderedIdMap[lineObj.lineId] = renderObj;
					this.worker.postMessage({ id: this.workerId, event: 'render-line', data: renderObj });
				}
			}
		},
		renderSelectedBg() {
			if (this.renderSelectedBging) {
				this.renderSelectedBgCount = 1;
				return;
			}
			this.renderSelectedBging = true;
			this.renderSelectedBgCount = 0;
			let results = [];
			let fResults = [];
			let line = this.startLine;
			let count = 0;
			let limit = 100;
			let maxLine = this.$parent.maxLine;
			if (this.renderSelectedBgTimer) {
				cancelAnimationFrame(this.renderSelectedBgTimer);
				this.renderSelectedBgTimer = null;
			}
			this.renderSelectedBgTask = globalData.scheduler.addTask(() => {
				_renderSelectedBg.call(this);
			});

			function _renderSelectedBg() {
				let i = 0;
				while (line <= maxLine && count < this.maxVisibleLines && i < limit) {
					let fold = this.$parent.folder.getFoldByLine(line);
					let top = count * this.miniMapCharHight;
					if (this.$parent.fSelecter.getRangeByLine(line).length ||
						this.$parent.fSelecter.getRangeWithCursorPos({ line: line, column: 0 })) {
						fResults.push(top);
					} else if (this.$parent.selecter.getActiveRangeByLine(line).length ||
						this.$parent.selecter.getActiveRangeWithCursorPos({ line: line, column: 0 })) {
						results.push(top);
					}
					if (fold) {
						line = fold.end.line;
					} else {
						line++;
					}
					i++;
					count++;
				}
				if (line > maxLine || count === this.maxVisibleLines) {
					this.worker.postMessage({ id: this.workerId, event: 'render-selected-bg', data: { results, fResults } });
					this.renderSelectedBging = false;
					if (this.renderSelectedBgCount) {
						this.renderSelectedBgTimer = requestAnimationFrame(() => {
							this.renderSelectedBg();
						});
					}
				} else {
					this.renderSelectedBgTask = globalData.scheduler.addTask(() => {
						_renderSelectedBg.call(this);
					});
				}
			}
		},
		renderAllSearchdBg() {
			// 大于10000个结果时，不再处理
			if (this.$parent.fSelecter.ranges.size > 10000) {
				return;
			}
			if (this.renderAllSearchdBging) {
				this.renderAllSearchdBgCount = 1;
				return;
			}
			this.renderAllSearchdBging = true;
			this.renderAllSearchdBgCount = 0;
			let results = [];
			let preCursorPos = {};
			let preTop = -1;
			let limit = 10;
			let head = this.$parent.fSelecter.ranges.getHead();
			if (this.renderAllSearchdBgTimer) {
				cancelAnimationFrame(this.renderAllSearchdBgTimer);
				this.renderAllSearchdBgTimer = null;
			}
			if (head) {
				this.renderAllSearchdBgTask = globalData.scheduler.addTask(() => {
					_renderAllSearchdBg.call(this);
				});
			} else {
				this.worker.postMessage({ id: this.workerId, event: 'render-selected-all', data: [] });
				this.renderAllSearchdBging = false;
				this.preAllSearchResult = [];
			}

			function _renderAllSearchdBg() {
				let range = null;
				let i = 0;
				while ((range = head.next()) && i < limit) {
					let cursorPos = range.start;
					if (cursorPos.line !== preCursorPos.line && !this.$parent.folder.getLineInFold(cursorPos.line)) {
						let line = this.$parent.folder.getRelativeLine(cursorPos.line);
						let top = Math.round((((line - 1) * this.$parent.charObj.charHight) / this.contentHeight) * this.height);
						if (top - preTop >= 4) {
							preTop = top;
							results.push(top);
						}
					}
					preCursorPos = cursorPos;
					i++;
				}
				if (!range) {
					this.renderAllSearchdBging = false;
					if (this.preAllSearchResult + '' !== results + '') {
						this.preAllSearchResult = results;
						this.worker.postMessage({ id: this.workerId, event: 'render-selected-all', data: results });
					}
					if (this.renderAllSearchdBgCount) {
						this.renderAllSearchdBgTimer = requestAnimationFrame(() => {
							this.renderAllSearchdBg();
						});
					}
				} else {
					this.renderAllSearchdBgTask = globalData.scheduler.addTask(() => {
						_renderAllSearchdBg.call(this);
					});
				}
			}
		},
		renderDiff() {
			if (this.renderDiffing) {
				this.renderDiffCount = 1;
				return;
			}
			this.renderDiffing = true;
			this.renderDiffCount = 0;
			let diffRanges = [];
			let endLine = 0;
			let index = 0;
			let limit = 100;
			let allDiffRanges = this.$parent.diffRanges;
			if (this.renderDiffTimer) {
				cancelAnimationFrame(this.renderDiffTimer);
				this.renderDiffTimer = null;
			}
			if (allDiffRanges && allDiffRanges.length) {
				endLine = this.getEndLine();
				this.renderDiffTask = globalData.scheduler.addTask(() => {
					_renderDiff.call(this);
				});
			} else {
				this.renderDiffing = false;
				this.worker.postMessage({ id: this.workerId, event: 'render-diff', data: [] });
			}

			function _renderDiff() {
				let i = 0;
				while (index < allDiffRanges.length && i < limit) {
					let item = allDiffRanges[index];
					item = Object.assign({}, item);
					item.length = item.type === 'D' ? 1 : item.added.length;
					if (item.line < this.startLine) {
						item.length -= this.startLine - item.line;
						item.line = this.startLine;
					}
					if (item.length > 0) {
						let fold = this.$parent.folder.getLineInFold(item.line);
						if (fold) {
							if (item.type !== 'D' && item.line + item.length - 1 >= fold.end.line) {
								item.length -= fold.end.line - item.line;
								item.line = fold.end.line;
								diffRanges.push(_getDiffObj.call(this, item));
							}
						} else {
							diffRanges.push(_getDiffObj.call(this, item));
						}
					} else if (item.line > endLine) {
						index = allDiffRanges.length;
						break;
					}
					index++;
					i++;
				}
				if (index >= allDiffRanges.length) {
					this.worker.postMessage({ id: this.workerId, event: 'render-diff', data: diffRanges });
					this.renderDiffing = false;
					if (this.renderDiffCount) {
						this.renderDiffTimer = requestAnimationFrame(() => {
							this.renderDiff();
						});
					}
				} else {
					this.renderDiffTask = globalData.scheduler.addTask(() => {
						_renderDiff.call(this);
					});
				}
			}

			function _getDiffObj(item) {
				let resultObj = {};
				item.length = item.line + item.length - 1 > endLine ? endLine - item.line + 1 : item.length;
				item = this.getDiffObj(item);
				resultObj.type = item.type;
				resultObj.top = (item.line - this.relStartLine) * this.miniMapCharHight;
				resultObj.height = item.length * this.miniMapCharHight;
				resultObj.top = Math.ceil(resultObj.top);
				resultObj.height = Math.ceil(resultObj.height);
				return resultObj;
			}
		},
		renderAllDiff(renderDiff) {
			if (this.renderAllDiffing) {
				this.renderAllDiffCount = 1;
				return;
			}
			this.renderAllDiffing = true;
			this.renderAllDiffCount = 0;
			let index = 0;
			let limit = 10;
			let diffRanges = [];
			let sliderHeight = (this.height / this.contentHeight) * this.height;
			let allDiffRanges = this.$parent.diffRanges;
			if (this.renderAllDiffTimer) {
				cancelAnimationFrame(this.renderAllDiffTimer);
				this.renderAllDiffTimer = null;
			}
			if (allDiffRanges && allDiffRanges.length) {
				sliderHeight = sliderHeight > 20 ? sliderHeight : 20;
				this.renderAllDiffTask = globalData.scheduler.addTask(() => {
					_renderAllDiff.call(this);
				});
			} else {
				this.worker.postMessage({ id: this.workerId, event: 'render-diff-all', data: [] });
				this.renderAllDiffing = false;
			}

			function _renderAllDiff() {
				let i = 0;
				while (index < allDiffRanges.length && i < limit) {
					let item = allDiffRanges[i];
					let fold = this.$parent.folder.getLineInFold(item.line);
					item = Object.assign({}, item);
					item.length = item.type === 'D' ? 1 : item.added.length;
					if (fold) {
						if (item.type !== 'D' && item.line + item.length - 1 >= fold.end.line) {
							item.length -= fold.end.line - item.line;
							item.line = fold.end.line;
							diffRanges.push(_getDiffObj.call(this, item));
						}
					} else {
						diffRanges.push(_getDiffObj.call(this, item));
					}
					index++;
					i++;
				}
				if (index >= allDiffRanges.length) {
					this.worker.postMessage({ id: this.workerId, event: 'render-diff-all', data: diffRanges });
					renderDiff && this.renderDiff();
					this.renderAllDiffing = false;
					if (this.renderAllDiffCount) {
						this.renderAllDiffTimer = requestAnimationFrame(() => {
							this.renderAllDiff();
						});
					}
				} else {
					this.renderAllDiffTask = globalData.scheduler.addTask(() => {
						_renderAllDiff.call(this);
					});
				}
			}

			function _getDiffObj(item) {
				let resultObj = {};
				let scale = (this.height - sliderHeight) / (this.contentHeight - this.height);
				item = this.getDiffObj(item);
				resultObj.type = item.type;
				resultObj.top = (item.line - 1) * this.$parent.charObj.charHight * scale;
				resultObj.height = item.length * this.miniMapCharHight;
				resultObj.height = resultObj.height < 4 ? 4 : resultObj.height;
				resultObj.top = Math.ceil(resultObj.top);
				resultObj.height = Math.ceil(resultObj.height);
				return resultObj;
			}
		},
		renderCursor() {
			if (this.renderCursoring) {
				this.renderCursorCount = 1;
				return;
			}
			this.renderCursoring = true;
			this.renderCursorCount = 0;
			let count = 0;
			let limit = 100;
			let results = [];
			let preCursorPos = {};
			let line = this.startLine;
			let maxLine = this.$parent.maxLine;
			if (this.renderCursorTimer) {
				cancelAnimationFrame(this.renderCursorTimer);
				this.renderCursorTimer = null;
			}
			if (this.$parent.cursor.multiCursorPos.size) {
				this.renderCursorTask = globalData.scheduler.addTask(() => {
					_renderCursor.call(this);
				});
			} else {
				this.worker.postMessage({ id: this.workerId, event: 'render-cursor', data: [] });
				this.renderCursoring = false;
				this.preCursorResult = [];
			}

			function _renderCursor() {
				let i = 0;
				while (line <= maxLine && count < this.maxVisibleLines && i < limit) {
					let fold = this.$parent.folder.getFoldByLine(line);
					let cursorList = this.$parent.cursor.getCursorsByLine(line);
					for (let j = 0; j < cursorList.length; j++) {
						let cursorPos = cursorList[j];
						if (cursorPos.line !== preCursorPos.line) {
							let top = count * this.miniMapCharHight;
							results.push(top);
						}
						preCursorPos = cursorPos;
					}
					if (fold) {
						line = fold.end.line;
					} else {
						line++;
					}
					i++;
					count++;
				}
				if (line > maxLine || count === this.maxVisibleLines) {
					this.renderCursoring = false;
					if (this.preCursorResult + '' !== results + '') {
						this.preCursorResult = results;
						this.worker.postMessage({ id: this.workerId, event: 'render-cursor', data: results });
					}
					if (this.renderCursorCount) {
						this.renderCursorTimer = requestAnimationFrame(() => {
							this.renderCursor();
						});
					}
				} else {
					this.renderCursorTask = globalData.scheduler.addTask(() => {
						_renderCursor.call(this);
					});
				}
			}
		},
		renderAllCursor() {
			if (this.renderAllCursoring) {
				this.renderAllCursorCount = 1;
				return;
			}
			this.renderAllCursoring = true;
			this.renderAllCursorCount = 0;
			let count = 0;
			let limit = 10;
			let results = [];
			let preTop = -1;
			let preCursorPos = {};
			let line = this.startLine;
			let maxLine = this.$parent.maxLine;
			let head = this.$parent.cursor.multiCursorPos.getHead();
			if (this.renderAllCursorTimer) {
				cancelAnimationFrame(this.renderAllCursorTimer);
				this.renderAllCursorTimer = null;
			}
			if (head) {
				this.renderAllCursorTask = globalData.scheduler.addTask(() => {
					_renderAllCursor.call(this);
				});
			} else {
				this.worker.postMessage({ id: this.workerId, event: 'render-cursor-all', data: [] });
				this.renderAllCursoring = false;
				this.preAllCursorResult = [];
			}

			function _renderAllCursor() {
				let i = 0;
				let cursorPos = null;
				while ((cursorPos = head.next()) && i < limit) {
					if (cursorPos.line !== preCursorPos.line && !this.$parent.folder.getLineInFold(cursorPos.line)) {
						let line = this.$parent.folder.getRelativeLine(cursorPos.line);
						let top = Math.round((((line - 1) * this.$parent.charObj.charHight) / this.contentHeight) * this.height);
						if (preTop !== top) {
							preTop = top;
							results.push(top);
						}
					}
					preCursorPos = cursorPos;
				}
				if (!cursorPos) {
					this.renderAllCursoring = false;
					if (this.preAllCursorResult + '' !== results + '') {
						this.preAllCursorResult = results;
						this.worker.postMessage({ id: this.workerId, event: 'render-cursor-all', data: results });
					}
					if (this.renderAllCursorCount) {
						this.renderAllCursorTimer = requestAnimationFrame(() => {
							this.renderAllCursor();
						});
					}
				} else {
					this.renderAllCursorTask = globalData.scheduler.addTask(() => {
						_renderAllCursor.call(this);
					});
				}
			}
		},
		clearRenderTask() {
			globalData.scheduler.removeTask(this.renderLinesTask);
			globalData.scheduler.removeTask(this.renderSelectedBgTask);
			globalData.scheduler.removeTask(this.renderAllSearchdBgTask);
			globalData.scheduler.removeTask(this.renderDiffTask);
			globalData.scheduler.removeTask(this.renderAllDiffTask);
			globalData.scheduler.removeTask(this.renderCursorTask);
			globalData.scheduler.removeTask(this.renderAllCursorTask);
		},
		compairCache(cache, text, preRuleId) {
			if (cache && cache.text === text && cache.preRuleId === preRuleId) {
				return true;
			}
		},
		getEndLine() {
			let endLine = 0;
			for (let line = this.startLine, i = 0; line <= this.$parent.myContext.htmls.length && i < this.maxVisibleLines; i++) {
				let fold = this.$parent.folder.getFoldByLine(line);
				endLine = line;
				if (fold) {
					line = fold.end.line;
				} else {
					line++;
				}
			}
			return endLine;
		},
		getRenderObj(line) {
			let top = (this.$parent.folder.getRelativeLine(line) - this.relStartLine) * this.miniMapCharHight;
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
				line,
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
		getDiffObj(item) {
			let relLine = this.$parent.folder.getRelativeLine(item.line);
			let length = item.length;
			if (length > 1) {
				let count = 0;
				let endLine = item.line + length - 1;
				let line = item.line;
				let delLength = 0;
				let folds = this.$parent.folder.folds.toArray();
				// 减去折叠中的行
				for (let i = 0; i < folds.length; i++) {
					let fold = folds[i];
					if (fold.end.line <= item.line) {
						continue;
					} else if (fold.start.line >= endLine) {
						break;
					} else {
						delLength += fold.end.line - fold.start.line;
						if (fold.start.line < item.line) {
							delLength -= item.line - fold.start.line;
						}
						if (fold.end.line > endLine) {
							delLength -= fold.end.line - endLine;
						}
					}
				}
				length -= delLength;
			}
			return {
				line: relLine,
				type: item.type,
				length: length,
			};
		},
		setTop() {
			let top = (this.$parent.folder.getRelativeLine(this.nowLine) - this.relStartLine) *
				this.$parent.charObj.charHight - this.top;
			this.blockTop = top * this.miniMapCharHight / this.$parent.charObj.charHight;
		},
		setSize() {
			let scale = this.miniMapCharHight / this.$parent.charObj.charHight;
			this.width = this.$refs.wrap.clientWidth - 22;
			this.height = this.$refs.wrap.clientHeight;
			this.width = this.width < 0 ? 0 : this.width;
			this.height = this.height < 0 ? 0 : this.height;
			this.blockHeight = this.height * scale;
			this.canvasHeight = this.height / scale;
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
			this.relStartLine = this.startLine;
			this.startLine = this.$parent.folder.getRealLine(this.startLine);
			this.top = scrollTop % this.$parent.charObj.charHight;
			this.setTop();
		},
		onMinimapDown(e) {
			if (e.target === this.$refs.block) {
				return;
			}
			let maxScrollTop = this.contentHeight - this.height;
			let scrollTop = Math.floor(e.offsetY / this.miniMapCharHight);
			scrollTop = (this.startLine + scrollTop - 1) * this.$parent.charObj.charHight - this.height / 2;
			scrollTop = scrollTop > maxScrollTop ? maxScrollTop : scrollTop;
			scrollTop = scrollTop < 0 ? 0 : scrollTop;
			this.$parent.setStartLine(scrollTop);
		},
		onBlockMDown(e) {
			this.startBlockMouseObj = e;
			this.bTop = this.blockTop;
			this.blockClicked = true;
		},
		onDocumentMmove(e) {
			if (this.startBlockMouseObj) {
				let scale = this.miniMapCharHight / this.$parent.charObj.charHight;
				let maxScrollTop1 = this.contentHeight - this.height;
				let maxScrollTop2 = this.height - this.blockHeight;
				let delta = e.clientY - this.startBlockMouseObj.clientY;
				let top = this.bTop;
				if (maxScrollTop2 > this.contentHeight * scale - this.blockHeight) {
					maxScrollTop2 = this.contentHeight * scale - this.blockHeight;
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
			this.blockClicked = false;
		},
	},
};
</script>
