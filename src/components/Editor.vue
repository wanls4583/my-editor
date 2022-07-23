<template>
	<div
		@contextmenu.prevent.stop="onContextmenu"
		@mouseenter="showScrollBar"
		@mouseleave="hideScrollBar"
		@mousemove="showScrollBar"
		@selectstart.prevent
		@wheel.stop="onWheel"
		class="my-editor-wrap"
		ref="editor"
	>
		<!-- 行号 -->
		<div class="my-num-wrap" ref="numWrap">
			<!-- 占位行号，避免行号宽度滚动时变化 -->
			<div class="my-num" style="position: relative; visibility: hidden;">{{ diffObj.maxLine || maxLine }}</div>
			<div class="my-num-scroller" ref="numScroller">
				<div :style="{ transform: 'translate3d(0,'+_top+',0)' }" class="my-num-content" ref="numContent">
					<div :class="{ 'my-active': nowCursorPos.line === numItem.num }" :style="{ top: numItem.top }" class="my-num" v-for="numItem in renderNums">
						<span class="num">{{ numItem._num }}</span>
						<span :class="numItem.fold == 'open' ? 'my-fold-open icon-down1' : 'my-fold-close icon-right'" @click="onToggleFold(numItem.num)" class="my-fold my-center-center iconfont" v-if="numItem.fold"></span>
						<template v-if="type !== 'diff'">
							<span :class="numItem.diffType" @click="onShowDiff(numItem.num)" class="my-diff-num" v-if="numItem.diffType"></span>
						</template>
					</div>
				</div>
			</div>
		</div>
		<div class="my-content-wrap" ref="contentWrap">
			<!-- 可滚动区域 -->
			<div @scroll="onScroll" class="my-scroller" ref="scroller">
				<!-- 内如区域 -->
				<div
					:style="{ transform: 'translate3d('+_left+','+_top+',0)' }"
					@mousedown="onContentMdown"
					@mouseleave="onContentMLeave"
					@mousemove="onContentMmove"
					@selectend.prevent="onSelectend"
					class="my-content"
					ref="content"
				>
					<div :style="{width: _contentMinWidth+'px'}" class="my-lines-view" ref="lineView">
						<div :class="line.diffClass" :data-line="line.num" :id="_lineId(line.num)" :style="{top: line.top}" class="my-line" v-for="line in renderObjs">
							<div :class="[line.foldClass]" :data-line="line.num" class="my-code" v-html="line.html"></div>
						</div>
					</div>
					<div :style="{width: _contentMinWidth+'px'}" class="my-cursor-view" ref="cursorView">
						<template v-for="posList in renderCursorObjs">
							<span :style="{ height: _lineHeight, left: pos.left, top: pos.top, visibility: _cursorVisible }" class="my-cursor" v-for="pos in posList"></span>
						</template>
					</div>
					<div :style="{width: _contentMinWidth+'px'}" class="my-bg-view">
						<div :style="{top: item.top, height: _lineHeight}" class="my-line-bgs" v-for="item in renderSelectionObjs">
							<div :class="range.bgClass" :style="range.bgStyle" class="my-select-bg" v-for="range in item.selections"></div>
						</div>
						<div :style="{height: _lineHeight, top: _activeLineTop}" class="my-line-bg" v-if="activeLineBg"></div>
						<div :style="_bracketStartStyle" class="my-bracket-match" v-if="_bracketStartVisible"></div>
						<div :style="_bracketEndStyle" class="my-bracket-match" v-if="_bracketEndVisible"></div>
					</div>
					<div :style="{width: _contentMinWidth+'px'}" class="my-indent-view">
						<div :style="{height: _lineHeight, top: line.top}" class="my-indents" v-for="line in renderObjs" v-html="line.tabLines"></div>
					</div>
					<auto-tip :styles="autoTipStyle" :tipList="autoTipList" @change="onClickAuto" ref="autoTip" v-show="autoTipList && autoTipList.length"></auto-tip>
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
				<h-scroll-bar :class="{'my-scroll-visible': scrollVisible}" :scroll-left="scrollLeft" :width="_contentMinWidth" @scroll="onHBarScroll" class="my-editor-scrollbar-h"></h-scroll-bar>
				<div class="my-scroller-shadow-left" v-if="_leftShadow"></div>
				<div class="my-scroller-shadow-right" v-if="_rightShadow && minimapVisible"></div>
			</div>
			<!-- 搜索框 -->
			<search-dialog ref="searchDialog" v-show="searchVisible"></search-dialog>
		</div>
		<div class="my-minimap-wrap" ref="minimapWrap" v-if="minimapVisible">
			<minimap :content-height="contentHeight" :now-line="startLine" :scroll-top="scrollTop" ref="minimap"></minimap>
		</div>
		<v-scroll-bar :class="{'my-scroll-visible': scrollVisible}" :height="contentHeight" :scroll-top="scrollTop" @scroll="onVBarScroll" class="my-editor-scrollbar-v"></v-scroll-bar>
		<editor-menu ref="menu"></editor-menu>
		<tip :content="tipContent" :styles="tipStyle" ref="tip" v-show="tipContent"></tip>
		<div :style="{top: diffTop + 'px', height: diffHeight+'px'}" class="my-diff-editor" ref="diff" v-if="diffVisible">
			<div class="my-diff-bar">
				<span style="margin-right: 20px">{{tabData.name}}</span>
				<div @click="onCloseDiff" class="bar-item my-hover-danger">
					<span class="iconfont icon-close" style="font-size: 18px"></span>
				</div>
			</div>
			<editor :active="true" :diff-obj="toShowdiffObj" :tab-data="diffTabData" style="flex:1" type="diff"></editor>
			<div @mousedown="onDiffBottomSashBegin" class="my-sash-h"></div>
		</div>
	</div>
</template>

<script>
import Tokenizer from '@/module/tokenizer/index';
import Lint from '@/module/lint/index';
import Formatter from '@/module/format/index';
import Differ from '@/module/diff/index';
import Autocomplete from '@/module/autocomplete/index';
import Fold from '@/module/fold/index';
import Search from '@/module/search/index';
import Select from '@/module/select/index';
import Cursor from '@/module/cursor/index';
import History from '@/module/history/index';
import Context from '@/module/context/index';
import ShortCut from '@/module/shortcut/editor';
import EditorMenu from './EditorMenu.vue';
import SearchDialog from './Search';
import Menu from './Menu';
import AutoTip from './AutoTip';
import Tip from './Tip';
import Minimap from './Minimap.vue';
import VScrollBar from './VScrollBar.vue';
import HScrollBar from './HScrollBar.vue';
import Util from '@/common/util';
import EventBus from '@/event';
import $ from 'jquery';
import globalData from '@/data/globalData';
import Enum from '@/data/enum';

const contexts = Context.contexts;
const tabLinesMap = {};
const gitTypeMap = {
	A: 'add',
	M: 'modify',
	D: 'delete',
};

