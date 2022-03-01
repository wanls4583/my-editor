<template>
	<div
		:style="{'padding-top':_topBarHeight,'padding-bottom':_statusHeight}"
		@contextmenu.prevent="onContextmenu"
		@mousedown="onClickEditor"
		@selectstart.prevent
		@wheel.prevent="onWheel"
		class="my-editor-wrap"
		ref="editor"
	>
		<!-- 行号 -->
		<div :style="{top: _numTop}" class="my-editor-nums">
			<!-- 占位行号，避免行号宽度滚动时变化 -->
			<div class="my-editor-num" style="visibility:hidden">{{maxLine}}</div>
			<div
				:class="{'my-editor-num-active': _activeLine(line.num)}"
				:key="line.num"
				:style="{height:_lineHeight, 'line-height':_lineHeight}"
				class="my-editor-num"
				v-for="line in renderHtmls"
			>
				<span
					:class="[errorMap[line.num]?'my-editor-icon-error':'']"
					@mouseleave="onIconMouseLeave"
					@mouseover="onIconMouseOver(line.num, $event)"
					class="my-editor-icon my-editor-center"
				></span>
				<span>{{line.num}}</span>
				<!-- 折叠图标 -->
				<span
					:class="[line.fold=='open'?'my-editor-fold-open':'my-editor-fold-close']"
					@click="onToggleFold(line.num)"
					class="my-editor-fold my-editor-center"
					v-if="line.fold"
				></span>
			</div>
		</div>
		<div :style="{'box-shadow': _leftShadow}" class="my-editor-content-wrap">
			<!-- 可滚动区域 -->
			<div @mousedown="onScrollerMdown" @mouseup="onScrollerMup" class="my-editor-content-scroller" ref="scroller">
				<!-- 内如区域 -->
				<div :style="{top: _top, minWidth: _contentMinWidth}" @selectend.prevent="onSelectend" class="my-editor-content" ref="content">
					<div
						:class="{active: _activeLine(line.num)}"
						:data-line="line.num"
						:id="'line_'+line.num"
						:key="line.num"
						:style="{height:_lineHeight, 'line-height':_lineHeight}"
						class="my-editor-line"
						v-for="line in renderHtmls"
					>
						<!-- my-editor-select-bg为选中状态 -->
						<div
							:class="[line.selected ? 'my-editor-select-bg my-editor-select-active' : '', line.isFsearch ? 'my-editor-select-f' : '', line.fold == 'close' ? 'fold-close' : '']"
							:data-line="line.num"
							class="my-editor-code"
							v-html="line.html"
						></div>
						<!-- 选中时的首行背景 -->
						<div
							:class="{'my-editor-select-active': range.active,'my-editor-select-f': range.isFsearch}"
							:style="{left: range.left + 'px', width: range.width + 'px'}"
							class="my-editor-line-bg my-editor-select-bg"
							v-for="range in line.selectStarts"
						></div>
						<!-- 选中时的末行背景 -->
						<div
							:class="{'my-editor-select-active': range.active,'my-editor-select-f': range.isFsearch}"
							:style="{left: range.left + 'px', width: range.width + 'px'}"
							class="my-editor-line-bg my-editor-select-bg"
							v-for="range in line.selectEnds"
						></div>
						<span :style="{left: _tabLineLeft(tab)}" class="my-editor-tab-line" v-for="tab in line.tabNum"></span>
						<!-- 模拟光标 -->
						<div :style="{height: _lineHeight, left: left, visibility: _cursorVisible}" class="my-editor-cursor" style="top:0px" v-for="left in line.cursorList"></div>
					</div>
				</div>
			</div>
			<!-- 水平滚动条 -->
			<div @mousedown.stop @scroll="onHscroll" class="my-editor-h-scroller-wrap" ref="hScroller">
				<div :style="{width: _hScrollWidth}" class="my-editor-h-scroller"></div>
			</div>
			<!-- 垂直滚动条 -->
			<div @mousedown.stop @scroll="onVscroll" class="my-editor-v-scroller-wrap" ref="vScroller">
				<div :style="{height: scrollerHeight}" class="my-editor-v-scroller"></div>
			</div>
			<!-- 输入框 -->
			<textarea
				:style="{top: _textAreaPos.top, left: _textAreaPos.left}"
				@blur="onBlur"
				@compositionend="onCompositionend"
				@compositionstart="onCompositionstart"
				@copy.prevent="onCopy"
				@cut.prevent="onCut"
				@focus="onFocus"
				@input="onInput"
				@keydown="onKeyDown"
				@paste.prevent="onPaste"
				class="my-editor-textarea"
				ref="textarea"
			></textarea>
			<!-- 搜索框 -->
			<search-dialog
				:count="searchCount"
				:now="searchNow"
				@close="onCloseSearch"
				@next="onSearchNext"
				@prev="onSearchPrev"
				@replace="replace"
				@replaceAll="replaceAll"
				@search="onSearch"
				ref="searchDialog"
				v-show="searchVisible"
			></search-dialog>
		</div>
		<!-- 顶部菜单栏 -->
		<menu-bar :height="topBarHeight" ref="menuBar"></menu-bar>
		<!-- 状态栏 -->
		<status-bar :column="_nowColumn" :height="statusHeight" :language.sync="language" :line="_nowLine" :tabSize.sync="tabSize" ref="statusBar"></status-bar>
		<!-- 右键菜单 -->
		<Menu :checkable="false" :menuList="menuList" :styles="menuStyle" @change="onClickMenu" ref="menu" v-show="menuVisble"></Menu>
		<tip :content="tipContent" :styles="tipStyle" v-show="tipContent"></tip>
	</div>
