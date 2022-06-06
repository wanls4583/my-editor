<template>
	<div @contextmenu.prevent.stop="onContextmenu" @selectstart.prevent @wheel.stop="onWheel" class="my-editor-wrap" ref="editor">
		<!-- 行号 -->
		<div class="my-num-wrap">
			<!-- 占位行号，避免行号宽度滚动时变化 -->
			<div class="my-num" style="position: relative; visibility: hidden;">{{ diffObj.maxLine || maxLine }}</div>
			<div class="my-num-scroller" ref="numScroller">
				<div class="my-num-overlay" ref="numLay">
					<div :style="{ height: _contentHeight }" class="my-num-content">
						<div :class="{ 'my-active': nowCursorPos.line === line.num }" :key="line.num" :style="{ top: line.top }" class="my-num" v-for="line in renderObjs">
							<span class="num">{{ _num(line.num) }}</span>
							<span :class="['iconfont', line.fold == 'open' ? 'my-fold-open icon-down1' : 'my-fold-close icon-right']" @click="onToggleFold(line.num)" class="my-fold my-center-center" v-if="line.fold"></span>
							<template v-if="type !== 'diff'">
								<span :class="['my-diff-'+_diffType(line.num)]" @click="onShowDiff(line.num)" class="my-diff-num" v-if="_diffType(line.num)"></span>
							</template>
						</div>
					</div>
				</div>
			</div>
		</div>
		<div class="my-content-wrap">
			<!-- 可滚动区域 -->
			<div class="my-scroller" ref="scroller">
				<!-- 内如区域 -->
				<div :style="{left: -scrollLeft + 'px'}" class="my-content-overlay" ref="contentLay">
					<div
						:style="{ width: _contentMinWidth + 'px', height: _contentHeight }"
						@mousedown="onContentMdown"
						@mouseleave="onContentMLeave"
						@mousemove="onContentMmove"
						@selectend.prevent="onSelectend"
						class="my-content"
						ref="content"
					>
						<div class="my-lines-view" ref="lineView"></div>
						<div class="my-cursor-view" ref="cursorView">
							<template v-for="line in renderObjs">
								<div :key="line.num" v-if="line.cursorList.length">
									<div :style="{ height: _lineHeight, left: left, top: line.top, visibility: _cursorVisible }" class="my-cursor" style="top: 0px" v-for="left in line.cursorList"></div>
								</div>
							</template>
						</div>
						<div class="my-bg-view">
							<div :class="[_activeLine(line.num) ? 'my-active' : '']" :key="line.num" :style="{height: _lineHeight, top: line.top}" class="my-line-bg" v-for="line in renderObjs">
								<div :style="{ left: bracketMatch.start.left + 'px', width: bracketMatch.start.width + 'px' }" class="my-bracket-match" v-if="bracketMatch && line.num == bracketMatch.start.line"></div>
								<div :style="{ left: bracketMatch.end.left + 'px', width: bracketMatch.end.width + 'px' }" class="my-bracket-match" v-if="bracketMatch && line.num == bracketMatch.end.line"></div>
								<div
									:class="{ 'my-active': range.active, 'my-search-bg': range.isFsearch }"
									:style="{ left: range.left + 'px', width: range.width + 'px' }"
									class="my-line-bg my-select-bg"
									v-for="range in line.selection"
								></div>
							</div>
						</div>
						<!-- 输入框 -->
						<textarea
							:style="{ top: _textAreaPos.top, left: _textAreaPos.left, height: _lineHeight  }"
							@blur="onBlur"
							@compositionend="onCompositionend"
							@compositionstart="onCompositionstart"
							@copy.prevent="onCopy"
							@cut.prevent="onCut"
							@focus="onFocus"
							@input="onInput"
							@keydown="onKeydown"
							@paste.prevent="onPaste"
							class="my-textarea"
							ref="textarea"
						></textarea>
						<auto-tip :styles="autoTipStyle" :tipList="autoTipList" @change="onClickAuto" ref="autoTip" v-show="autoTipList && autoTipList.length"></auto-tip>
					</div>
				</div>
				<div @scroll="onHBarScroll" class="my-editor-scrollbar-h" ref="hScrollBar">
					<div :style="{width: _contentMinWidth + 'px'}"></div>
				</div>
				<div class="my-scroller-shadow-left" v-if="_leftShadow"></div>
				<div class="my-scroller-shadow-right" v-if="_rightShadow"></div>
			</div>
			<!-- 搜索框 -->
			<search-dialog
				:count="searchCount"
				:now="searchNow"
				@close="onCloseSearch"
				@next="onSearchNext()"
				@prev="onSearchPrev()"
				@replace="replace"
				@replaceAll="replaceAll"
				@search="onSearch"
				ref="searchDialog"
				v-show="searchVisible"
			></search-dialog>
		</div>
		<div class="my-minimap-wrap" v-if="type !== 'diff'">
			<minimap :content-height="contentHeight" :now-line="startLine" :scroll-top="scrollTop" ref="minimap"></minimap>
		</div>
		<div @scroll="onVBarScroll" class="my-editor-scrollbar-v" ref="vScrollBar">
			<div :style="{height: _contentHeight}"></div>
		</div>
		<!-- 右键菜单 -->
		<Menu :checkable="false" :menuList="menuList" :styles="menuStyle" @change="onClickMenu" ref="menu" v-show="menuVisible"></Menu>
		<tip :content="tipContent" :styles="tipStyle" ref="tip" v-show="tipContent"></tip>
		<div :style="{top: diffTop + 'px', height: diffHeight+'px'}" class="my-diff-editor" ref="diff" v-if="diffVisible">
			<div class="my-diff-bar">
				<span style="margin-right: 20px">{{name}}</span>
				<div @click="onCloseDiff" class="bar-item my-hover-danger">
					<span class="iconfont icon-close" style="font-size: 18px"></span>
				</div>
			</div>
			<editor :active="true" :diff-obj="toShowdiffObj" :id="'diff-'+id" style="flex:1" type="diff"></editor>
			<div @mousedown="onDiffBottomSashBegin" class="my-sash-h"></div>
		</div>
	</div>
</template>

<script>
import Tokenizer from '@/module/tokenizer/index';
import Lint from '@/module/lint/index';
import Autocomplete from '@/module/autocomplete/index';
import Fold from '@/module/fold/index';
import Search from '@/module/search/index';
import Select from '@/module/select/index';
import Cursor from '@/module/cursor/index';
import History from '@/module/history/index';
import Context from '@/module/context/index';
import ShortCut from '@/module/shortcut/editor';
import SearchDialog from './Search';
import Menu from './Menu';
import AutoTip from './AutoTip';
import Tip from './Tip';
import Minimap from './Minimap.vue';
import Util from '@/common/util';
import EventBus from '@/event';
import $ from 'jquery';
import globalData from '@/data/globalData';

const contexts = Context.contexts;