export default {
	name: 'Editor',
	components: {
		SearchDialog,
		Menu,
		AutoTip,
		Tip,
		Minimap,
		VScrollBar,
		HScrollBar,
		EditorMenu,
	},
	props: {
		type: String,
		tabData: Object,
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
			indent: 'tab',
			tabSize: 4,
			startLine: 1,
			endLine: 1,
			cursorLeft: 0,
			scrollLeft: 0,
			scrollTop: 0,
			deltaTop: 0,
			maxVisibleLines: 1,
			maxLine: 1,
			maxContentHeight: 1000000,
			contentHeight: 0,
			errorMap: {},
			errors: [],
			autoTipList: [],
			renderObjs: [],
			renderNums: [],
			renderCursorObjs: [],
			renderSelectionObjs: [],
			diffRanges: null,
			diffTabData: null,
			tipContent: null,
			searchVisible: false,
			selectedFg: false,
			activeLineBg: true,
			diffVisible: false,
			diffHeight: 200,
			diffTop: 0,
			diffMarginTop: 0,
			toShowdiffObj: null,
			scrollVisible: false,
			minimapVisible: false,
			scrollerArea: { width: 0, height: 0 },
			nowCursorPos: { line: 1, column: 0 },
			bracketMatch: { start: {}, end: {} },
			tipStyle: { top: '0px', left: '0px' },
			autoTipStyle: { top: '50%', left: '50%' },
			maxWidthObj: { lineId: null, text: '', width: 0 },
			charObj: {
				charHight: 23,
				charScale: 0.5498046875,
				charWidth: 8.796875,
				fontSize: 16,
				fullCharScale: 1,
				fullCharWidth: 16
			},
		};
	},
	computed: {
		_lineId() {
			return (line) => {
				return 'line-' + this.tabData.id + '-' + line;
			};
		},
		_top() {
			return -(this.scrollTop - this.deltaTop) + 'px';
		},
		_left() {
			return -this.scrollLeft + 'px';
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
		_activeLineTop() {
			return (this.folder.getRelativeLine(this.nowCursorPos.line) - 1) * this.charObj.charHight - this.deltaTop + 'px';
		},
		_cursorVisible() {
			return this.cursorVisible && this.cursorFocus ? 'visible' : 'hidden';
		},
		_contentMinWidth() {
			let width = this.maxWidthObj.width + this.charObj.fullCharWidth;
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
				top = (this.folder.getRelativeLine(line) - this.startLine + 1) * this.charObj.charHight;
				if (top > this.scrollerArea.height - 2 * this.charObj.charHight) {
					top = this.scrollerArea.height - 2 * this.charObj.charHight;
				}
			}
			if (left > this.scrollerArea.width - this.charObj.fullCharWidth) {
				left = this.scrollerArea.width - this.charObj.fullCharWidth;
			} else if (left < this.charObj.fullCharWidth) {
				left = this.charObj.fullCharWidth;
			}
			return {
				top: top + 'px',
				left: left + 'px',
			};
		},
		_bracketStartVisible() {
			return this.bracketMatch && this.bracketMatch.start.line >= this.startLine && this.bracketMatch.start.line <= this.endLine;
		},
		_bracketEndVisible() {
			return this.bracketMatch && this.bracketMatch.end && this.bracketMatch.end.line >= this.startLine && this.bracketMatch.end.line <= this.endLine;
		},
		_bracketStartStyle() {
			return {
				left: this.bracketMatch.start.left,
				top: this.bracketMatch.start.top - this.deltaTop + 'px',
				width: this.bracketMatch.start.width,
				height: this._lineHeight,
			};
		},
		_bracketEndStyle() {
			return {
				left: this.bracketMatch.end.left,
				top: this.bracketMatch.end.top - this.deltaTop + 'px',
				width: this.bracketMatch.end.width,
				height: this._lineHeight,
			};
		},
		space() {
			return Util.space(this.tabSize);
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
			this.selectedFg = !!globalData.colors['editor.selectionForeground'];
			this.tokenizer.clearScopeMap();
			this.$refs.minimap && this.$refs.minimap.initWorkerData('theme');
			this.render();
		},
		tabSize: function (newVal) {
			this.myContext.htmls.forEach((lineObj) => {
				lineObj.tabNum = -1;
				lineObj.html = '';
			});
			this.$refs.minimap && this.$refs.minimap.initWorkerData('size');
			this.render();
			this.maxWidthObj = { lineId: null, text: '', width: 0 };
			this.myContext.setLineWidth(this.myContext.htmls);
		},
		maxLine: function (newVal) {
			this.setContentHeight();
		},
		active: function (newVal) {
			if (newVal) {
				this.setPosition();
			} else {
				this.autocomplete.stop();
			}
		},
		diffRanges: function (newVal) {
			this.setNumExtraData();
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
	},
	created() {
		this.initData();
		this.initEvent();
		this.initEventBus();
	},
	mounted() {
		if (this.active) {
			this.setPosition();
		}
		this.initResizeEvent();
	},
	beforeDestroy() {
	},
	destroyed() {
		this.unbindEvent();
		this.myContext.destroy();
		this.tokenizer.destroy();
		this.lint.destroy();
		this.history.destroy();
		this.selecter.destroy();
		this.fSelecter.destroy();
		this.cursor.destroy();
		this.autocomplete.destroy();
		this.folder.destroy();

		contexts[this.tabData.id] = null;
		this.tokenizer = null;
		this.lint = null;
		this.history = null;
		this.selecter = null;
		this.fSelecter = null;
		this.cursor = null;
		this.autocomplete = null;
		this.folder = null;

		this.errorMap = null;
		this.errors = null;
		this.autoTipList = null;
		this.renderObjs = null;
		this.renderNums = null;
		this.renderCursorObjs = null;
		this.renderSelectionObjs = null;
		this.renderedLineMap = null;
		this.renderedIdMap = null;
		this.renderNumsIdMap = null;
		this.diffRanges = null;
		this.diffTabData = null;
		this.tipContent = null;

		cancelAnimationFrame(this.focusTimer);
		cancelAnimationFrame(this.renderTimer);
		cancelAnimationFrame(this.renderCursorTimer);
		cancelAnimationFrame(this.checkErrorOverTimer);
		clearTimeout(this.curserTimer);
		clearTimeout(this.renderSelectedBgTimer);
		clearTimeout(this.bracketMatchTimer);
		clearTimeout(this.setAutoTip.hideTimer);
		clearTimeout(this.compositionendTimer);
		globalData.scheduler.removeUiTask(this.moveTask);
		globalData.scheduler.removeUiTask(this.wheelTask);
	},
	methods: {
		// 初始化数据
		initData() {
			contexts[this.tabData.id] = new Context(this);
			this.renderedCb = [];
			this.renderedLineMap = {};
			this.renderedIdMap = {};
			this.renderNumsIdMap = {};
			this.editorId = this.tabData.id;
			this.myContext = contexts[this.tabData.id];
			this.maxWidthObj.lineId = this.myContext.htmls[0].lineId;
			this.tokenizer = new Tokenizer(this, this.myContext);
			this.lint = new Lint(this, this.myContext);
			this.formatter = new Formatter(this, this.myContext);
			this.differ = new Differ(this, this.myContext);
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
			this.selectedFg = !!globalData.colors['editor.selectionForeground'];
			this.minimapVisible = this.type !== 'diff' && globalData.views.minimap;
		},
		initRenderData() {
			this.charObj = Util.getCharWidth(this.$refs.lineView, '<div class="my-line"><div class="my-code">[dom]</div></div>');
			this.maxVisibleLines = Math.ceil(this.$refs.scroller.clientHeight / this.charObj.charHight) + 1;
		},
		// 初始化文档事件
		initEvent() {
			this.initEventFn1 = (e) => {
				this.active && this.onDocumentMmove(e);
			};
			this.initEventFn2 = (e) => {
				this.active && this.onDocumentMouseUp(e);
			};
			$(document).on('mousemove', this.initEventFn1);
			$(document).on('mouseup', this.initEventFn2);
		},
		initResizeEvent() {
			this.resizeObserver = new ResizeObserver(() => {
				if (this.$refs.editor && this.$refs.editor.clientHeight) {
					this.setContentDomSize();
				}
			});
			this.resizeObserver.observe(this.$refs.numWrap);
		},
		initEventBus() {
			this.initEventBusFn = {};
			EventBus.$on(
				'language-change',
				(this.initEventBusFn['language-change'] = (data) => {
					if (this.tabData.id === data.id) {
						if (this.active) {
							this.language = data.language;
						}
						this._language = data.language;
					}
				})
			);
			EventBus.$on(
				'tab-size-change',
				(this.initEventBusFn['tab-size-change'] = (tabSize) => {
					if (this.active) {
						this.tabSize = tabSize;
					}
				})
			);
			EventBus.$on(
				'indent-change',
				(this.initEventBusFn['indent-change'] = (indent) => {
					if (this.active) {
						this.indent = indent;
					}
				})
			);
			EventBus.$on(
				'convert-to-space',
				(this.initEventBusFn['convert-to-space'] = () => {
					if (this.active) {
						this.myContext.convertTabToSpace();
					}
				})
			);
			EventBus.$on(
				'convert-to-tab',
				(this.initEventBusFn['convert-to-tab'] = () => {
					if (this.active) {
						this.myContext.convertSpaceToTab();
					}
				})
			);
			EventBus.$on(
				'close-menu',
				(this.initEventBusFn['close-menu'] = () => {
					this.autoTipList = null;
					this.autocomplete.stop();
				})
			);
			EventBus.$on(
				'theme-changed',
				(this.initEventBusFn['theme-changed'] = (theme) => {
					if (this.active) {
						this.theme = theme;
					}
					this._theme = theme;
				})
			);
			EventBus.$on(
				'git-diff',
				(this.initEventBusFn['git-diff'] = (data) => {
					if (this.active && data && data.path === this.tabData.path) {
						this.differ.run();
					}
				})
			);
			EventBus.$on(
				'git-statused',
				(this.initEventBusFn['git-statused'] = (data) => {
					if (this.tabData.path === data.path) {
						let status = null;
						status = Util.getFileStatus(this.tabData.path);
						if (this.preStatus !== status.originStatus) {
							this.active && this.differ.run();
							this.preStatus = status.originStatus;
						}
					}
				})
			);
			EventBus.$on(
				'render-line',
				(this.initEventBusFn['render-line'] = (data) => {
					if (this.editorId === data.editorId) {
						this.renderLine(data.lineId);
					}
				})
			);
			EventBus.$on(
				'file-saved',
				(this.initEventBusFn['file-saved'] = (path) => {
					if (this.tabData.path === path) {
						this.history.save();
					}
				})
			);
			EventBus.$on(
				'file-opened',
				(this.initEventBusFn['file-opened'] = (path) => {
					if (this.tabData.path === path || this.tabData.tempPath === path) {
						this.history.clear();
					}
				})
			);
			EventBus.$on(
				'editor-format',
				(this.initEventBusFn['editor-format'] = (id) => {
					if (id === this.tabData.id) {
						this.formatter.run();
					}
				})
			);
			EventBus.$on(
				'editor-content-change',
				(this.initEventBusFn['editor-content-change'] = (data) => {
					if (data.id === this.tabData.id) {
						this.searchVisible && this.$refs.searchDialog.search();
						this.$refs.minimap && this.$refs.minimap.clearRenderTask();
						this.bracketMatch = null;
						this.setErrors([]);
						this.setAutoTip(null);
						this.render(true);
					}
				})
			);
			EventBus.$on('editor-size-change', this.initEventBusFn['editor-size-change'] = () => {
				if (this.$refs.scroller && this.$refs.scroller.clientHeight) {
					this.setPosition();
				}
			});
			EventBus.$on(
				'minimap-toggle',
				(this.initEventBusFn['minimap-toggle'] = () => {
					this.minimapVisible = !this.minimapVisible;
					if (this.active) {
						this.$nextTick(() => {
							this.$refs.minimap && this.$refs.minimap.renderAllDiff(true);
							this.render();
						});
					}
				})
			);
			EventBus.$on(
				'window-close',
				(this.initEventBusFn['window-close'] = () => {
					try {
						this.lint.worker && this.lint.worker.kill();
						this.formatter.worker && this.formatter.worker.kill();
					} catch (e) { }
				})
			);
		},
		unbindEvent() {
			$(document).unbind('mousemove', this.initEventFn1);
			$(document).unbind('mouseup', this.initEventFn2);
			EventBus.$off('language-change', this.initEventBusFn['language-change']);
			EventBus.$off('tab-size-change', this.initEventBusFn['tab-size-change']);
			EventBus.$off('indent-change', this.initEventBusFn['indent-change']);
			EventBus.$off('convert-to-tab', this.initEventBusFn['convert-to-tab']);
			EventBus.$off('convert-to-space', this.initEventBusFn['convert-to-space']);
			EventBus.$off('close-menu', this.initEventBusFn['close-menu']);
			EventBus.$off('theme-changed', this.initEventBusFn['theme-changed']);
			EventBus.$off('git-diff', this.initEventBusFn['git-diff']);
			EventBus.$off('git-statused', this.initEventBusFn['git-statused']);
			EventBus.$off('render-line', this.initEventBusFn['render-line']);
			EventBus.$off('file-saved', this.initEventBusFn['file-saved']);
			EventBus.$off('file-opened', this.initEventBusFn['file-opened']);
			EventBus.$off('editor-format', this.initEventBusFn['editor-format']);
			EventBus.$off('editor-content-change', this.initEventBusFn['editor-content-change']);
			EventBus.$off('editor-size-change', this.initEventBusFn['editor-size-change']);
			EventBus.$off('minimap-toggle', this.initEventBusFn['minimap-toggle']);
			EventBus.$off('window-close', this.initEventBusFn['window-close']);
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
			this.render();
			this.focus();
			if (this._nowCursorPos) {
				this.setNowCursorPos(this._nowCursorPos);
			}
			if (this.tabData.cursorPos) {
				//点击左侧文件内容搜索结果，跳转到相应位置
				this.cursor.setCursorPos(this.tabData.cursorPos);
				this.scrollToLine(this.tabData.cursorPos.line, this.tabData.cursorPos.column);
				delete this.tabData.cursorPos;
			}
			if (this.type === 'diff') {
				if (!this.showDiffed) {
					this.showDiff();
					this.showDiffed = false;
				}
			} else {
				// 获取文件git修改记录
				this.differ.run();
				this.preStatus = this.tabData.status;
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
		showScrollBar() {
			this.scrollVisible = true;
		},
		hideScrollBar() {
			this.scrollVisible = false;
		},
		// 聚焦
		focus() {
			cancelAnimationFrame(this.focusTimer);
			this.focusTimer = requestAnimationFrame(() => {
				this.$refs.textarea && this.$refs.textarea.focus();
			});
		},
		// 渲染
		render(scrollToCursor) {
			this.scrollToCursor = scrollToCursor;
			if (this.rendering) {
				return;
			}
			this.rendering = true;
			this.$nextTick(() => {
				this.rendering = null;
				this.renderLines();
				this.renderSelectedBg();
				this.renderError();
				this.renderCursor(this.scrollToCursor, false);
				this.$refs.minimap && this.$refs.minimap.render();
				this.renderedCb.forEach((cb) => {
					cb();
				});
				this.renderedCb.empty();
			});
		},
		// 渲染代码
		renderLines() {
			let toRnederNums = [];
			this.endLine = 0;
			this.renderedLineMap = {};
			this.renderedIdMap = {};
			this.renderNumsIdMap = {};
			for (let i = 0, startLine = this.startLine; i < this.maxVisibleLines && startLine <= this.myContext.htmls.length; i++) {
				let lineObj = this.myContext.htmls[startLine - 1];
				let obj = this.getRenderObj(lineObj, startLine);
				let fold = this.folder.getFoldByLine(startLine);
				toRnederNums.push(startLine);
				this.endLine = startLine;
				this.renderedLineMap[startLine] = obj;
				this.renderedIdMap[lineObj.lineId] = obj;
				if (fold) {
					startLine = fold.end.line;
				} else {
					startLine++;
				}
			}
			_setRenderObjs.call(this);

			function _setRenderObjs() {
				let renderNumMap = {};
				let renderNums = [];
				let preRenderObjs = this.renderObjs;
				this.renderObjs = [];
				this.renderNums = [];
				for (let index = 0; index < preRenderObjs.length; index++) {
					let item = preRenderObjs[index];
					if (this.renderedLineMap[item.num] && index < toRnederNums.length) {
						this.renderObjs[index] = this.renderedLineMap[item.num];
						this.renderedLineMap[item.num].index = index;
						renderNumMap[item.num] = true;
					}
				}
				for (let i = 0; i < toRnederNums.length; i++) {
					if (!renderNumMap[toRnederNums[i]]) {
						renderNums.push(toRnederNums[i]);
					}
				}
				renderNums.reverse();
				for (let index = 0; index < toRnederNums.length; index++) {
					let renderObj = this.renderObjs[index];
					if (!renderObj) {
						renderObj = this.renderedLineMap[renderNums.pop()];
						this.renderObjs[index] = renderObj;
						renderObj.index = index;
					}
					let numObj = {
						lineId: renderObj.lineId,
						num: renderObj.num,
						top: renderObj.top,
						fold: renderObj.fold,
					};
					this.renderNumsIdMap[renderObj.lineId] = numObj;
					this.renderNums.push(numObj)
				}
				this.setNumExtraData();
			}
		},
		// 渲染单行代码
		renderLine(lineId) {
			let renderObj = this.renderedIdMap[lineId];
			let numObj = this.renderNumsIdMap[lineId];
			if (renderObj) {
				let lineObj = this.myContext.htmls[renderObj.num - 1];
				if (lineObj && lineObj.lineId === lineId) {
					Object.assign(renderObj, this.getRenderObj(lineObj, renderObj.num));
					numObj.fold = renderObj.fold;
					this.$set(this.renderObjs, renderObj.index, renderObj);
					this.$set(this.renderNums, renderObj.index, numObj);
					this.renderSelectionToken(renderObj.num);
					this.renderError(renderObj.num);
				}
			}
		},
		renderSelectedBgAsync() {
			if (this.renderSelectedBgTimer) {
				return;
			}
			this.renderSelectedBgTimer = setTimeout(() => {
				this.renderSelectedBgTimer = null;
				this.renderSelectedBg(true);
				this.$refs.minimap && this.$refs.minimap.renderSelectedBg();
				this.$refs.minimap && this.$refs.minimap.renderAllSearchdBg();
			}, 15);
		},
		renderSelectedBg(isAsync) {
			clearTimeout(this.renderSelectedBgTimer);
			this.renderSelectedBgTimer = null;
			this.activeLineBg = true;
			this.clearSelectionToken();
			this._renderHighlight();
		},
		_renderHighlight() {
			let selectionNumMap = {};
			let renderedRangeMap = new Map();
			let lineObj = null;
			let renderObj = null;
			let selections = null;
			let fSelections = null;
			let range = null;
			let rangeKey = '';
			this.renderSelectionObjs = [];
			for (let i = 0; i < this.renderObjs.length; i++) {
				renderObj = this.renderObjs[i];
				selectionNumMap[renderObj.num] = { line: renderObj.num, top: renderObj.top, selections: [] };
				this.renderSelectionObjs.push(selectionNumMap[renderObj.num]);
			}
			for (let i = 0; i < this.renderObjs.length; i++) {
				renderObj = this.renderObjs[i];
				lineObj = this.myContext.htmls[renderObj.num - 1];
				if (this.searchVisible) {
					selections = this.selecter.getActiveRangeByLine(renderObj.num);
					fSelections = this.fSelecter.getRangeByLine(renderObj.num);
					for (let i = 0; i < selections.length; i++) {
						range = selections[i];
						rangeKey = range.start.line + ',' + range.start.column + ',' +
							range.end.line + ',' + range.end.column;
						if (!renderedRangeMap.has(rangeKey)) {
							this._renderRangeStartAndEnd(range, selectionNumMap);
							renderedRangeMap.set(rangeKey, true);
						}
					}
					for (let i = 0; i < fSelections.length; i++) {
						range = fSelections[i];
						rangeKey = range.start.line + ',' + range.start.column + ',' +
							range.end.line + ',' + range.end.column;
						if (!renderedRangeMap.has(rangeKey)) {
							this._renderRangeStartAndEnd(range, selectionNumMap, true);
							renderedRangeMap.set(rangeKey, true);
						}
					}
					if (!selections.length && !fSelections.length) {
						_renderLineSelection.call(this, renderObj.num);
					}
				} else {
					selections = this.selecter.getRangeByLine(renderObj.num);
					if (selections.length) {
						for (let i = 0; i < selections.length; i++) {
							range = selections[i];
							rangeKey = range.start.line + ',' + range.start.column + ',' +
								range.end.line + ',' + range.end.column;
							if (!renderedRangeMap.has(rangeKey)) {
								this._renderRangeStartAndEnd(range, selectionNumMap);
								renderedRangeMap.set(rangeKey, true);
							}
						}
					} else {
						_renderLineSelection.call(this, renderObj.num);
					}
				}
			}

			function _renderLineSelection(line) {
				let range = null;
				let lineObj = this.myContext.htmls[line - 1];
				range = this.selecter.getRangeWithCursorPos({ line: line, column: 0 });
				if (!range && this.searchVisible) {
					range = this.fSelecter.getRangeWithCursorPos({ line: line, column: 0 });
				}
				if (range) {
					let bgClass = [];
					range.active && bgClass.push('my-active');
					this.searchVisible && bgClass.push('my-search-bg');
					if (lineObj.width === undefined) {
						lineObj.width = this.getStrWidth(lineObj.text);
					}
					selectionNumMap[line].selections.push({
						bgClass: bgClass,
						bgStyle: { left: '0px', width: lineObj.width + 'px', height: this._lineHeight },
					});
				}
			}
		},
		// 渲染首尾行选中的背景
		_renderRangeStartAndEnd(range, selectionNumMap, isFsearch) {
			let start = range.start;
			let end = range.end;
			if (this.renderedLineMap[start.line]) {
				let text = this.myContext.htmls[start.line - 1].text;
				let endColumn = text.length;
				let renderObj = this.renderedLineMap[start.line];
				let bgClass = [];
				range.active && bgClass.push('my-active');
				isFsearch && bgClass.push('my-search-bg');
				if (start.startRenderObj) {
					start.startRenderObj.bgClass = bgClass;
				} else {
					let width = '';
					let left = this.getStrWidth(text, 0, start.column);
					if (start.line == end.line) {
						width = this.getStrWidth(text, start.column, end.column) || 10;
						width += 'px';
					} else {
						width = this.getStrWidth(text, start.column) || 10;
						width += 'px';
					}
					left += 'px';
					// 缓存结果对象
					start.startRenderObj = {
						bgClass: bgClass,
						bgStyle: { left: left, width: width, height: this._lineHeight },
					};
				}
				if (range.active) {
					if (this.nowCursorPos.line === start.line) {
						this.activeLineBg = false;
					}
					if (end.line == start.line) {
						endColumn = end.column;
						// range.active为false时，样式可能只显示边框，不改变字体颜色和背景
						this._renderSelectionToken(start.line, start.column, endColumn);
					}
				}
				selectionNumMap[start.line].selections.push(start.startRenderObj);
			}
			if (end.line > start.line && this.renderedLineMap[end.line]) {
				let renderObj = this.renderedLineMap[end.line];
				let bgClass = [];
				range.active && bgClass.push('my-active');
				isFsearch && bgClass.push('my-search-bg');
				if (end.endRenderObj) {
					end.endRenderObj.bgClass = bgClass;
				} else {
					let width = '';
					let text = this.myContext.htmls[end.line - 1].text;
					width = this.getStrWidth(text, 0, end.column) || 10;
					width += 'px';
					// 缓存结果对象
					end.endRenderObj = {
						bgClass: bgClass,
						bgStyle: { left: '0px', width: width, height: this._lineHeight },
					};
				}
				if (range.active) {
					if (this.nowCursorPos.line === end.line) {
						this.activeLineBg = false;
					}
					// range.active为false时，样式可能只显示边框，不改变字体颜色和背景
					this._renderSelectionToken(end.line, 0, end.column);
				}
				selectionNumMap[end.line].selections.push(end.endRenderObj);
			}
		},
		renderSelectionToken(line) {
			// 只有设置了选中前景色才处理
			if (!this.selectedFg) {
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
			if (!this.selectedFg) {
				return;
			}
			let lineObj = this.myContext.htmls[line - 1];
			let tokens = lineObj.tokens;
			let scopes = ['selected'];
			let _tokens = [];
			if (!tokens) {
				tokens = [{ startIndex: 0, endIndex: lineText.length, scopes: ['plain'] }];
				tokens = this.tokenizer.splitLongToken(tokens);
			}
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
			this.renderedIdMap[lineObj.lineId].html = lineObj.html;
			this.$nextTick(() => {
				lineObj.fgTokens = _tokens;
			});
		},
		renderBracketMatch() {
			// 光标位于选区边界，不做处理
			if (this.fSelecter.getActiveRangeByCursorPos(this.nowCursorPos) ||
				this.selecter.getActiveRangeByCursorPos(this.nowCursorPos)) {
				return;
			}
			cancelAnimationFrame(this.bracketMatchTimer);
			this.renderBracketMatchTask && globalData.scheduler.removeTask(this.renderBracketMatchTask.task);
			this.bracketMatchTimer = requestAnimationFrame(() => {
				let endPos = { line: this.maxLine, column: this.myContext.htmls[this.maxLine - 1].text.length };
				if (Util.comparePos(this.nowCursorPos, endPos) === 0) {
					return;
				}
				this.renderBracketMatchTask = this.folder.getBracketMatch(this.nowCursorPos, (bracketMatch) => {
					let lineObj = null;
					let startPos = null;
					let endPos = null;
					let range = bracketMatch && this.selecter.getRangeByCursorPos({ line: bracketMatch.start.line, column: bracketMatch.start.startIndex });
					range = range || (bracketMatch && this.selecter.getRangeByCursorPos({ line: bracketMatch.end.line, column: bracketMatch.end.startIndex }));
					if (bracketMatch && !range) {
						this.bracketMatch = bracketMatch;
						lineObj = this.myContext.htmls[this.bracketMatch.start.line - 1];
						startPos = this.bracketMatch.start;
						endPos = this.bracketMatch.end;
						startPos.left = this.getStrWidth(lineObj.text, 0, startPos.startIndex) + 'px';
						startPos.top = (this.folder.getRelativeLine(startPos.line) - 1) * this.charObj.charHight;
						if (this.bracketMatch.start.endIndex === this.bracketMatch.end.startIndex) {
							startPos.width = this.getStrWidth(lineObj.text, startPos.startIndex, endPos.endIndex) + 'px';
							this.bracketMatch.end = null;
						} else {
							startPos.width = this.getStrWidth(lineObj.text, startPos.startIndex, startPos.endIndex) + 'px';
							lineObj = this.myContext.htmls[this.bracketMatch.end.line - 1];
							endPos.width = this.getStrWidth(lineObj.text, endPos.startIndex, endPos.endIndex) + 'px';
							endPos.left = this.getStrWidth(lineObj.text, 0, endPos.startIndex) + 'px';
							endPos.top = (this.folder.getRelativeLine(endPos.line) - 1) * this.charObj.charHight;
						}
					}
				});
			});
		},
		// 清除选中前景色
		clearSelectionToken() {
			this.renderObjs.forEach((item) => {
				item.selected = false;
			});
			this.myContext.fgLines.forEach((line) => {
				this._clearSelectionToken(line);
			});
			this.myContext.fgLines.empty();
		},
		_clearSelectionToken(line) {
			let lineObj = this.myContext.htmls[line - 1];
			let renderObj = this.renderedLineMap[line];
			if (!lineObj || !lineObj.fgTokens) {
				return;
			}
			lineObj.fgTokens = null;
			if (renderObj) {
				renderObj.html = this.tokenizer.createHtml(lineObj.tokens, lineObj.text);
			}
			lineObj.html = '';
		},
		// 渲染光标
		renderCursor(scrollToCursor, isSync) {
			let cursorCount = 0;
			this.scrollToCursor = scrollToCursor;
			if (isSync) {
				if (this.renderCursorTimer) {
					cancelAnimationFrame(this.renderCursorTimer);
				}
				_renderCursor.call(this);
			} else {
				if (this.renderCursorTimer) {
					return;
				}
				this.renderCursorTimer = requestAnimationFrame(() => {
					_renderCursor.call(this);
				});
			}

			function _renderCursor() {
				this.renderCursorTimer = null;
				this.renderCursorObjs = [];
				this.cursorVisible = true;
				for (let i = 0; i < this.renderObjs.length; i++) {
					_setLine.call(this, this.renderObjs[i]);
					if (cursorCount >= this.cursor.multiCursorPos.size) {
						break;
					}
				}
				if (this.$refs.minimap) {
					if (this.renderMiniMapCursorTimer) {
						return;
					}
					this.renderMiniMapCursorTimer = setTimeout(() => {
						this.renderMiniMapCursorTimer = null;
						this.$refs.minimap.renderCursor();
						this.$refs.minimap.renderAllCursor();
					}, 30);
				}
			}

			function _setLine(item) {
				let cursorList = [];
				let list = this.cursor.getCursorsByLine(item.num);
				for (let i = 0; i < list.length; i++) {
					cursorList.push({ top: item.top, left: _setCursorRealPos.call(this, list[i]) });
					cursorCount++;
				}
				this.renderCursorObjs.push(cursorList);
			}

			function _setCursorRealPos(cursorPos) {
				let left = 0;
				if (cursorPos.del) {
					return;
				}
				left = this.getStrWidthByLine(cursorPos.line, 0, cursorPos.column);
				// 强制滚动使光标处于可见区域
				if (this.scrollToCursor && cursorPos === this.nowCursorPos) {
					if (left > this.scrollerArea.width + this.scrollLeft - this.charObj.fullCharWidth) {
						this.scrollLeft = left + this.charObj.fullCharWidth - this.scrollerArea.width;
					} else if (left < this.scrollLeft + this.charObj.fullCharWidth) {
						this.scrollLeft = left - this.charObj.fullCharWidth;
						this.scrollLeft = this.scrollLeft < 0 ? 0 : this.scrollLeft;
					}
				}
				if (cursorPos === this.nowCursorPos) {
					this.cursorLeft = left - this.scrollLeft;
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
				let left = 0;
				let lineObj = this.myContext.htmls[line - 1];
				let $content = $(this.$refs.content);
				let spans = $content.find(`div.my-code[data-line="${line}"]`).children('span');
				for (let i = 0; i < spans.length; i++) {
					let startIndex = spans[i].getAttribute('data-column');
					let endIndex = spans[i].getAttribute('data-end');
					if (startIndex <= column && endIndex >= endIndex) {
						left = spans[i].offsetLeft + this.getStrWidth(lineObj.text, startIndex, column);
						break;
					}
				}
				let width = this.getStrWidth(lineObj.text, column, endColumn) || this.charObj.charWidth;
				let html = `<span class="my-token-error" style="width:${width}px;left:${left}px" data-key="${key}"></span>`;
				$content.find(`div.my-line[data-line="${line}"]`).append(html);
			}

			function _renderLineError(line, key) {
				if (line < this.startLine || line >= this.startLine + this.maxVisibleLines || line > this.maxLine) {
					return;
				}
				let $content = $(this.$refs.content);
				let html = `<span class="my-token-error" style="width:100%;left:0px" data-key="${key}"></span>`;
				$content.find(`div.my-line[data-line="${line}"]`).append(html);
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
				this.$refs.minimap && this.$refs.minimap.renderAllDiff();
			}
		},
		// 展开折叠行
		unFold(line) {
			this.focus();
			if (this.folder.unFold(line)) {
				this.setContentHeight();
				this.render();
				this.$refs.minimap && this.$refs.minimap.renderAllDiff();
			}
		},
		// ctrl+f打开搜索
		openSearch(replaceMode) {
			let searchDialog = this.$refs.searchDialog;
			let data = { replaceVisible: !!replaceMode, matchCase: false, wholeWord: false };
			if (!this.searchVisible && this.searcher.hasCache()) { //复制已有结果到搜索框上下文
				let nowResult = this.fSearcher.clone(this.searcher.getCacheData());
				data.now = nowResult.now;
				data.count = nowResult.results.length;
				Object.assign(data, this.fSearcher.getSearchConfig());
				this.searcher.clearSearch();
			} else {
				if (this.cursorFocus) {
					let searchConfig = this.fSearcher.getSearchConfig();
					if (searchConfig && searchConfig.text !== searchDialog.text) {
						data.text = searchConfig.text;
					}
				}
				searchDialog.search();
			}
			this.searchVisible = true;
			searchDialog.initData(data);
			searchDialog.focus();
		},
		// 搜索完整单词
		searchWord(direct) {
			if (this.searchVisible) {
				this.$refs.searchDialog.searchWord(direct);
			} else {
				this.searcher.search({ direct: direct });
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
		moveSelection(autoDirect, speed, line) {
			let that = this;
			let originLine = line || this.folder.getRelativeLine(this.nowCursorPos.line);
			let originColumn = this.nowCursorPos.column;
			let count = 0; // 累计滚动距离
			speed = speed * 2;
			globalData.scheduler.removeUiTask(this.moveTask);
			this.moveTask = globalData.scheduler.addUiTask(() => {
				_run(autoDirect, speed);
			});

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
				that.mouseStartObj.preRange = that.selecter.setRange({
					start: that.mouseStartObj.start,
					end: { line: line, column: column },
					active: true
				});
			}
		},
		scrollToLine(line, column) {
			let scrollTop = (line - 1) * this.charObj.charHight - this.scrollerArea.height / 2;
			scrollTop = scrollTop > 0 ? scrollTop : 0;
			this.setStartLine(scrollTop);
			if (column !== undefined) {
				this.renderedCb.push(() => {
					this.$nextTick(() => {
						this.scrollToCol(line, column);
					});
				});
			}
		},
		scrollToCol(line, column) {
			let scrollLeft = this.getStrWidthByLine(line, 0, column) - this.scrollerArea.width / 2;
			scrollLeft = scrollLeft > 0 ? scrollLeft : 0;
			this.scrollLeft = scrollLeft;
		},
		setData(prop, value) {
			if (typeof this[prop] === 'function') {
				return;
			}
			this[prop] = value;
		},
		setDiffObjs(diffRanges) {
			this.diffRanges = diffRanges;
			this.$refs.minimap && this.$refs.minimap.renderAllDiff(true);
		},
		setNumExtraData() {
			this.renderNums = this.renderNums.map((item) => {
				if (this.type === 'diff') {
					item._num = item.num - this.diffObj.deletedLength > 0 ? item.num - this.diffObj.deletedLength + this.diffObj.beforeLine : '';
				} else {
					let preDiff = this.getPrevDiff(this.diffRanges, item.num);
					let type = (preDiff && gitTypeMap[preDiff.type]) || '';
					if (type === 'delete') {
						if (preDiff.line === item.num + 1) {
							type += '-bottom';
						} else {
							type += '-top';
						}
					}
					item.diffType = (type && 'my-diff-' + type) || '';
					item._num = item.num;
				}
				return item;
			});
		},
		setNowCursorPos(nowCursorPos) {
			if (!this.scrollerArea.height) {
				//DOM还未初始化
				this._nowCursorPos = nowCursorPos;
				return;
			}
			this._nowCursorPos = null;
			this.nowCursorPos = nowCursorPos || { line: 1, column: 0 };
			if (this.setNowCursorPosing) {
				return;
			}
			this.setNowCursorPosing = true;
			// 延时处理，等待设置contentHeight
			this.$nextTick(() => {
				this.setNowCursorPosing = false;
				this.cursorVisible = false;
				let height = this.folder.getRelativeLine(this.nowCursorPos.line + 1) * this.charObj.charHight;
				if (height > this.scrollTop + this.scrollerArea.height) {
					height = height > this.contentHeight ? this.contentHeight : height;
					this.setStartLine(height - this.scrollerArea.height, true);
				} else if (height < this.scrollTop + this.charObj.charHight) {
					let scrollTop = (this.folder.getRelativeLine(this.nowCursorPos.line) - 1) * this.charObj.charHight;
					this.setStartLine(scrollTop, true);
				} else {
					this.renderCursor(true);
				}
			});
		},
		setPosition() {
			let $parent = $(this.$refs.editor).parent();
			let $editor = $(this.$refs.editor);
			let $numWrap = $(this.$refs.numWrap);
			let $minimapWrap = $(this.$refs.minimapWrap);
			let offset = $parent.offset();
			let width = $parent[0].clientWidth;
			let height = $parent[0].clientHeight;
			$editor.css({
				left: offset.left + 'px',
				top: offset.top + 'px',
				width: width + 'px',
				height: height + 'px',
			});
			$numWrap.css({
				height: height + 'px',
			});
			$minimapWrap.css({
				width: width * 0.1 + 'px',
				height: height + 'px',
			});
			this.setContentDomSize();
			this.showEditor();
		},
		setContentDomSize() {
			let $parent = $(this.$refs.editor).parent();
			let $contentWrap = $(this.$refs.contentWrap);
			let numWrap = this.$refs.numWrap;
			let width = $parent[0].clientWidth;
			let height = $parent[0].clientHeight;
			let minimapWidth = this.$refs.minimapWrap;
			minimapWidth = minimapWidth && minimapWidth.clientWidth || 0;
			$contentWrap.css({
				left: numWrap.clientWidth,
				width: width - numWrap.clientWidth - minimapWidth + 'px',
				height: height + 'px',
			});
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
			if (this.scrollerArea.height) {
				if (this.type === 'diff') {
					contentHeight += 14;
				} else {
					contentHeight += this.scrollerArea.height - this.charObj.charHight;
				}
			}
			this.contentHeight = contentHeight;
		},
		setDiffTop() {
			let top = (this.folder.getRelativeLine(this.diffLine) - 1) * this.charObj.charHight - this.scrollTop;
			this.diffTop = top + this.diffMarginTop;
			if (this.diffTop - 30 < -this.scrollTop) {
				this.diffTop = -this.scrollTop + 30;
			}
		},
		setStartLine(scrollTop, scrollToCursor) {
			let startLine = 1;
			let maxScrollTop = this.contentHeight - this.scrollerArea.height;
			scrollTop = scrollTop < 0 ? 0 : scrollTop;
			maxScrollTop = maxScrollTop < 0 ? 0 : maxScrollTop;
			if (scrollTop > maxScrollTop) {
				scrollTop = maxScrollTop;
			}
			if (Math.abs(scrollTop - this.scrollTop) < 1) {
				return;
			}
			startLine = Math.floor(scrollTop / this.charObj.charHight);
			startLine++;
			this.deltaTop = Math.floor(scrollTop / this.maxContentHeight) * this.maxContentHeight;
			this.startLine = this.folder.getRealLine(startLine);
			this.scrollTop = scrollTop;
			this.diffLine && this.setDiffTop();
			this.tokenizer.tokenizeVisibleLins();
			this.render(scrollToCursor);
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
					this.autoTipStyle.top = this.folder.getRelativeLine(this.nowCursorPos.line) * this.charObj.charHight - this.deltaTop;
					this.autoTipStyle.left = this.getStrWidthByLine(this.nowCursorPos.line, 0, this.nowCursorPos.column);
					if (this.autoTipStyle.top + height > this.deltaTop + this.$refs.scroller.clientHeight) {
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
		getRenderObj(lineObj, line) {
			let tabNum = this.getTabNum(line);
			let tabLines = this.getTabLines(tabNum);
			let fold = '';
			let foldClass = '';
			let diffClass = '';
			let top = (this.folder.getRelativeLine(line) - 1) * this.charObj.charHight - this.deltaTop + 'px';
			if (this.folder.getFoldByLine(line)) {
				//该行已经折叠
				fold = 'close';
				foldClass = 'fold-close';
			} else if (this.folder.getRangeFold(line, true)) {
				//可折叠
				fold = 'open';
			}
			if (this.type === 'diff') {
				if (line > this.diffObj.deletedLength) {
					diffClass = 'my-diff-inserted';
				} else {
					diffClass = 'my-diff-removed';
				}
			}
			let html = lineObj.html;
			if (!html) {
				let tokens = lineObj.tokens && this.tokenizer.splitLongToken(lineObj.tokens);
				html = this.tokenizer.createHtml(tokens, lineObj.text);
				if (lineObj.tokens) {
					lineObj.tokens = tokens;
					lineObj.html = html;
				}
			}
			return {
				lineId: lineObj.lineId,
				html: html,
				num: line,
				top: top,
				tabNum: tabNum,
				tabLines: tabLines,
				fold: fold,
				foldClass: foldClass,
				diffClass: diffClass,
				isFsearch: false,
				selected: false,
				selection: [],
				cursorList: [],
			};
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
		getTabLines(tabNum) {
			if (tabLinesMap[tabNum]) {
				return tabLinesMap[tabNum];
			}
			let html = '';
			for (let tab = 1; tab <= tabNum; tab++) {
				let left = (tab - 1) * this.tabSize * this.charObj.fontSize * this.charObj.charScale + 'px';
				html += `<span style="left:${left}" class="my-indent"></span>`;
			}
			tabLinesMap[tabNum] = html;
			return html;
		},
		// 获取文本在浏览器中的宽度
		getStrWidth(str, start, end) {
			return Util.getStrWidth({ str, start, end, tabSize: this.tabSize, ...this.charObj });
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
			let endColumn = $target.attr('data-end');
			if (!line) {
				if (e.target === this.$refs.content || e.target.parentNode === this.$refs.content) {
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
				endColumn = endColumn - 0;
				column += this.getColumnByWidth(lineObj.text.slice(column, endColumn), e.offsetX);
			}
			return {
				line: line,
				column: column,
			};
		},
		// 获取光标真实位置
		getExactLeft(cursorPos) {
			let lineObj = this.myContext.htmls[cursorPos.line - 1];
			let spans = document.getElementById(this._lineId(cursorPos.line));
			let startIndex = 0;
			let span = null;
			let left = 0;
			let right = 0;
			spans = (spans && spans.querySelector('div.my-code').children) || [];
			right = spans.length - 1;
			while (left < right) {
				let mid = Math.ceil(left + right);
				let column = spans[mid].getAttribute('data-column');
				if (column > cursorPos.column) {
					right = mid - 1;
				} else {
					left = mid;
				}
			}
			span = spans[left];
			if (!span) {
				return 0;
			}
			startIndex = span.getAttribute('data-column');
			return span.offsetLeft + this.getStrWidth(lineObj.text.slice(startIndex, cursorPos.column));
		},
		getPrevDiff(diffRanges, line) {
			if (!diffRanges) {
				return null;
			}
			diffRanges.cache = diffRanges.cache || {};
			if (diffRanges.cache[line]) {
				return diffRanges.cache[line];
			}
			let result = null;
			for (let i = 0; i < diffRanges.length; i++) {
				let item = diffRanges[i];
				if (item.line <= line) {
					if (item.type === 'D') {
						if (item.line === line) {
							result = item;
							break;
						}
					} else if (item.line + item.added.length > line) {
						result = item;
						break;
					}
				} else {
					// 尾部的删除块
					if (item.line === line + 1 && line === this.maxLine) {
						result = item;
					} else {
						result = null;
					}
					break;
				}
			}
			diffRanges.cache[line] = result;
			return result;
		},
		// 右键菜单事件
		onContextmenu(e) {
			if (this.type === 'diff') {
				this.focus();
				return;
			}
			this.$refs.menu.show(e);
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
					this.searchWord('down');
				}
			}
			this.mouseStartObj.cursorPos = cursorPos;
			// 删除非活动区域的选中区域
			// this.searcher.clearSearch(true);
			this.focus();
		},
		onErrorMousemove(e, line) {
			let errors = document.getElementById(`${this._lineId(line)}`).querySelectorAll('span.my-token-error') || [];
			let left = e.clientX - $(this.$refs.content).offset().left;
			for (let i = 0; i < errors.length; i++) {
				let error = errors[i];
				let width = error.clientWidth;
				let _left = error.offsetLeft;
				if (left >= _left && left <= _left + width) {
					_showTip.call(this, e, error.getAttribute('data-key'));
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
							active: true
						});
					}
					// 删除区域范围内的光标
					this.cursor.removeCursorInRange(this.mouseStartObj.preRange);
				}
			}
			_checkErrorOver.call(this, e);

			function _checkErrorOver(e) {
				cancelAnimationFrame(this.checkErrorOverTimer);
				this.checkErrorOverTimer = requestAnimationFrame(() => {
					if (this.errors && this.errors.length) {
						let $target = $(e.target);
						let line = $target.parent().attr('data-line');
						this.tipContent = '';
						line && this.onErrorMousemove(e, line);
					}
				});
			}
		},
		onContentMLeave() {
			this.tipContent = '';
		},
		// 鼠标移动事件
		onDocumentMmove(e) {
			if (this.mouseStartObj && Date.now() - this.mouseStartObj.time > 100) {
				let offset = $(this.$refs.scroller).offset();
				let line = Math.ceil((this.scrollTop + e.clientY - offset.top) / this.charObj.charHight);
				line = line < 1 ? 1 : line;
				line = line > this.maxLine ? this.maxLine : line;
				if (e.clientY > offset.top + this.scrollerArea.height) {
					//鼠标超出底部区域
					this.moveSelection('down', e.clientY - offset.top - this.scrollerArea.height);
				} else if (e.clientY < offset.top) {
					//鼠标超出顶部区域
					this.moveSelection('up', offset.top - e.clientY);
				} else if (e.clientX < offset.left) {
					//鼠标超出左边区域
					this.moveSelection('left', offset.left - e.clientX, line);
				} else if (e.clientX > offset.left + this.scrollerArea.width) {
					//鼠标超出右边区域
					this.moveSelection('right', e.clientX - offset.left - this.scrollerArea.width, line);
				} else {
					globalData.scheduler.removeUiTask(this.moveTask);
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
		},
		// 鼠标抬起事件
		onDocumentMouseUp(e) {
			// 停止滚动选中
			globalData.scheduler.removeUiTask(this.moveTask);
			this.moveTask = null;
			this.mouseStartObj = null;
			this.diffBottomSashMouseObj = null;
			this.mouseUpTime = Date.now();
			this.$refs.searchDialog && this.$refs.searchDialog.directBlur();
		},
		// 调整diff弹框高度开始
		onDiffBottomSashBegin(e) {
			this.diffBottomSashMouseObj = e;
		},
		onScroll() {
			this.$refs.numScroller.scrollTop = 0;
			this.$refs.scroller.scrollTop = 0;
			this.$refs.scroller.scrollLeft = 0;
		},
		// 滚动滚轮
		onWheel(e) {
			this.scrollDeltaY = e.deltaY;
			this.scrollDeltaX = e.deltaX;
			this.wheelTime = Date.now();
			if ((this.scrollDeltaY || this.scrollDeltaX) && !this.wheelTask) {
				this.wheelTask = globalData.scheduler.addUiTask(() => {
					if (this.scrollDeltaY) {
						try {
							this.setStartLine(this.scrollTop + this.scrollDeltaY);
						} catch (e) {
							console.log(e);
						}
						this.scrollDeltaY = 0;
					} else if (this.scrollDeltaX) {
						let scrollLeft = this.scrollLeft + this.scrollDeltaX;
						if (scrollLeft > this._contentMinWidth - this.scrollerArea.width) {
							scrollLeft = this._contentMinWidth - this.scrollerArea.width;
						}
						scrollLeft = scrollLeft < 0 ? 0 : scrollLeft;
						this.scrollLeft = scrollLeft;
						this.scrollDeltaX = 0;
					} else if (Date.now() - this.wheelTime > 2000) {
						globalData.scheduler.removeUiTask(this.wheelTask);
						this.wheelTask = null;
					}
				});
			}
		},
		// 右侧滚动条滚动事件
		onVBarScroll(e) {
			this.setStartLine(e);
		},
		onHBarScroll(e) {
			this.scrollLeft = e;
		},
		// 中文输入开始
		onCompositionstart() {
			if (!this.editAble) {
				return;
			}
			clearTimeout(this.compositionendTimer);
			this.compositionstart = true;
			globalData.compositionstart = true;
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
				globalData.compositionstart = false;
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
		onShowDiff(line) {
			let preDiff = this.getPrevDiff(this.diffRanges, line);
			this.diffLine = line;
			this.diffVisible = false;
			this.diffMarginTop = 0;
			this.diffHeight = (preDiff.added.length + preDiff.deleted.length) * this.charObj.charHight + 16;
			this.diffHeight = this.diffHeight > 200 ? 200 : this.diffHeight;
			this.setDiffTop();
			this.$nextTick(() => {
				this.diffVisible = true;
				this.diffTabData = Object.assign({}, this.tabData);
				this.diffTabData.id = 'diff-' + this.tabData.id;
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