</template>

<script>
import Tokenizer from '@/module/tokenizer/core/index';
import Lint from '@/module/lint/core/index';
import Fold from '@/module/fold/index';
import Search from '@/module/search/index';
import Select from '@/module/select/index';
import Cursor from '@/module/cursor/index';
import History from '@/module/history/index';
import Context from '@/module/context/index';
import ShortCut from '@/module/shortcut/index';
import MenuBar from './MenuBar';
import StatusBar from './StatusBar';
import SearchDialog from './Search';
import Menu from './Menu';
import Tip from './Tip';
import Util from '@/common/Util';
import $ from 'jquery';
let context = null;

export default {
    name: 'Home',
    components: {
        MenuBar,
        StatusBar,
        SearchDialog,
        Menu,
        Tip,
    },
    data() {
        return {
            charObj: {
                charWidth: 7.15,
                fullAngleCharWidth: 15,
                charHight: 19,
            },
            nowCursorPos: {
                line: 1,
                column: 0,
            },
            cursorVisible: true,
            cursorFocus: true,
            language: 'HTML',
            // language: 'JavaScript',
            // language: 'CSS',
            statusHeight: 23,
            topBarHeight: 28,
            tabSize: 4,
            renderHtmls: [],
            startLine: 1,
            startToEndToken: null,
            top: 0,
            textareaLeft: 0,
            scrollLeft: 0,
            scrollTop: 0,
            maxVisibleLines: 1,
            maxLine: 1,
            scrollerHeight: 'auto',
            scrollerArea: {},
            maxWidthObj: {
                lineId: null,
                text: '',
                width: 0
            },
            menuList: [[{
                name: 'Cut',
                op: 'cut',
                shortcut: 'Ctrl+X'
            }, {
                name: 'Copy',
                op: 'copy',
                shortcut: 'Ctrl+C'
            }, {
                name: 'Paste',
                op: 'paste',
                shortcut: 'Ctrl+V'
            }]],
            menuStyle: {
                top: '0px',
                left: '0px',
                'min-width': '200px'
            },
            tipStyle: {
                top: '0px',
                left: '0px'
            },
            errorMap: {},
            menuVisble: false,
            searchVisible: false,
            tipContent: false,
            tipContent: '',
            searchNow: 1,
            searchCount: 0
        }
    },
    computed: {
        _numTop() {
            return this.top - this.charObj.charHight + 'px';
        },
        _leftShadow() {
            return this.scrollLeft ? '17px 0 16px -16px rgba(0, 0, 0, 0.8) inset' : 'none';
        },
        _top() {
            return this.top + 'px';
        },
        _lineHeight() {
            return this.charObj.charHight + 'px';
        },
        _topBarHeight() {
            return this.topBarHeight + 'px';
        },
        _statusHeight() {
            return this.statusHeight + 4 + 'px';
        },
        _cursorVisible() {
            return this.cursorVisible && this.cursorFocus ? 'visible' : 'hidden';
        },
        _hScrollWidth() {
            return this._contentMinWidth;
        },
        _contentMinWidth() {
            let width = 0;
            if (this.$content) {
                width = Util.getStrExactWidth(this.maxWidthObj.text, this.tabSize, this.$content);
                width += this.charObj.fullAngleCharWidth;
            }
            width = this.scrollerArea.width > width ? this.scrollerArea.width : width;
            return width + 'px';
        },
        _textAreaPos() {
            let left = 0;
            let top = this.top;
            if (this.nowCursorPos) {
                top = (this.folder.getRelativeLine(this.nowCursorPos.line) - this.folder.getRelativeLine(this.startLine)) * this.charObj.charHight;
                left = this.textareaLeft;
                left -= this.scrollLeft;
                left = left < this.charObj.charWidth ? this.charObj.charWidth : left;
                left = left > this.scrollerArea.width - this.charObj.charWidth ? this.scrollerArea.width - this.charObj.charWidth : left;
                top += this.charObj.charHight;
                if (top > this.scrollerArea.height - 2 * this.charObj.charHight) {
                    top = this.scrollerArea.height - 2 * this.charObj.charHight;
                }
            }
            return {
                top: top + 'px',
                left: left + 'px'
            }
        },
        _tabLineLeft() {
            return (tab) => {
                return (tab - 1) * this.tabSize * this.charObj.charWidth + 'px';
            }
        },
        _activeLine() {
            return (num) => {
                return this.nowCursorPos && this.nowCursorPos.line == num;
            }
        },
        _nowLine() {
            return this.nowCursorPos && this.nowCursorPos.line || 1;
        },
        _nowColumn() {
            return this.nowCursorPos && this.nowCursorPos.column || 0;
        },
        space() {
            return Util.space(this.tabSize);
        }
    },
    watch: {
        language: function (newVal) {
            context.htmls.map((lineObj) => {
                lineObj.tokens = null;
                lineObj.folds = null;
                lineObj.states = null;
                lineObj.html = '';
            });
            this.render();
            this.tokenizer.initLanguage(newVal);
            this.tokenizer.tokenizeVisibleLins();
            this.tokenizer.tokenizeLines(1);
            this.lint.initLanguage(newVal);
        },
        tabSize: function (newVal) {
            this.render();
            this.maxWidthObj = { lineId: null, text: '', width: 0 };
            this.setLineWidth(context.htmls);
        },
        maxLine: function (newVal) {
            this.setScrollerHeight();
        },
        startLine: function (newVal) {
            this.tokenizer.onScroll();
            this.render();
        }
    },
    created() {
        this.initData();
        this.initEvent();
        window.editor = this;
        window.context = context;
    },
    mounted() {
        this.$editor = this.$refs.editor;
        this.$scroller = this.$refs.scroller;
        this.$content = this.$refs.content;
        this.$textarea = this.$refs.textarea;
        this.$vScroller = this.$refs.vScroller;
        this.$hScroller = this.$refs.hScroller;
        this.charObj = Util.getCharWidth(this.$content);
        this.maxVisibleLines = Math.ceil(this.$scroller.clientHeight / this.charObj.charHight) + 1;
        this.$refs.menuBar.initData(context);
        this.render();
        this.focus();
    },
    methods: {
        // 初始化数据
        initData() {
            context = new Context(this);
            this.maxWidthObj.lineId = context.htmls[0].lineId;
            this.tokenizer = new Tokenizer(this, context);
            this.lint = new Lint(this, context);
            this.folder = new Fold(this, context);
            this.history = new History(this, context);
            this.selecter = new Select(this, context);
            this.searcher = new Search(this, context, this.selecter);
            this.fSelecter = new Select(this, context);
            this.fSearcher = new Search(this, context, this.fSelecter);
            this.shortcut = new ShortCut(this, context);
            this.cursor = new Cursor(this, context);
            this.cursor.addCursorPos(this.nowCursorPos);
        },
        // 初始化文档事件
        initEvent() {
            $(document).on('mousemove', (e) => {
                this.onScrollerMmove(e);
            });
            $(document).on('mouseup', (e) => {
                this.onDocumentMouseUp(e);
            });
            $(window).on('resize', (e) => {
                this.render();
            });
        },
        // 显示光标
        showCursor() {
            this.cursorFocus = true;
            if (!this.cursor.multiCursorPos.length) {
                this.showCursor.show = false;
                return;
            }
            if (this.showCursor.show) {
                return;
            }
            this.showCursor.show = true;
            this.cursorVisible = true;
            let _timer = () => {
                clearTimeout(this.curserTimer);
                this.curserTimer = setTimeout(() => {
                    this.cursorVisible = !this.cursorVisible;
                    _timer();
                }, 500);
            }
            _timer();
        },
        // 隐藏光标
        hideCursor() {
            clearTimeout(this.curserTimer);
            this.showCursor.show = false;
            this.cursorFocus = false;
        },
        // 聚焦
        focus() {
            this.$textarea.focus();
            setTimeout(() => {
                setTimeout(() => {
                    this.$textarea.focus();
                }, 100);
            }, 100);
        },
        // 渲染
        render(forceCursorView) {
            let renderId = this.render.id + 1 || 1;
            this.render.id = renderId;
            this.$nextTick(() => {
                if (this.render.id !== renderId) {
                    return;
                }
                this.renderLine();
                this.renderSelectedBg();
                this.renderCursor(forceCursorView);
                this.$nextTick(() => {
                    this.scrollerArea = {
                        height: this.$scroller.clientHeight,
                        width: this.$scroller.clientWidth,
                    }
                });
            });
        },
        // 渲染代码
        renderLine(lineId) {
            let that = this;
            // 只更新一行
            if (lineId) {
                if (context.renderedIdMap.has(lineId)) {
                    let item = context.lineIdMap.get(lineId);
                    let obj = context.renderedIdMap.get(lineId);
                    // 高亮完成渲染某一行时，render可能还没完成，导致num没更新，此时跳过
                    if (context.htmls[obj.num - 1] && context.htmls[obj.num - 1].lineId === lineId) {
                        Object.assign(obj, _getObj(item, obj.num));
                        this.renderCursor();
                    }
                }
                return;
            }
            context.renderedIdMap.clear();
            context.renderedLineMap.clear();
            this.renderHtmls = [];
            for (let i = 0, startLine = this.startLine; i < this.maxVisibleLines && startLine <= context.htmls.length; i++) {
                let lineObj = context.htmls[startLine - 1];
                let lineId = lineObj.lineId;
                let obj = _getObj(lineObj, startLine);
                this.renderHtmls.push(obj);
                context.renderedIdMap.set(lineId, obj);
                context.renderedLineMap.set(startLine, obj);
                if (context.foldMap.has(startLine)) {
                    let fold = context.foldMap.get(startLine);
                    startLine = fold.end.line;
                } else {
                    startLine++;
                }
            }

            function _getObj(item, line) {
                let selected = false;
                let spaceNum = /^\s+/.exec(item.text);
                let tabNum = 0;
                let fold = '';
                let selectStarts = [];
                let selectEnds = [];
                if (spaceNum) {
                    tabNum = /\t+/.exec(spaceNum[0]);
                    tabNum = tabNum && tabNum[0].length || 0;
                    tabNum = tabNum + Math.ceil((spaceNum[0].length - tabNum) / that.tabSize);
                }
                if (context.foldMap.has(line)) { //该行已经折叠
                    fold = 'close';
                } else if (that.folder.getRangeFold(line, true)) { //可折叠
                    fold = 'open';
                }
                let html = item.html || Util.htmlTrans(item.text);
                html = html.replace(/\t/g, that.space);
                return {
                    html: html,
                    num: line,
                    tabNum: tabNum,
                    selectStarts: selectStarts,
                    selectEnds: selectEnds,
                    selected: selected,
                    fold: fold,
                    cursorList: [],
                }
            }
        },
        renderSelectedBg() {
            let renderSelectedBgId = this.renderSelectedBg.id + 1 || 1;
            this.renderSelectedBg.id = renderSelectedBgId;
            this.$nextTick(() => {
                if (this.renderSelectedBg.id != renderSelectedBgId) {
                    return;
                }
                if (!this.renderHtmls.length) { //删除内容后，窗口还没滚动到可视区域
                    requestAnimationFrame(() => {
                        this.renderSelectedBg();
                    });
                }
                this.renderHtmls.map((item) => {
                    item.selected = false;
                    item.selectStarts = [];
                    item.selectEnds = [];
                });
                this.fSelecter.selectedRanges.map((selectedRange) => {
                    this._renderSelectedBg(selectedRange, true);
                });
                this.selecter.selectedRanges.map((selectedRange) => {
                    let range = this.fSelecter.getRangeByCursorPos(selectedRange.start);
                    if (this.searchVisible) {
                        // 优先渲染搜索框的选中范围
                        if (!range || !range.active) {
                            this._renderSelectedBg(selectedRange);
                        }
                    } else {
                        this._renderSelectedBg(selectedRange);
                    }
                });
            });
        },
        // 渲染选中背景
        _renderSelectedBg(selectedRange, isFsearch) {
            let selecter = isFsearch ? this.fSelecter : this.selecter;
            let firstLine = this.renderHtmls[0].num;
            let lastLine = this.renderHtmls.peek().num;
            let start = selectedRange.start;
            let end = selectedRange.end;
            let text = context.htmls[start.line - 1].text;
            start.left = this.getStrWidth(text, 0, start.column);
            if (start.line == end.line) {
                start.width = this.getStrWidth(text, start.column, end.column);
            } else {
                start.width = this.getStrWidth(text, start.column);
                end.left = 0;
                text = context.htmls[end.line - 1].text;
                end.width = this.getStrWidth(text, 0, end.column);
            }
            firstLine = firstLine > start.line + 1 ? firstLine : start.line + 1;
            lastLine = lastLine < end.line - 1 ? lastLine : end.line - 1;
            for (let line = firstLine; line <= lastLine; line++) {
                if (context.renderedLineMap.has(line)) {
                    let lineObj = context.renderedLineMap.get(line);
                    lineObj.selected = true;
                    lineObj.isFsearch = isFsearch;
                }
            }
            if (context.renderedLineMap.has(start.line)) {
                context.renderedLineMap.get(start.line).selectStarts.push({
                    left: start.left,
                    width: start.width,
                    active: selectedRange.active,
                    isFsearch: isFsearch
                });
            }
            if (end.line > start.line && context.renderedLineMap.has(end.line)) {
                context.renderedLineMap.get(end.line).selectEnds.push({
                    left: end.left,
                    width: end.width,
                    active: selectedRange.active,
                    isFsearch: isFsearch
                });
            }
        },
        // 渲染光标
        renderCursor(forceCursorView) {
            let that = this;
            let renderCursorId = this.renderCursor.id + 1 || 1;
            this.renderCursor.id = renderCursorId;
            this.$nextTick(() => {
                if (this.renderCursor.id !== renderCursorId) {
                    return;
                }
                this.renderHtmls.map((item) => {
                    _setLine(item);
                });
                this.cursorVisible = true;
            });

            function _setLine(item) {
                let cursorList = [];
                that.cursor.getCursorsByLine(item.num).map((cursorPos) => {
                    cursorList.push(_setCursorRealPos(cursorPos));
                });
                item.cursorList = cursorList;
            }

            function _setCursorRealPos(cursorPos) {
                let left = 0;
                let lineObj = context.htmls[cursorPos.line - 1];
                if (cursorPos.del) {
                    return;
                }
                if ($('#line_' + cursorPos.line).length && lineObj.tokens && lineObj.tokens.length) {
                    left = _getExactLeft(cursorPos);
                } else {
                    left = that.getStrWidthByLine(cursorPos.line, 0, cursorPos.column);
                }
                // 强制滚动使光标处于可见区域
                if (forceCursorView && cursorPos === that.nowCursorPos) {
                    if (left > that.scrollerArea.width + that.scrollLeft - that.charObj.fullAngleCharWidth) {
                        that.$hScroller.scrollLeft = left + that.charObj.fullAngleCharWidth - that.scrollerArea.width;
                    } else if (left < that.scrollLeft) {
                        that.$hScroller.scrollLeft = left - 1;
                    }
                }
                if (cursorPos === that.nowCursorPos) {
                    that.textareaLeft = left;
                }
                return left + 'px';
            }

            function _getExactLeft(cursorPos) {
                let lineObj = context.htmls[cursorPos.line - 1];
                let token = lineObj.tokens[0];
                for (let i = 1; i < lineObj.tokens.length; i++) {
                    if (lineObj.tokens[i].column < cursorPos.column) {
                        token = lineObj.tokens[i];
                    } else {
                        break;
                    }
                }
                let $token = $('#line_' + cursorPos.line).
                    children('.my-editor-code').
                    children('span[data-column="' + token.column + '"]');
                if (!$token.length) {
                    return -1;
                }
                let text = token.value.slice(0, cursorPos.column - token.column);
                return $token[0].offsetLeft + that.getStrWidth(text);
            }
        },
        // 折叠行
        foldLine(line) {
            let resultFold = this.folder.foldLine(line);
            this.focus();
            if (resultFold) {
                this.cursor.multiCursorPos.map((cursorPos) => {
                    if (cursorPos.line > line && cursorPos.line < resultFold.end.line) {
                        let lineObj = context.htmls[line - 1];
                        cursorPos.line = line;
                        cursorPos.column = lineObj.text.length;
                    }
                });
                this.setScrollerHeight();
                this.render();
            }
        },
        // 展开折叠行
        unFold(line) {
            this.focus();
            if (this.folder.unFold(line)) {
                this.setScrollerHeight();
                this.render();
            }
        },
        // ctrl+f打开搜索
        openSearch(replaceMode) {
            let searchObj = context.getToSearchObj();
            let obj = {
                replaceVisible: !!replaceMode,
                searchText: searchObj.text,
                wholeWord: false,
                ignoreCase: false
            };
            if (this.searchVisible && !obj.text) {
                return;
            }
            this.searchVisible = true;
            this.$refs.searchDialog.initData(obj);
            this.$refs.searchDialog.search();
            this.$refs.searchDialog.focus();
        },
        // ctrl+d搜索完整单词
        searchWord(direct) {
            if (this.searchVisible) {
                let searchObj = context.getToSearchObj();
                if (searchObj.text) {
                    let $search = this.$refs.searchDialog;
                    if ($search.searchText != searchObj.text || !$search.wholeWord || !$search.ignoreCase) {
                        this.$refs.searchDialog.initData({
                            searchText: searchObj.text,
                            wholeWord: true,
                            ignoreCase: true
                        });
                        this.$refs.searchDialog.search();
                    } else {
                        direct === 'up' ? this.onSearchPrev() : this.onSearchNext();
                    }
                }
            }
            this.searcher.search(null, direct);
        },
        replace(data) {
            if (this.fSelecter.selectedRanges.length) {
                let selectedRange = this.fSelecter.selectedRanges[this.searchNow - 1];
                context.replace(data.text, [selectedRange]);
            }
        },
        replaceAll(data) {
            if (this.fSelecter.selectedRanges.length) {
                context.replace(data.text, this.fSelecter.selectedRanges.slice().sort((a, b) => {
                    if (a.start.line === b.start.line) {
                        return a.start.column - b.start.column;
                    }
                    return a.start.line - b.start.line;
                }));
                this.searchCount = 0;
            }
        },
        setData(prop, value) {
            if (typeof this[prop] === 'function') {
                return;
            }
            this[prop] = value;
        },
        setNowCursorPos(nowCursorPos) {
            this.nowCursorPos = nowCursorPos;
            if (nowCursorPos) {
                let setNowCursorPosId = this.setNowCursorPos.id + 1 || 1;
                this.setNowCursorPos.id = setNowCursorPosId;
                // 强制滚动使光标处于可见区域
                this.$nextTick(() => {
                    if (this.setNowCursorPos.id != setNowCursorPosId) {
                        return;
                    }
                    let line = this.folder.getRelativeLine(nowCursorPos.line);
                    let relTop = (line - this.folder.getRelativeLine(this.startLine)) * this.charObj.charHight;
                    let top = line * this.charObj.charHight;
                    if (top > this.scrollTop + this.scrollerArea.height - this.charObj.charHight) {
                        this.$vScroller.scrollTop = top + this.charObj.charHight - this.scrollerArea.height;
                        this.startLine = Math.floor(this.scrollTop / this.charObj.charHight);
                        this.startLine++;
                    } else if (relTop < 0 || relTop == 0 && this.top < 0) {
                        this.$vScroller.scrollTop = (nowCursorPos.line - 1) * this.charObj.charHight;
                        this.startLine = nowCursorPos.line;
                    }
                    this.renderCursor(true);
                });
            }
        },
        // 获取最大宽度
        setMaxWidth() {
            let maxWidthObj = { line: context.htmls[0].lineId, width: 0 };
            context.htmls.map((item) => {
                if (item.width > maxWidthObj.width) {
                    maxWidthObj = {
                        lineId: item.lineId,
                        text: item.text,
                        width: item.width
                    }
                }
            });
            this.maxWidthObj = maxWidthObj;
        },
        /**
         * 设置每行文本的宽度
         * @param {Array} texts
         */
        setLineWidth(texts) {
            let index = 0;
            let that = this;
            let startTime = Date.now();
            clearTimeout(this.setLineWidth.timer);
            _setLineWidth();

            function _setLineWidth() {
                while (index < texts.length) {
                    let lineObj = texts[index];
                    if (context.lineIdMap.has(lineObj.lineId)) {
                        let width = that.getStrWidth(lineObj.text);
                        lineObj.width = width;
                        if (width > that.maxWidthObj.width) {
                            that.maxWidthObj = {
                                lineId: lineObj.lineId,
                                text: lineObj.text,
                                width: width
                            }
                        }
                    }
                    index++;
                    if (Date.now() - startTime > 20) {
                        break;
                    }
                }
                if (index < texts.length) {
                    that.setLineWidth.timer = setTimeout(() => {
                        _setLineWidth();
                    }, 20);
                }
            }
        },
        // 设置滚动区域真实高度
        setScrollerHeight() {
            let maxLine = context.htmls.length;
            maxLine = this.folder.getRelativeLine(maxLine);
            this.scrollerHeight = maxLine * this.charObj.charHight + 'px';
        },
        setErrorMap(errorMap) {
            this.errorMap = errorMap;
        },
        // 获取文本在浏览器中的宽度
        getStrWidth(str, start, end) {
            return Util.getStrWidth(str, this.charObj.charWidth, this.charObj.fullAngleCharWidth, this.tabSize, start, end);
        },
        // 获取行对应的文本在浏览器中的宽度
        getStrWidthByLine(line, start, end) {
            return this.getStrWidth(context.htmls[line - 1].text, start, end);
        },
        // 根据文本宽度计算当前列号
        getColumnByWidth(text, offsetX) {
            let left = 0, right = text.length;
            let mid, width, w1, w2;
            while (left < right) {
                mid = Math.floor((left + right) / 2);
                width = this.getStrWidth(text, 0, mid);
                w1 = text[mid - 1] && this.getStrWidth(text[mid - 1]) / 2;
                w2 = text[mid] && this.getStrWidth(text[mid]) / 2 || w1;
                if (width >= offsetX && width - offsetX < w1 || offsetX >= width && offsetX - width < w2) {
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
            let that = this;
            let $target = $(e.target);
            if ($target.attr('data-line') || $target.attr('data-column')) {
                return _getExactPos(e);
            }
            let $scroller = $(this.$scroller);
            let offset = $scroller.offset();
            let column = 0;
            let clientX = e.clientX < 0 ? 0 : e.clientX;
            let clientY = e.clientY < 0 ? 0 : e.clientY;
            let line = Math.ceil((clientY + this.scrollTop - offset.top) / this.charObj.charHight) || 1;
            line = this.folder.getRealLine(line);
            if (line > context.htmls.length) {
                line = context.htmls.length;
                column = context.htmls[line - 1].text.length;
            } else {
                column = this.getColumnByWidth(context.htmls[line - 1].text, clientX + this.scrollLeft - offset.left);
            }
            return {
                line: line,
                column: column
            }

            function _getExactPos(e) {
                let $target = $(e.target);
                let line = $target.attr('data-line') - 0;
                let column = $target.attr('data-column');
                if (!line) {
                    line = $target.parent().attr('data-line') - 0;
                }
                let lineObj = context.htmls[line - 1];
                if (!column) {
                    column = lineObj.text.length;
                } else {
                    column = column - 0;
                    for (let i = 0; i < lineObj.tokens.length; i++) {
                        if (lineObj.tokens[i].column == column) {
                            column += that.getColumnByWidth(lineObj.tokens[i].value, e.offsetX);
                            break;
                        }
                    }
                }
                return {
                    line: line,
                    column: column
                }
            }
        },
        // 右键菜单事件
        onContextmenu(e) {
            let menuWidth = 0;
            let menuHeight = 0;
            let $editor = $(this.$editor);
            let offset = $editor.offset();
            this.menuVisble = true;
            this.$nextTick(() => {
                menuWidth = this.$refs.menu.$el.clientWidth;
                menuHeight = this.$refs.menu.$el.clientHeight;
                if (menuHeight + e.clientY > offset.top + this.scrollerArea.height) {
                    this.menuStyle.top = e.clientY - offset.top - menuHeight + 'px';
                } else {
                    this.menuStyle.top = e.clientY - offset.top + 'px';
                }
                if (menuWidth + e.clientX > offset.left + $editor[0].clientWidth) {
                    this.menuStyle.left = e.clientX - offset.left - menuWidth + 'px';
                } else {
                    this.menuStyle.left = e.clientX - offset.left + 'px';
                }
            });
        },
        // 选中菜单
        onClickMenu(menu) {
            switch (menu.op) {
                case 'cut':
                case 'copy':
                    Util.writeClipboard(context.getCopyText(menu.op === 'cut'));
                    break;
                case 'paste':
                    this.$textarea.focus();
                    Util.readClipboard().then((text) => {
                        context.insertContent(text);
                    });
                    break;
            }
            this.menuVisble = false;
            this.focus();
        },
        // 提示图标hover事件
        onIconMouseOver(line, e) {
            let $editor = $(this.$editor);
            let offset = $editor.offset();
            this.tipStyle = {
                left: e.clientX - offset.left + 10 + 'px',
                top: e.clientY - offset.top + 10 + 'px'
            }
            this.tipContent = this.errorMap[line];
        },
        onIconMouseLeave() {
            this.tipContent = '';
        },
        // 折叠/展开
        onToggleFold(line) {
            if (context.foldMap.has(line)) {
                this.unFold(line);
                return;
            } else {
                this.foldLine(line);
            }
        },
        // 点击编辑器
        onClickEditor() {
            this.$refs.statusBar.closeAllMenu();
            this.$refs.menuBar.closeAllMenu();
            this.menuVisble = false;
        },
        // 滚动区域鼠标按下事件
        onScrollerMdown(e) {
            if (e.which == 3) { //右键
                return;
            }
            let pos = this.getPosByEvent(e);
            this.cursor.setCursorPos(pos);
            this.focus();
            if (e.which != 3) {
                this.fSearcher.clearNow();
                this.searcher.clearSearch();
                if (this.mouseUpTime && Date.now() - this.mouseUpTime < 300) { //双击选中单词
                    this.searchWord();
                }
            }
            this.mouseStartObj = {
                time: Date.now(),
                start: pos
            }
        },
        onScrollerMup(e) {
            let end = this.getPosByEvent(e);
            if (this.mouseStartObj && Date.now() - this.mouseStartObj.time > 100 &&
                Util.comparePos(this.mouseStartObj.start, end) != 0) {
                return;
            }
        },
        // 鼠标移动事件
        onScrollerMmove(e) {
            let that = this;
            if (this.mouseStartObj && Date.now() - this.mouseStartObj.time > 100) {
                var offset = $(this.$scroller).offset();
                let end = this.getPosByEvent(e);
                this.cursor.setCursorPos(end);
                this.selecter.setSelectedRange(Object.assign({}, this.mouseStartObj.start), end);
                cancelAnimationFrame(this.selectMoveTimer);
                if (e.clientY > offset.top + this.scrollerArea.height) { //鼠标超出底部区域
                    _move('down', e.clientY - offset.top - this.scrollerArea.height);
                } else if (e.clientY < offset.top) { //鼠标超出顶部区域
                    _move('up', offset.top - e.clientY);
                } else if (e.clientX < offset.left) { //鼠标超出左边区域
                    _move('left', offset.left - e.clientX);
                } else if (e.clientX > offset.left + this.scrollerArea.width) { //鼠标超出右边区域
                    _move('right', e.clientX - offset.left - this.scrollerArea.width);
                }
            }
            function _move(autoDirect, speed) {
                let originLine = that.nowCursorPos.line;
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
                    line = line < 1 ? 1 : (line > context.htmls.length ? context.htmls.length : line);
                    column = column < 0 ? 0 : (column > context.htmls[originLine - 1].text.length ? context.htmls[originLine - 1].text.length : column);
                    that.cursor.setCursorPos({ line: line, column: column });
                    that.selecter.setSelectedRange(that.mouseStartObj.start, { line: line, column: column });
                    that.selectMoveTimer = requestAnimationFrame(() => {
                        _run(autoDirect, speed)
                    });
                }
            }
        },
        // 鼠标抬起事件
        onDocumentMouseUp(e) {
            let end = this.getPosByEvent(e);
            // 按下到抬起的间隔大于100ms，属于选中结束事件
            if (this.mouseStartObj && Date.now() - this.mouseStartObj.time > 100 &&
                Util.comparePos(this.mouseStartObj.start, end) != 0) {
                this.selecter.setSelectedRange(this.mouseStartObj.start, end);
                this.cursor.setCursorPos(end);
            }
            // 停止滚动选中
            cancelAnimationFrame(this.selectMoveTimer);
            this.mouseStartObj = null;
            this.mouseUpTime = Date.now();
            this.$refs.searchDialog.directBlur();
        },
        // 左右滚动事件
        onHscroll(e) {
            this.scrollLeft = e.target.scrollLeft;
            this.$scroller.scrollLeft = this.scrollLeft;
        },
        // 上下滚动事件
        onVscroll(e) {
            let startLine = 1;
            this.scrollTop = e.target.scrollTop;
            startLine = Math.floor(this.scrollTop / this.charObj.charHight);
            startLine++;
            this.startLine = this.folder.getRealLine(startLine);
            this.top = -this.scrollTop % this.charObj.charHight;
        },
        // 滚动滚轮
        onWheel(e) {
            this.$vScroller.scrollTop = this.scrollTop + e.deltaY;
            this.$hScroller.scrollLeft = this.scrollLeft + e.deltaX;
        },
        // 中文输入开始
        onCompositionstart() {
            clearTimeout(this.compositionendTimer);
            this.compositionstart = true;
        },
        // 中文输入结束
        onCompositionend() {
            if (this.compositionstart) {
                let text = this.$textarea.value || '';
                if (text) {
                    context.insertContent(text);
                    this.$textarea.value = '';
                }
            }
            //避免有些浏览器compositionend在input事件之前触发的bug
            this.compositionendTimer = setTimeout(() => {
                this.compositionstart = false;
            }, 100);
        },
        // 输入事件
        onInput() {
            if (!this.compositionstart) {
                let text = this.$textarea.value || '';
                if (text) {
                    context.insertContent(text);
                    this.$textarea.value = '';
                }
            }
        },
        // 复制事件
        onCopy(e) {
            let mime = window.clipboardData ? "Text" : "text/plain";
            let clipboardData = e.clipboardData || window.clipboardData;
            clipboardData.setData(mime, context.getCopyText());
        },
        onCut(e) {
            let mime = window.clipboardData ? "Text" : "text/plain";
            let clipboardData = e.clipboardData || window.clipboardData;
            clipboardData.setData(mime, context.getCopyText(true));
        },
        // 粘贴事件
        onPaste(e) {
            let mime = window.clipboardData ? "Text" : "text/plain";
            let clipboardData = e.clipboardData || window.clipboardData;
            let copyText = '';
            copyText = clipboardData.getData(mime);
            context.insertContent(copyText);
        },
        // 获得焦点
        onFocus() {
            clearTimeout(this.onBlur.timer);
            this.showCursor();
        },
        // 失去焦点
        onBlur() {
            this.onBlur.timer = setTimeout(() => {
                this.hideCursor();
            }, 300);
        },
        // 键盘按下事件
        onKeyDown(e) {
            this.shortcut.onKeyDown(e);
        },
        onSearch(data) {
            let resultObj = null;
            this.fSearcher.clearSearch();
            resultObj = this.fSearcher.search({
                text: data.text,
                wholeWord: data.wholeWord,
                ignoreCase: data.ignoreCase,
            });
            this.searchNow = resultObj.now;
            this.searchCount = resultObj.count;
            this.searcher.clearSearch();
        },
        onSearchNext() {
            if (this.fSearcher.hasCache()) {
                let resultObj = this.fSearcher.search();
                this.searchNow = resultObj.now;
                this.searchCount = resultObj.count;
            }
        },
        onSearchPrev() {
            if (this.fSearcher.hasCache()) {
                let resultObj = this.fSearcher.search(null, 'up');
                this.searchNow = resultObj.now;
                this.searchCount = resultObj.count;
            }
        },
        onCloseSearch() {
            this.searchVisible = false;
            this.fSearcher.clearSearch();
            this.focus();
        }
    }
}
</script>