export default {
	name: 'Editor',
	components: {
		SearchDialog,
		Menu,
		AutoTip,
		Tip,
		Minimap,
	},
	props: {
		id: String,
		path: String,
		name: String,
		type: String,
		active: {
			type: Boolean,
			default: false,
		},
		diffObj: {
			type: Object,
			default: () => {
				return {
					diff: null,
					deletedLength: 0,
					beforeLine: 0,
					maxLine: 0,
					states: null,
				};
			},
		},
	},
	data() {
		return {
			cursorVisible: true,
			cursorFocus: true,
			language: '',
			theme: '',
			tabSize: 4,
			renderObjs: [],
			startLine: 1,
			top: 0,
			cursorLeft: 0,
			scrollLeft: 0,
			scrollTop: 0,
			maxVisibleLines: 1,
			maxLine: 1,
			contentHeight: 0,
			scrollerArea: {},
			errorMap: {},
			errors: [],
			autoTipList: [],
			diffTree: null,
			tipContent: null,
			menuVisible: false,
			searchVisible: false,
			selectedFg: false,
			activeLineBg: true,
			searchNow: 1,
			searchCount: 0,
			diffVisible: false,
			diffHeight: 200,
			diffTop: 0,
			diffMarginTop: 0,
			toShowdiffObj: null,
			charObj: {
				charWidth: 7.15,
				fullAngleCharWidth: 15,
				charHight: 19,
			},
			nowCursorPos: {
				line: 1,
				column: 0,
			},
			bracketMatch: {
				start: {},
				end: {},
			},
			maxWidthObj: {
				lineId: null,
				text: '',
				width: 0,
			},
			tipStyle: {
				top: '0px',
				left: '0px',
			},
			autoTipStyle: {
				top: '50%',
				left: '50%',
			},
			menuStyle: {
				top: '0px',
				left: '0px',
				'min-width': '200px',
			},
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
		};
	},
	computed: {
		_num() {
			return (line) => {
				if (this.type === 'diff') {
					return line - this.diffObj.deletedLength > 0 ? line - this.diffObj.deletedLength + this.diffObj.beforeLine : '';
				}
				return line;
			};
		},
		_diffBg() {
			return (line) => {
				if (this.type === 'diff') {
					if (line > this.diffObj.deletedLength) {
						return 'my-diff-inserted';
					} else {
						return 'my-diff-removed';
					}
				}
				return '';
			};
		},
		_diffType() {
			return (line) => {
				let type = '';
				let preDiff = null;
				if (this.type === 'diff') {
					return;
				}
				if (!(preDiff = Util.getPrevDiff(this.diffTree, line))) {
					return;
				}
				if (preDiff.deleted.length) {
					if (preDiff.added.length) {
						if (line < preDiff.line + preDiff.added.length) {
							if (preDiff.deleted.length) {
								type = 'modify';
							} else {
								type = 'add';
							}
						}
					} else if (preDiff.line === line) {
						type = 'delete';
					}
				} else if (line < preDiff.line + preDiff.added.length) {
					type = 'add';
				}
				return type;
			};
		},
		_leftShadow() {
			return this.scrollLeft > 0;
		},
		_rightShadow() {
			return this.scrollLeft + this.scrollerArea.width < this._contentMinWidth;
		},
		_lineHeight() {
			return this.charObj.charHight + 'px';
		},
		_cursorVisible() {
			return this.cursorVisible && this.cursorFocus ? 'visible' : 'hidden';
		},
		_contentMinWidth() {
			let width = 0;
			if (this.$refs.content) {
				width = Util.getStrExactWidth(this.maxWidthObj.text, this.tabSize, this.$refs.content);
				width += this.charObj.fullAngleCharWidth;
			}
			width = this.scrollerArea.width > width ? this.scrollerArea.width : width;
			return width;
		},
		_contentHeight() {
			return this.contentHeight + 'px';
		},
		_textAreaPos() {
			let left = this.cursorLeft;
			let top = 0;
			if (this.nowCursorPos) {
				let line = this.nowCursorPos.line < this.startLine ? this.startLine : this.nowCursorPos.line;
				top = this.folder.getRelativeLine(line) * this.charObj.charHight;
				if (top > this.scrollTop + this.scrollerArea.height - 2 * this.charObj.charHight) {
					top = this.scrollTop + this.scrollerArea.height - 2 * this.charObj.charHight;
				}
			}
			return {
				top: top + 'px',
				left: left + 'px',
			};
		},
		_tabLineLeft() {
			return (tab) => {
				return (tab - 1) * this.tabSize * this.charObj.charWidth + 'px';
			};
		},
		_activeLine() {
			return (num) => {
				return this.nowCursorPos.line == num && this.activeLineBg;
			};
		},
		space() {
			return Util.space(this.tabSize);
		},
		myContext() {
			return contexts[this.id];
		},
		editAble() {
			return this.type !== 'diff';
		},
	},
	watch: {
		language: function (newVal) {
			this.myContext.htmls.forEach((lineObj) => {
				lineObj.tokens = null;
				lineObj.folds = null;
				lineObj.stateFold = null;
				lineObj.states = null;
				lineObj.html = '';
			});
			this.lint.initLanguage(newVal);
			this.tokenizer.initLanguage(newVal);
		},
		theme: function () {
			this.myContext.htmls.forEach((lineObj) => {
				lineObj.html = '';
				lineObj.tokens &&
					lineObj.tokens.forEach((token) => {
						token.scopeId = '';
					});
			});
			this.render();
		},
		tabSize: function (newVal) {
			this.render();
			this.maxWidthObj = { lineId: null, text: '', width: 0 };
			this.myContext.setLineWidth(this.myContext.htmls);
		},
		maxLine: function (newVal) {
			this.setContentHeight();
		},
		nowCursorPos: {
			handler: function (newVal) {
				EventBus.$emit('cursor-change', {
					line: newVal ? newVal.line : '?',
					column: newVal ? newVal.column : '?',
				});
				this.renderBracketMatch();
			},
			deep: true,
		},
		active: function (newVal) {
			if (newVal) {
				this.showEditor();
			} else {
				this.autocomplete.stop();
			}
		},
	},
	created() {
		this.initData();
		this.initEventBus();
		this.initEvent();
		// test();
		function test() {
			console.time('test');
			requestAnimationFrame(() => {
				console.timeEnd('test');
				test();
			});
		}
	},
	mounted() {
		this.selectedFg = !!globalData.colors['editor.selectionForeground'];
		this.showEditor();
		this.initResizeEvent();
		if (this.type === 'diff') {
			this.showDiff();
		}
	},
	destroyed() {
		this.unbindEvent();
		this.myContext.destory();
	},
	methods: {
		// 初始化数据
		initData() {
			this.editorId = this.id;
			contexts[this.editorId] = new Context(this);
			this.maxWidthObj.lineId = this.myContext.htmls[0].lineId;
			this.tokenizer = new Tokenizer(this, this.myContext);
			this.lint = new Lint(this, this.myContext);
			this.autocomplete = new Autocomplete(this, this.myContext);
			this.folder = new Fold(this, this.myContext);
			this.history = new History(this, this.myContext);
			this.selecter = new Select(this, this.myContext);
			this.searcher = new Search(this, this.myContext, this.selecter);
			this.fSelecter = new Select(this, this.myContext);
			this.fSearcher = new Search(this, this.myContext, this.fSelecter);
			this.shortcut = new ShortCut(this, this.myContext);
			this.cursor = new Cursor(this, this.myContext);
			this.cursor.addCursorPos(this.nowCursorPos);
			this.wordPattern = Util.getWordPattern(this.language);
			this.wordPattern = new RegExp(`^(${this.wordPattern.source})`);
			this.renderCache = {};
			this.renderPool = [];
			this.tabCache = {};
			this.deltaYStack = [];
		},
		initRenderData() {
			this.charObj = Util.getCharWidth(this.$refs.content, '<div class="my-line"><div class="my-code">[dom]</div></div>');
			this.maxVisibleLines = Math.ceil(this.$refs.scroller.clientHeight / this.charObj.charHight) + 1;
		},
		// 初始化文档事件
		initEvent() {
			this.initEvent.fn1 = (e) => {
				this.active && this.onDocumentMmove(e);
			};
			this.initEvent.fn2 = (e) => {
				this.active && this.onDocumentMouseUp(e);
			};
			$(document).on('mousemove', this.initEvent.fn1);
			$(document).on('mouseup', this.initEvent.fn2);
		},
		initResizeEvent() {
			const resizeObserver = new ResizeObserver((entries) => {
				if (this.active) {
					this.$nextTick(() => {
						if (this.$refs.scroller) {
							this.showEditor();
						}
					});
				}
			});
			resizeObserver.observe(this.$refs.editor);
		},
		initEventBus() {
			EventBus.$on(
				'language-change',
				(this.initEventBus.fn1 = (language) => {
					if (this.active) {
						this.language = language;
					}
					this._language = language;
				})
			);
			EventBus.$on(
				'tab-size-change',
				(this.initEventBus.fn2 = (tabSize) => {
					if (this.active) {
						this.tabSize = tabSize;
					}
				})
			);
			EventBus.$on(
				'close-menu',
				(this.initEventBus.fn3 = () => {
					this.menuVisible = false;
					this.autoTipList = null;
					this.autocomplete.stop();
				})
			);
			EventBus.$on(
				'theme-changed',
				(this.initEventBus.fn4 = (theme) => {
					this.selectedFg = !!globalData.colors['editor.selectionForeground'];
					if (this.active) {
						this.theme = theme;
					}
					this._theme = theme;
				})
			);
			EventBus.$on(
				'git-diffed',
				(this.initEventBus.fn5 = (filePath) => {
					if (filePath === this.path) {
						const fs = window.require('fs');
						const stat = fs.statSync(filePath);
						const fileKey = stat.dev + '-' + stat.ino + '-' + stat.mtimeMs;
						if (globalData.fileDiff[fileKey]) {
							this.diffTree = globalData.fileDiff[fileKey];
						}
					}
				})
			);
			EventBus.$on(
				'render-line',
				(this.initEventBus.fn6 = (data) => {
					if (this.editorId === data.editorId) {
						this.renderLines(data.lineId);
					}
				})
			);
		},
		unbindEvent() {
			$(document).unbind('mousemove', this.initEvent.fn1);
			$(document).unbind('mouseup', this.initEvent.fn2);
			EventBus.$off('language-change', this.initEventBus.fn1);
			EventBus.$off('tab-size-change', this.initEventBus.fn2);
			EventBus.$off('close-menu', this.initEventBus.fn3);
			EventBus.$off('theme-changed', this.initEventBus.fn4);
			EventBus.$off('git-diffed', this.initEventBus.fn5);
			EventBus.$off('render-line', this.initEventBus.fn5);
		},
		showEditor() {
			// 元素暂时不可见
			if (!this.$refs.scroller.clientHeight) {
				return;
			}
			this.language = this._language || '';
			this.theme = this._theme || '';
			this.initRenderData();
			this.setScrollerArea();
			this.setContentHeight();
			this.focus();
			this.$nextTick(() => {
				this.$refs.scroller.scrollTop = 0;
				this.$refs.scroller.scrollLeft = 0;
				this.setStartLine(this.$refs.vScrollBar.scrollTop, true);
			});
			if (this.type !== 'diff') {
				// 获取文件git修改记录
				EventBus.$emit('git-diff', this.path);
			}
		},
		showDiff() {
			let line = 1;
			let column = 0;
			this.language = this.diffObj.language;
			this._language = this.diffObj.language;
			this.myContext.insertContent(this.diffObj.diff.deleted.concat(this.diffObj.diff.added).join('\n'));
			if (this.diffObj.diff.added.length) {
				let delta = this.diffObj.line - this.diffObj.diff.line;
				line = this.diffObj.deletedLength + delta + 1;
				column = this.diffObj.diff.added[delta].length;
			} else {
				line = this.diffObj.deletedLength;
				column = this.diffObj.diff.deleted.peek().length;
			}
			this.$nextTick(() => {
				let scrollTop = (line - 1) * this.charObj.charHight;
				scrollTop = scrollTop > 0 ? scrollTop : 0;
				if (scrollTop > this.contentHeight - this.scrollerArea.height) {
					let top = scrollTop - (this.contentHeight - this.scrollerArea.height);
					scrollTop = this.contentHeight - this.scrollerArea.height;
					this.$parent.diffMarginTop = -top;
					this.$parent.setDiffTop();
				}
				this.setStartLine(scrollTop);
				this.cursor.setCursorPos({ line: line, column: column });
			});
		},
		// 显示光标
		showCursor() {
			this.cursorFocus = true;
			if (!this.cursor.multiCursorPos.size) {
				this.hasShowCursor = false;
				return;
			}
			if (this.hasShowCursor) {
				return;
			}
			this.hasShowCursor = true;
			this.cursorVisible = true;
			let _timer = () => {
				clearTimeout(this.curserTimer);
				this.curserTimer = setTimeout(() => {
					this.cursorVisible = !this.cursorVisible;
					_timer();
				}, 500);
			};
			_timer();
		},
		// 隐藏光标
		hideCursor() {
			clearTimeout(this.curserTimer);
			this.hasShowCursor = false;
			this.cursorFocus = false;
		},
		// 聚焦
		focus() {
			this.$refs.textarea.focus();
			requestAnimationFrame(() => {
				this.$refs.textarea.focus();
			});
		},
		// 渲染
		render(forceCursorView) {
			if (this.rendering) {
				return;
			}
			this.rendering = true;
			this.$nextTick(() => {
				this.setTop();
				this.renderLines();
				this.renderSelectedBg();
				this.renderSelectionToken();
				this.renderError();
				this.renderCursor(forceCursorView);
				this.$refs.minimap && this.$refs.minimap.render();
				this.rendering = false;
			});
		},
		// 渲染代码
		renderLines(lineId) {
			let that = this;
			// 只更新一行
			if (lineId) {
				if (this.renderCache[lineId]) {
					let item = this.myContext.lineIdMap.get(lineId);
					let obj = this.renderCache[lineId];
					// 高亮完成渲染某一行时，render可能还没完成，导致num没更新，此时跳过
					if (this.myContext.htmls[obj.num - 1] && this.myContext.htmls[obj.num - 1].lineId === lineId) {
						obj = _getObj.call(this, item, obj.num);
						this.renderLine(obj);
						this.renderCursor();
						this.renderSelectedBg();
						this.renderSelectionToken(obj.line);
						this.renderError(obj.line);
					}
				}
				return;
			}
			let renderCache = {};
			this.renderObjs = [];
			this.myContext.renderedLineMap.clear();
			this.myContext.renderedIdMap.clear();
			for (let i = 0, startLine = this.startLine; i < this.maxVisibleLines && startLine <= this.myContext.htmls.length; i++) {
				let lineObj = this.myContext.htmls[startLine - 1];
				let lineId = lineObj.lineId;
				let obj = _getObj.call(this, lineObj, startLine);
				let fold = this.folder.getFoldByLine(startLine);
				this.renderObjs.push(obj);
				this.myContext.renderedLineMap.set(obj.num, obj);
				this.myContext.renderedIdMap.set(lineObj.lineId, obj);
				if (fold) {
					startLine = fold.end.line;
				} else {
					startLine++;
				}
			}
			for (let lineId in this.renderCache) {
				if (!this.myContext.renderedIdMap.has(lineId - 0)) {
					this.renderCache[lineId].$line.hide();
					this.renderPool.push(this.renderCache[lineId]);
				}
			}
			this.renderObjs.forEach((obj) => {
				renderCache[obj.lineId] = this.renderLine(obj);
			});
			this.renderCache = renderCache;

			function _getObj(item, line) {
				let tabNum = this.getTabNum(line);
				let fold = '';
				let top = (this.folder.getRelativeLine(line) - 1) * this.charObj.charHight + 'px';
				if (this.folder.getFoldByLine(line)) {
					//该行已经折叠
					fold = 'close';
				} else if (this.folder.getRangeFold(line, true)) {
					//可折叠
					fold = 'open';
				}
				let html = item.html;
				if (!html) {
					if (item.tokens && item.tokens.length) {
						item.tokens = this.tokenizer.splitLongToken(item.tokens);
						item.html = this.tokenizer.createHtml(item.tokens, item.text);
						html = item.html;
					} else {
						html = Util.htmlTrans(item.text);
					}
				}
				html = html.replace(/\t/g, this.space);
				return {
					html: html,
					num: line,
					lineId: item.lineId,
					top: top,
					tabNum: tabNum,
					selection: [],
					isFsearch: false,
					fold: fold,
					cursorList: [],
				};
			}
		},
		renderLine(renderObj) {
			let cacheData = this.renderCache[renderObj.lineId];
			let $line = null;
			let $code = null;
			let $tabLine = null;
			let lineAttr = {};
			let lineStyle = {};
			let codeAttr = {};
			let codeStyle = {};

			lineAttr['class'] = ['my-line', this._diffBg(renderObj.num)].join(' ');
			lineAttr['data-line'] = renderObj.num;
			lineAttr['id'] = `line-${this.id}-${renderObj.num}`;
			lineStyle['top'] = renderObj.top;

			codeAttr['class'] = ['my-code', renderObj.fold == 'close' ? 'fold-close' : ''].join(' ');
			codeAttr['data-line'] = renderObj.num;
			codeStyle['height'] = this._lineHeight;

			if (!cacheData) {
				cacheData = this.renderPool.pop();
				cacheData && cacheData.$line.show();
			}

			if (cacheData) {
				$line = cacheData.$line;
				$code = cacheData.$code;
				$tabLine = cacheData.$tabLine;
				for (let key in lineAttr) {
					if (lineAttr[key] !== cacheData.lineAttr[key]) {
						$line.attr(key, lineAttr[key]);
					}
				}
				for (let key in lineStyle) {
					if (lineStyle[key] !== cacheData.lineStyle[key]) {
						$line[0].style[key] = lineStyle[key];
					}
				}
				for (let key in codeAttr) {
					if (codeAttr[key] !== cacheData.codeAttr[key]) {
						$code.attr(key, codeAttr[key]);
					}
				}
				for (let key in codeStyle) {
					if (codeStyle[key] !== cacheData.codeStyle[key]) {
						$code[0].style[key] = codeStyle[key];
					}
				}
				if (cacheData.html !== renderObj.html) {
					$code.html(renderObj.html);
				}
				if (cacheData.tabNum !== renderObj.tabNum) {
					$tabLine.html(_tabLine.call(this, renderObj.tabNum));
				}
				cacheData.lineAttr = lineAttr;
				cacheData.lineStyle = lineStyle;
				cacheData.codeAttr = codeAttr;
				cacheData.codeStyle = codeStyle;
				cacheData.html = renderObj.html;
				cacheData.num = renderObj.num;
				cacheData.tabNum = renderObj.tabNum;
				return cacheData;
			}

			$line = $(`<div ${_attr(lineAttr)} style="${_style(lineStyle)}"></div>`);
			$code = $(`<div ${_attr(codeAttr)} style="${_style(codeStyle)}">${renderObj.html || '&nbsp;'}</div>`);
			$tabLine = $(`<div>${_tabLine.call(this, renderObj.tabNum)}</div>`);
			$line.append($code);
			$line.append($tabLine);
			$(this.$refs.lineView).append($line);

			cacheData = {
				lineAttr: lineAttr,
				lineStyle: lineStyle,
				codeAttr: codeAttr,
				codeStyle: codeStyle,
				html: renderObj.html,
				num: renderObj.num,
				tabNum: renderObj.tabNum,
				$line: $line,
				$code: $code,
				$tabLine: $tabLine,
			};

			return cacheData;

			function _style(obj) {
				let style = '';
				for (let key in obj) {
					style += `${key}: ${obj[key]}; `;
				}
				return style;
			}

			function _attr(obj) {
				let style = '';
				for (let key in obj) {
					style += `${key}="${obj[key]}" `;
				}
				return style;
			}

			function _tabLine(tabNum) {
				if (!this.tabCache[tabNum]) {
					let html = '';
					for (let tab = 1; tab <= tabNum; tab++) {
						html += `<span style="${_style({ left: this._tabLineLeft(tab) })}" class="my-tab-line"></span>`;
					}
					this.tabCache[tabNum] = html;
				}
				return this.tabCache[tabNum];
			}
		},
		renderSelectedBg() {
			this.activeLineBg = true;
			this.clearSelectionToken();
			this.renderObjs.forEach((item) => {
				item.selection = [];
			});
			this.fSelecter.ranges.forEach((range) => {
				this._renderSelectedBg(range, true);
			});
			this.selecter.ranges.forEach((range) => {
				let _range = this.fSelecter.getRangeByCursorPos(range.start);
				if (this.searchVisible) {
					// 优先渲染搜索框的选中范围
					if (!_range && range.active) {
						this._renderSelectedBg(range);
					}
				} else {
					this._renderSelectedBg(range);
				}
			});
		},
		// 渲染选中背景
		_renderSelectedBg(range, isFsearch) {
			let firstLine = this.renderObjs[0].num;
			let lastLine = this.renderObjs.peek().num;
			let start = range.start;
			let end = range.end;
			let text = this.myContext.htmls[start.line - 1].text;
			let endColumn = text.length;
			start.left = this.getStrWidth(text, 0, start.column);
			if (start.line == end.line) {
				start.width = this.getStrWidth(text, start.column, end.column) || 10;
			} else {
				start.width = this.getStrWidth(text, start.column) || 10;
				end.left = 0;
				text = this.myContext.htmls[end.line - 1].text;
				end.width = this.getStrWidth(text, 0, end.column) || 10;
			}
			firstLine = firstLine > start.line + 1 ? firstLine : start.line + 1;
			lastLine = lastLine < end.line - 1 ? lastLine : end.line - 1;
			for (let line = firstLine; line <= lastLine; line++) {
				if (this.myContext.renderedLineMap.has(line)) {
					let renderObj = this.myContext.renderedLineMap.get(line);
					let lineObj = this.myContext.lineIdMap.get(renderObj.lineId);
					renderObj.selection.push({
						left: 0,
						width: lineObj.width || 10,
						active: range.active,
						isFsearch: isFsearch,
					});
				}
			}
			if (this.myContext.renderedLineMap.has(start.line)) {
				this.myContext.renderedLineMap.get(start.line).selection.push({
					left: start.left,
					width: start.width,
					active: range.active,
					isFsearch: isFsearch,
				});
				if (end.line == start.line) {
					endColumn = end.column;
				}
				range.active && this._renderSelectionToken(start.line, start.column, endColumn);
			}
			if (end.line > start.line && this.myContext.renderedLineMap.has(end.line)) {
				this.myContext.renderedLineMap.get(end.line).selection.push({
					left: end.left,
					width: end.width,
					active: range.active,
					isFsearch: isFsearch,
				});
				range.active && this._renderSelectionToken(end.line, 0, end.column);
			}
			if (start.line === this.nowCursorPos.line || end.line === this.nowCursorPos.line) {
				this.activeLineBg = false;
			}
		},
		renderSelectionToken(line) {
			// 只有设置了选中前景色才处理
			if (!globalData.colors['editor.selectionForeground']) {
				return;
			}
			let results = this.selecter.getRangeByLine(line);
			results.forEach((range) => {
				if (range.active) {
					let startColumn = range.start.column;
					let endColumn = range.end.column;
					if (range.start.line === line) {
						if (range.end.line > range.start.line) {
							endColumn = this.myContext.htmls[range.start.line - 1].text.length;
						}
					} else {
						startColumn = 0;
					}
					this._renderSelectionToken(line, startColumn, endColumn);
				}
			});
		},
		_renderSelectionToken(line, startColumn, endColumn) {
			// 只有设置了选中前景色才处理
			if (!globalData.colors['editor.selectionForeground']) {
				return;
			}
			let lineObj = this.myContext.htmls[line - 1];
			let tokens = lineObj.tokens;
			let scopes = ['selected'];
			let _tokens = [];
			this.myContext.fgLines.push(line);
			for (let i = 0; i < tokens.length; i++) {
				let token = tokens[i];
				if (token.startIndex <= startColumn && token.endIndex > startColumn) {
					if (token.startIndex < startColumn) {
						_tokens.push({
							startIndex: token.startIndex,
							endIndex: startColumn,
							scopes: token.scopes,
						});
					}
					if (token.endIndex > endColumn) {
						_tokens.push({
							startIndex: startColumn,
							endIndex: endColumn,
							scopes: scopes,
						});
						_tokens.push({
							startIndex: endColumn,
							endIndex: token.endIndex,
							scopes: token.scopes,
						});
						_tokens = _tokens.concat(tokens.slice(i + 1));
						break;
					} else {
						_tokens.push({
							startIndex: startColumn,
							endIndex: token.endIndex,
							scopes: scopes,
						});
					}
				} else if (token.startIndex > startColumn && token.endIndex <= endColumn) {
					_tokens.push({
						startIndex: token.startIndex,
						endIndex: token.endIndex,
						scopes: scopes,
					});
				} else if (token.startIndex < endColumn && token.endIndex > endColumn) {
					_tokens.push({
						startIndex: token.startIndex,
						endIndex: endColumn,
						scopes: scopes,
					});
					_tokens.push({
						startIndex: endColumn,
						endIndex: token.endIndex,
						scopes: token.scopes,
					});
					_tokens = _tokens.concat(tokens.slice(i + 1));
					break;
				} else if (token.startIndex >= endColumn) {
					_tokens = _tokens.concat(tokens.slice(i));
					break;
				} else {
					_tokens.push(token);
				}
			}
			lineObj.html = this.tokenizer.createHtml(_tokens, lineObj.text);
			this.myContext.renderedIdMap.get(lineObj.lineId).html = lineObj.html;
			this.$nextTick(() => {
				lineObj.fgTokens = _tokens;
			});
		},
		renderBracketMatch() {
			this.bracketMatch = this.folder.getBracketMatch(this.nowCursorPos);
			if (this.bracketMatch) {
				let lineObj = null;
				let pos = null;

				lineObj = this.myContext.htmls[this.bracketMatch.start.line - 1];
				pos = this.bracketMatch.start;
				this.bracketMatch.start.width = this.getStrWidth(lineObj.text, pos.startIndex, pos.endIndex);
				this.bracketMatch.start.left = this.getStrWidth(lineObj.text, 0, pos.startIndex);

				lineObj = this.myContext.htmls[this.bracketMatch.end.line - 1];
				pos = this.bracketMatch.end;
				this.bracketMatch.end.width = this.getStrWidth(lineObj.text, pos.startIndex, pos.endIndex);
				this.bracketMatch.end.left = this.getStrWidth(lineObj.text, 0, pos.startIndex);
			}
		},
		// 清除选中前景色
		clearSelectionToken() {
			this.myContext.fgLines.forEach((line) => {
				this._clearSelectionToken(line);
			});
			this.myContext.fgLines.empty();
		},
		_clearSelectionToken(line) {
			let lineObj = this.myContext.htmls[line - 1];
			if (!lineObj || !lineObj.fgTokens) {
				return;
			}
			lineObj.fgTokens = null;
			if (this.myContext.renderedLineMap.has(line)) {
				this.myContext.renderedIdMap.get(lineObj.lineId).html = this.tokenizer.createHtml(lineObj.tokens, lineObj.text);
			}
			lineObj.html = '';
		},
		// 渲染光标
		renderCursor(forceCursorView) {
			let that = this;
			let renderCursorId = this.renderCursorId + 1 || 1;
			this.renderCursorId = renderCursorId;
			this.$nextTick(() => {
				if (this.renderCursorId !== renderCursorId || !this.renderObjs.length) {
					return;
				}
				this.renderObjs.forEach((item) => {
					_setLine(item);
				});
				this.cursorVisible = true;
			});

			function _setLine(item) {
				let cursorList = [];
				that.cursor.getCursorsByLine(item.num).forEach((cursorPos) => {
					cursorList.push(_setCursorRealPos(cursorPos));
				});
				item.cursorList = cursorList;
			}

			function _setCursorRealPos(cursorPos) {
				let left = 0;
				if (cursorPos.del) {
					return;
				}
				left = that.getExactLeft(cursorPos);
				// 强制滚动使光标处于可见区域
				if (forceCursorView && cursorPos === that.nowCursorPos) {
					if (left > that.scrollerArea.width + that.scrollLeft - that.charObj.fullAngleCharWidth) {
						that.$refs.hScrollBar.scrollLeft = left + that.charObj.fullAngleCharWidth - that.scrollerArea.width;
					} else if (left < that.scrollLeft) {
						that.$refs.hScrollBar.scrollLeft = left - 1;
					}
				}
				if (cursorPos === that.nowCursorPos) {
					that.cursorLeft = left;
				}
				return left + 'px';
			}
		},
		renderError(line) {
			this.$nextTick(() => {
				_renderError.call(this);
			});

			function _renderError() {
				let $content = $(this.$refs.content);
				let keyMap = {};
				$content.find('span.my-token-error').remove();
				this.errors.forEach((item) => {
					let key = item.line + ',' + item.originColumn;
					let lineObj = null;
					if ((line && item.line !== line) || keyMap[key]) {
						return;
					}
					keyMap[key] = true;
					lineObj = this.myContext.htmls[item.line - 1];
					if (!item.endLine) {
						item.endLine = item.line;
					}
					if (item.column >= lineObj.text.length) {
						item.column = lineObj.text.length - 1;
					}
					if (!item.endColumn) {
						let res = null;
						if ((res = this.wordPattern.exec(lineObj.text.slice(item.column)))) {
							item.endColumn = item.column + res[0].length;
						} else {
							item.endColumn = item.column + 1;
						}
					}
					if (item.endColumn > lineObj.text.length) {
						item.endColumn = lineObj.text.length;
					}
					if (item.line === item.endLine) {
						_renderColError.call(this, item.line, item.column, item.endColumn, key);
					} else {
						_renderColError.call(this, item.line, item.column, lineObj.text.length, key);
						_renderColError.call(this, item.endLine, 0, item.endColumn, key);
						for (let line = item.line + 1; line < item.endLine; line++) {
							_renderLineError.call(this, line, key);
						}
					}
				});
			}

			function _renderColError(line, column, endColumn, key) {
				if (line < this.startLine || line >= this.startLine + this.maxVisibleLines || line > this.maxLine) {
					return;
				}
				let $content = $(this.$refs.content);
				let lineObj = this.myContext.htmls[line - 1];
				let token = this.getToken(line, column);
				let left = 0;
				if (token) {
					let $token = $content.find(`div.my-code[data-line="${line}"]`).find(`span[data-column="${token.startIndex}"]`);
					left = $token[0].offsetLeft + this.getStrWidth(lineObj.text, token.startIndex, column);
				}
				let width = this.getStrWidth(lineObj.text, column, endColumn) || this.charObj.charWidth;
				let html = `<span class="my-token-error" style="width:${width}px;left:${left}px" data-key="${key}"></span>`;
				$content.find(`div.my-code[data-line="${line}"]`).append(html);
			}

			function _renderLineError(line, key) {
				if (line < this.startLine || line >= this.startLine + this.maxVisibleLines || line > this.maxLin) {
					return;
				}
				let $content = $(this.$refs.content);
				let html = `<span class="my-token-error" style="width:100%;left:0px" data-key="${key}"></span>`;
				$content.find(`div.my-code[data-line="${line}"]`).append(html);
			}
		},
		// 折叠行
		foldLine(line) {
			let resultFold = this.folder.foldLine(line);
			this.focus();
			if (resultFold) {
				this.cursor.multiCursorPos.forEach((cursorPos) => {
					if (cursorPos.line > line && cursorPos.line < resultFold.end.line) {
						let lineObj = this.myContext.htmls[line - 1];
						cursorPos.line = line;
						cursorPos.column = lineObj.text.length;
					}
				});
				this.setContentHeight();
				this.render();
			}
		},
		// 展开折叠行
		unFold(line) {
			this.focus();
			if (this.folder.unFold(line)) {
				this.setContentHeight();
				this.render();
			}
		},
		// ctrl+f打开搜索
		openSearch(replaceMode) {
			let searchDialog = this.$refs.searchDialog;
			if (this.searchVisible && (this.fSelecter.activedRanges.size || !this.cursorFocus)) {
				//无效操作
				return;
			}
			if (this.cursorFocus) {
				let searchConfig = this.fSearcher.getSearchConfig();
				if (searchConfig) {
					//有效搜索
					searchDialog.initData({
						ignoreCase: searchConfig.ignoreCase,
						wholeWord: searchConfig.wholeWord,
						text: searchConfig.text,
					});
				} else if (this.searchVisible) {
					//无效搜索
					return;
				}
			}
			this.searchVisible = true;
			this.fSearcher.clearSearch();
			this.searchText({ config: searchDialog.getData() });
			searchDialog.initData({ replaceVisible: !!replaceMode });
			searchDialog.focus();
		},
		// 搜索完整单词
		searchWord(direct) {
			let resultObj = null;
			this.searcher.search({ direct: direct });
			if (this.searchVisible) {
				if (this.fSelecter.activedRanges.size === 0) {
					let searchConfig = this.fSearcher.getSearchConfig();
					if (searchConfig) {
						this.fSearcher.clearSearch();
						resultObj = this.fSearcher.search({ direct: direct, increase: true });
					}
				} else {
					resultObj = this.fSearcher.search({ direct: direct, increase: true });
				}
				if (resultObj) {
					this.searchNow = resultObj.now;
					this.searchCount = resultObj.count;
				}
			}
		},
		searchText(option) {
			let resultObj = this.fSearcher.search(option);
			if (resultObj) {
				this.searchNow = resultObj.now;
				this.searchCount = resultObj.count;
			} else {
				this.searchCount = 0;
			}
		},
		replace(data) {
			if (this.fSelecter.activedRanges.size) {
				let range = this.fSearcher.getNowRange();
				this.myContext.replace(data.text, [range]).then(() => {
					this.searchText();
				});
			} else {
				this.searchText();
			}
		},
		replaceAll(data) {
			if (this.fSelecter.ranges.size) {
				this.myContext.replace(data.text, this.fSelecter.ranges.toArray()).then(() => {
					this.fSearcher.clearSearch();
					this.searchCount = 0;
				});
			}
		},
		// 上一个提示
		prevAutoTip() {
			this.$refs.autoTip.prev();
		},
		// 下一个提示
		nextAutoTip() {
			this.$refs.autoTip.next();
		},
		selectAutoTip() {
			let index = this.$refs.autoTip.getActiveIndex();
			this.onClickAuto(this.autoTipList[index]);
		},
		setData(prop, value) {
			if (typeof this[prop] === 'function') {
				return;
			}
			this[prop] = value;
		},
		setNowCursorPos(nowCursorPos) {
			this.nowCursorPos = nowCursorPos || { line: 1, column: 0 };
			if (nowCursorPos) {
				let setNowCursorPosId = this.setNowCursorPosId + 1 || 1;
				this.setNowCursorPosId = setNowCursorPosId;
				// 强制滚动使光标处于可见区域
				this.$nextTick(() => {
					if (this.setNowCursorPosId != setNowCursorPosId) {
						return;
					}
					let height = this.folder.getRelativeLine(nowCursorPos.line + 1) * this.charObj.charHight;
					if (height > this.scrollTop + this.scrollerArea.height) {
						requestAnimationFrame(() => {
							height = height > this.contentHeight ? this.contentHeight : height;
							this.setStartLine(height - this.scrollerArea.height);
						});
					} else if (nowCursorPos.line <= this.startLine) {
						requestAnimationFrame(() => {
							if (nowCursorPos.line <= this.startLine) {
								let scrollTop = (this.folder.getRelativeLine(nowCursorPos.line) - 1) * this.charObj.charHight;
								//此时this.startLine可能已经通过onScrll而改变
								this.setStartLine(scrollTop);
							}
						});
					}
					requestAnimationFrame(() => {
						this.renderCursor(true);
					});
				});
			}
		},
		setScrollerArea() {
			this.scrollerArea = {
				height: this.$refs.scroller.clientHeight,
				width: this.$refs.scroller.clientWidth,
			};
		},
		// 设置滚动区域真实高度
		setContentHeight() {
			let maxLine = this.myContext.htmls.length;
			let contentHeight = 0;
			maxLine = this.folder.getRelativeLine(maxLine);
			contentHeight = maxLine * this.charObj.charHight;
			if (this.type !== 'diff' && this.scrollerArea.height) {
				contentHeight += this.scrollerArea.height - this.charObj.charHight;
			}
			this.contentHeight = contentHeight;
		},
		setTop() {
			this.$refs.numLay.style.top = -this.scrollTop + 'px';
			this.$refs.contentLay.style.top = -this.scrollTop + 'px';
		},
		setDiffTop() {
			let top = (this.folder.getRelativeLine(this.diffLine) - 1) * this.charObj.charHight - this.scrollTop;
			this.diffTop = top + this.diffMarginTop;
			if (this.diffTop - 30 < -this.scrollTop) {
				this.diffTop = -this.scrollTop + 30;
			}
		},
		setStartLine(scrollTop, force) {
			let startLine = 1;
			scrollTop = scrollTop < 0 ? 0 : scrollTop;
			if (scrollTop > this.contentHeight - this.scrollerArea.height) {
				scrollTop = this.contentHeight - this.scrollerArea.height;
			}
			if (!force && Math.abs(scrollTop - this.scrollTop) < 1) {
				return;
			}
			if (this.diffLine) {
				this.setDiffTop();
			}
			startLine = Math.floor(scrollTop / this.charObj.charHight);
			startLine++;
			this.startLine = this.folder.getRealLine(startLine);
			this.startLineTop = (this.folder.getRelativeLine(this.startLine) - 1) * this.charObj.charHight;
			this.scrollTop = scrollTop;
			this.$refs.vScrollBar.scrollTop = scrollTop;
			this.$refs.numScroller.scrollTop = scrollTop;
			this.render();
			this.tokenizer.tokenizeVisibleLins();
		},
		setErrors(errors) {
			this.errorMap = {};
			this.errors = errors;
			_formatError.call(this, this.errorMap, errors);
			this.renderError();

			function _formatError(errorMap, errors) {
				let index = 0;
				while (index < errors.length) {
					let line = errors[index].line;
					let arr = [];
					while (index < errors.length && errors[index].line === line) {
						let key = line + ',' + errors[index].column;
						errors[index].originColumn = errors[index].column;
						arr.push(errors[index].reason);
						if (errorMap[key]) {
							errorMap[key] += '<br>' + errors[index].reason;
						} else {
							errorMap[key] = errors[index].reason;
						}
						index++;
					}
					line = line || this.htmls.length;
					errorMap[line] = arr.join('<br>');
				}
			}
		},
		setAutoTip(results) {
			clearTimeout(this.setAutoTip.hideTimer);
			if (results && results.length) {
				results.forEach((item) => {
					item.active = false;
				});
				this.autoTipList = results;
				this.autoTipList[0].active = true;
				this.$nextTick(() => {
					let width = this.$refs.autoTip.$el.clientWidth;
					let height = this.$refs.autoTip.$el.clientHeight;
					this.autoTipStyle.top = this.folder.getRelativeLine(this.nowCursorPos.line) * this.charObj.charHight;
					this.autoTipStyle.left = this.getExactLeft(this.nowCursorPos);
					if (this.autoTipStyle.top + height > this.startLineTop + this.$refs.scroller.clientHeight) {
						this.autoTipStyle.top -= height + this.charObj.charHight;
					}
					if (this.autoTipStyle.left + width > this.scrollLeft + this.scrollerArea.width) {
						this.autoTipStyle.left -= width;
					}
					this.autoTipStyle.top += 'px';
					this.autoTipStyle.left += 'px';
				});
			} else {
				//内容改变时会触发setAutoTip(null)
				this.setAutoTip.hideTimer = setTimeout(() => {
					this.autoTipList = null;
				}, 60);
			}
		},
		getTabNum(line) {
			let lineObj = this.myContext.htmls[line - 1];
			let text = lineObj.text;
			let wReg = /[^\s]/;
			let tabNum = 0;
			if (lineObj.tabNum > -1) {
				return lineObj.tabNum;
			}
			if (wReg.exec(text)) {
				//该行有内容
				let spaceNum = /^\s+/.exec(text);
				if (spaceNum) {
					tabNum = /\t+/.exec(spaceNum[0]);
					tabNum = (tabNum && tabNum[0].length) || 0;
					tabNum = tabNum + Math.ceil((spaceNum[0].length - tabNum) / this.tabSize);
				}
			} else {
				//空行
				let _line = line - 1;
				while (_line >= 1) {
					if (wReg.exec(this.myContext.htmls[_line - 1].text)) {
						tabNum = this.getTabNum(_line);
						if (this.folder.getRangeFold(_line, true)) {
							tabNum++;
						}
						break;
					}
					_line--;
				}
			}
			lineObj.tabNum = tabNum;
			return tabNum;
		},
		// 获取文本在浏览器中的宽度
		getStrWidth(str, start, end) {
			return Util.getStrWidth(str, this.charObj.charWidth, this.charObj.fullAngleCharWidth, this.tabSize, start, end);
		},
		// 获取行对应的文本在浏览器中的宽度
		getStrWidthByLine(line, start, end) {
			return this.getStrWidth(this.myContext.htmls[line - 1].text, start, end);
		},
		// 根据文本宽度计算当前列号
		getColumnByWidth(text, offsetX) {
			let left = 0,
				right = text.length;
			let mid, width, w1, w2;
			while (left < right) {
				mid = Math.floor((left + right) / 2);
				width = this.getStrWidth(text, 0, mid);
				w1 = text[mid - 1] && this.getStrWidth(text[mid - 1]) / 2;
				w2 = (text[mid] && this.getStrWidth(text[mid]) / 2) || w1;
				if ((width >= offsetX && width - offsetX < w1) || (offsetX >= width && offsetX - width < w2)) {
					left = mid;
					break;
				} else if (width > offsetX) {
					right = mid;
				} else {
					left = mid + 1;
				}
			}
			return left;
		},
		// 根据鼠标事件对象获取行列坐标
		getPosByEvent(e) {
			let $target = $(e.target);
			let line = ($target.attr('data-line') || $target.parent().attr('data-line')) - 0;
			let column = $target.attr('data-column');
			if (!line) {
				if (e.target === this.$refs.content) {
					line = this.myContext.htmls.length;
				} else {
					//移动到了区域外
					return null;
				}
			}
			let lineObj = this.myContext.htmls[line - 1];
			let tokens = lineObj.fgTokens || lineObj.tokens;
			if (!column) {
				column = lineObj.text.length;
			} else {
				column = column - 0;
				for (let i = 0; i < tokens.length; i++) {
					let token = tokens[i];
					if (tokens[i].startIndex == column) {
						column += this.getColumnByWidth(lineObj.text.slice(token.startIndex, token.endIndex), e.offsetX);
						break;
					}
				}
			}
			return {
				line: line,
				column: column,
			};
		},
		// 获取光标真实位置
		getExactLeft(cursorPos) {
			let lineObj = this.myContext.htmls[cursorPos.line - 1];
			if (!lineObj.tokens || !lineObj.tokens.length) {
				return 0;
			}
			let tokens = lineObj.fgTokens || lineObj.tokens;
			let token = tokens[0];
			for (let i = 1; i < tokens.length; i++) {
				if (tokens[i].startIndex < cursorPos.column) {
					token = tokens[i];
				} else {
					break;
				}
			}
			let $token = $(`#line-${this.id}-${cursorPos.line}`)
				.children('div.my-code')
				.children('span[data-column="' + token.startIndex + '"]');
			if (!$token.length) {
				return 0;
			}
			let text = lineObj.text.slice(token.startIndex, cursorPos.column);
			return $token[0].offsetLeft + this.getStrWidth(text);
		},
		getToken(line, column) {
			let lineObj = this.myContext.htmls[line - 1];
			if (lineObj && lineObj.tokens) {
				if (column > lineObj.tokens.peek().startIndex) {
					return lineObj.tokens.peek();
				}
				for (let i = 0; i < lineObj.tokens.length; i++) {
					if (lineObj.tokens[i].startIndex <= column && lineObj.tokens[i].endIndex > column) {
						return lineObj.tokens[i];
					}
				}
			}
			return null;
		},
		// 右键菜单事件
		onContextmenu(e) {
			this.menuVisible = true;
			this.$nextTick(() => {
				this.menuStyle = Util.getMemnuPos(e, this.$refs.menu.$el, this.$refs.editor);
				this.focus();
			});
		},
		// 选中菜单
		onClickMenu(menu) {
			switch (menu.op) {
				case 'revealInFileExplorer':
					EventBus.$emit('reveal-in-file-explorer', this.path);
					break;
				case 'cut':
				case 'copy':
					Util.writeClipboard(this.myContext.getCopyText(menu.op === 'cut'));
					break;
				case 'paste':
					this.$refs.textarea.focus();
					Util.readClipboard().then((text) => {
						this.myContext.insertContent(text);
					});
					break;
			}
			this.menuVisible = false;
			this.focus();
		},
		// 选中自动提示
		onClickAuto(item) {
			this.myContext.replaceTip(item);
			this.autoTipList = null;
			this.focus();
		},
		// 折叠/展开
		onToggleFold(line) {
			if (this.folder.getFoldByLine(line)) {
				this.unFold(line);
			} else {
				this.foldLine(line);
			}
		},
		// 内容区域鼠标按下事件
		onContentMdown(e) {
			if (e.which == 3) {
				//右键
				return;
			}
			let pos = this.getPosByEvent(e);
			let cursorPos = null;
			this.mouseStartObj = {
				time: Date.now(),
				start: pos,
			};
			if ((e.ctrlKey && this.cursor.multiKeyCode === 'ctrl') || (e.altKey && this.cursor.multiKeyCode === 'alt')) {
				// 多光标编辑
				let range = this.selecter.getRangeWithCursorPos(pos);
				//删除重叠选中区域
				range && this.selecter.removeRange(range);
				cursorPos = this.cursor.addCursorPos(pos);
			} else {
				cursorPos = this.cursor.setCursorPos(pos);
				// 非多点编辑情况下，鼠标左键删除选中区域
				if (e.which !== 3) {
					this.searcher.clearSearch();
				}
			}
			if (e.which != 3) {
				this.fSearcher.clearActive(); //光标更改后，搜索框取消当前活动区域
				if (this.mouseUpTime && Date.now() - this.mouseUpTime < 200) {
					//双击选中单词
					this.mouseStartObj.doubleClick = true;
					this.searchWord();
				}
			}
			this.mouseStartObj.cursorPos = cursorPos;
			// 删除非活动区域的选中区域
			this.searcher.clearSearch(true);
			this.focus();
		},
		onErrorMousemove(e, line) {
			let $errors = $(`div.my-code[data-line=${line}]`).children('span.my-token-error');
			let left = e.clientX - $(this.$refs.content).offset().left;
			for (let i = 0; i < $errors.length; i++) {
				let $error = $errors.eq(i);
				let width = $error.width();
				let _left = $error[0].offsetLeft;
				if (left >= _left && left <= _left + width) {
					_showTip.call(this, e, $error.attr('data-key'));
					break;
				}
			}

			function _showTip(e, key) {
				let $editor = $(this.$refs.editor);
				let $tip = $(this.$refs.tip.$el);
				let offset = $editor.offset();
				let top = e.clientY - offset.top;
				let left = e.clientX - offset.left;
				this.tipContent = this.errorMap[key];
				this.$nextTick(() => {
					if (top + $tip[0].clientHeight > this.scrollerArea.height) {
						top = this.scrollerArea.height - $tip[0].clientHeight;
					}
					this.tipStyle = {
						left: left + 10 + 'px',
						top: top + 10 + 'px',
					};
				});
			}
		},
		onContentMmove(e) {
			if (this.mouseStartObj && Date.now() - this.mouseStartObj.time > 100) {
				let end = this.getPosByEvent(e);
				if (end && Util.comparePos(end, this.mouseStartObj.cursorPos)) {
					let range = this.selecter.getRangeWithCursorPos(end);
					//删除重叠选中区域
					range && this.selecter.removeRange(range);
					this.cursor.removeCursor(this.mouseStartObj.cursorPos);
					this.mouseStartObj.cursorPos = this.cursor.addCursorPos({
						line: end.line,
						column: end.column,
					});
					if (this.mouseStartObj.preRange) {
						this.selecter.updateRange(this.mouseStartObj.preRange, {
							start: this.mouseStartObj.start,
							end: end,
						});
					} else {
						this.mouseStartObj.preRange = this.selecter.addRange({
							start: this.mouseStartObj.start,
							end: end,
						});
					}
					// 删除区域范围内的光标
					this.cursor.removeCursorInRange(this.mouseStartObj.preRange);
				}
			}
			_checkErrorOver.call(this, e);

			function _checkErrorOver(e) {
				let $target = $(e.target);
				let line = $target.parent().attr('data-line');
				this.tipContent = '';
				line && this.onErrorMousemove(e, line);
			}
		},
		onContentMLeave() {
			this.tipContent = '';
		},
		// 鼠标移动事件
		onDocumentMmove(e) {
			let that = this;
			let offset = $(this.$refs.scroller).offset();
			if (this.mouseStartObj && Date.now() - this.mouseStartObj.time > 100) {
				let line = Math.ceil((this.scrollTop + e.clientY - offset.top) / this.charObj.charHight);
				line = line < 1 ? 1 : line;
				line = line > this.maxLine ? this.maxLine : line;
				cancelAnimationFrame(this.selectMoveTimer);
				if (e.clientY > offset.top + this.scrollerArea.height) {
					//鼠标超出底部区域
					_move('down', e.clientY - offset.top - this.scrollerArea.height);
				} else if (e.clientY < offset.top) {
					//鼠标超出顶部区域
					_move('up', offset.top - e.clientY);
				} else if (e.clientX < offset.left) {
					//鼠标超出左边区域
					_move('left', offset.left - e.clientX, line);
				} else if (e.clientX > offset.left + this.scrollerArea.width) {
					//鼠标超出右边区域
					_move('right', e.clientX - offset.left - this.scrollerArea.width, line);
				}
			}
			if (this.diffBottomSashMouseObj) {
				let height = (this.diffHeight += e.clientY - this.diffBottomSashMouseObj.clientY);
				if (height < this.charObj.charHight + 16) {
					height = this.charObj.charHight + 16;
				}
				if (height + this.diffTop > this.scrollerArea.height) {
					height = this.scrollerArea.height - this.diffTop;
				}
				this.diffHeight = height;
				this.diffBottomSashMouseObj = e;
			}
			function _move(autoDirect, speed, line) {
				let originLine = line || that.folder.getRelativeLine(that.nowCursorPos.line);
				let originColumn = that.nowCursorPos.column;
				let count = 0; // 累计滚动距离
				_run(autoDirect, speed);

				function _run(autoDirect, speed) {
					let line = originLine;
					let column = originColumn;
					switch (autoDirect) {
						case 'up':
							count += speed;
							line = Math.floor(count / that.charObj.charHight);
							line = originLine - line;
							column = 0;
							break;
						case 'down':
							count += speed;
							line = Math.floor(count / that.charObj.charHight);
							line = originLine + line;
							break;
						case 'left':
							count += speed;
							column = Math.floor(count / that.charObj.charWidth);
							column = originColumn - column;
							break;
						case 'right':
							count += speed;
							column = Math.floor(count / that.charObj.charWidth);
							column = originColumn + column;
							break;
					}
					line = that.folder.getRealLine(line);
					line = line < 1 ? 1 : line > that.maxLine ? that.maxLine : line;
					if (autoDirect === 'down') {
						column = that.myContext.htmls[line - 1].text.length;
					} else {
						column = column < 0 ? 0 : column > that.myContext.htmls[line - 1].text.length ? that.myContext.htmls[line - 1].text.length : column;
					}
					that.mouseStartObj.cursorPos = that.cursor.setCursorPos({
						line: line,
						column: column,
					});
					that.mouseStartObj.preRange = that.selecter.setRange(that.mouseStartObj.start, {
						line: line,
						column: column,
					});
					that.selectMoveTimer = requestAnimationFrame(() => {
						_run(autoDirect, speed);
					});
				}
			}
		},
		// 鼠标抬起事件
		onDocumentMouseUp(e) {
			// 停止滚动选中
			cancelAnimationFrame(this.selectMoveTimer);
			this.mouseStartObj = null;
			this.diffBottomSashMouseObj = null;
			this.mouseUpTime = Date.now();
			this.$refs.searchDialog && this.$refs.searchDialog.directBlur();
		},
		// 调整diff弹框高度开始
		onDiffBottomSashBegin(e) {
			this.diffBottomSashMouseObj = e;
		},
		// 滚动滚轮
		onWheel(e) {
			this.deltaYStack.push(e.deltaY);
			this.$refs.hScrollBar.scrollLeft = this.scrollLeft + e.deltaX;
			_scroll.call(this);

			function _scroll() {
				if (this.scrolling) {
					return;
				}
				this.scrolling = true;
				requestAnimationFrame(() => {
					this.setStartLine(this.scrollTop + this.deltaYStack.shift());
					this.scrolling = false;
					this.deltaYStack.length && _scroll.call(this);
				});
			}
		},
		// 右侧滚动条滚动事件
		onVBarScroll(e) {
			this.setStartLine(e.target.scrollTop);
		},
		onHBarScroll(e) {
			this.scrollLeft = e.target.scrollLeft;
		},
		// 中文输入开始
		onCompositionstart() {
			if (!this.editAble) {
				return;
			}
			clearTimeout(this.compositionendTimer);
			this.compositionstart = true;
		},
		// 中文输入结束
		onCompositionend() {
			if (this.compositionstart) {
				let text = this.$refs.textarea.value || '';
				if (text) {
					this.myContext.insertContent(text);
					this.autocomplete.search();
					this.$refs.textarea.value = '';
				}
			}
			//避免有些浏览器compositionend在input事件之前触发的bug
			this.compositionendTimer = setTimeout(() => {
				this.compositionstart = false;
			}, 100);
		},
		// 输入事件
		onInput() {
			if (!this.editAble) {
				return;
			}
			if (!this.compositionstart) {
				let text = this.$refs.textarea.value || '';
				if (text) {
					this.myContext.insertContent(text);
					this.autocomplete.search();
					this.$refs.textarea.value = '';
				}
			}
		},
		// 复制事件
		onCopy(e) {
			let mime = window.clipboardData ? 'Text' : 'text/plain';
			let clipboardData = e.clipboardData || window.clipboardData;
			clipboardData.setData(mime, this.myContext.getCopyText());
		},
		onCut(e) {
			let mime = window.clipboardData ? 'Text' : 'text/plain';
			let clipboardData = e.clipboardData || window.clipboardData;
			clipboardData.setData(mime, this.myContext.getCopyText(this.editAble));
		},
		// 粘贴事件
		onPaste(e) {
			if (!this.editAble) {
				return;
			}
			let mime = window.clipboardData ? 'Text' : 'text/plain';
			let clipboardData = e.clipboardData || window.clipboardData;
			let copyText = '';
			copyText = clipboardData.getData(mime);
			this.myContext.insertContent(copyText);
		},
		// 获得焦点
		onFocus() {
			this.showCursor();
		},
		// 失去焦点
		onBlur() {
			this.hideCursor();
		},
		// 键盘按下事件
		onKeydown(e) {
			if (!this.editAble) {
				return;
			}
			this.shortcut.onKeydown(e);
		},
		// 搜索框首次搜索
		onSearch(config) {
			this.fSearcher.clearSearch();
			this.searchText({ config: config });
		},
		onSearchNext() {
			this.searchText({ direct: 'next' });
		},
		onSearchPrev() {
			this.searchText({ direct: 'up' });
		},
		onCloseSearch() {
			this.focus();
			if (this.fSelecter.activedRanges.size) {
				this.searcher.clone(this.fSearcher.getCacheData());
			}
			this.fSearcher.clearSearch();
			this.searchVisible = false;
		},
		onShowDiff(line) {
			let preDiff = Util.getPrevDiff(this.diffTree, line);
			this.diffLine = line;
			this.diffVisible = false;
			this.diffMarginTop = 0;
			this.diffHeight = (preDiff.added.length + preDiff.deleted.length) * this.charObj.charHight + 2;
			this.diffHeight = this.diffHeight > 200 ? 200 : this.diffHeight;
			this.setDiffTop();
			this.$nextTick(() => {
				this.diffVisible = true;
				this.toShowdiffObj = {
					maxLine: this.maxLine,
					language: this.language,
					states: preDiff.line > 1 ? this.myContext.htmls[preDiff.line - 2].states : null,
					diff: preDiff,
					line: line,
					beforeLine: preDiff.line - 1,
					deletedLength: preDiff.deleted.length,
				};
			});
		},
		onCloseDiff() {
			this.diffVisible = false;
		},
	},
};
</script>
