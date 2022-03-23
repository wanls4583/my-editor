<template>
	<div @contextmenu.prevent.stop="onContextmenu" @selectstart.prevent @wheel.prevent="onWheel" class="my-wrap" ref="editor">
		<!-- 行号 -->
		<div :style="{top: _numTop}" class="my-nums" v-if="active">
			<!-- 占位行号，避免行号宽度滚动时变化 -->
			<div class="my-num" style="visibility:hidden">{{maxLine}}</div>
			<div
				:class="{'my-num-active': _activeLine(line.num)}"
				:key="line.num"
				:style="{height:_lineHeight, 'line-height':_lineHeight}"
				class="my-num"
				v-for="line in renderHtmls"
			>
				<span @mouseleave="onIconMouseLeave" @mouseover="onIconMouseOver(line.num, $event)" class="my-line-icon my-center">
					<i class="my-icon-error" style="margin-top:-2px" v-if="errorMap[line.num]"></i>
				</span>
				<span>{{line.num}}</span>
				<!-- 折叠图标 -->
				<span :class="[line.fold=='open'?'my-fold-open':'my-fold-close']" @click="onToggleFold(line.num)" class="my-fold my-center" v-if="line.fold"></span>
			</div>
		</div>
		<div :style="{'box-shadow': _leftShadow}" class="my-content-wrap">
			<!-- 可滚动区域 -->
			<div @scroll="onScroll" class="my-scroller" ref="scroller">
				<!-- 内如区域 -->
				<div
					:style="{minWidth: _contentMinWidth, height: contentHeight}"
					@mousedown="onContentMdown"
					@mousemove="onContentMmove"
					@selectend.prevent="onSelectend"
					class="my-content"
					ref="content"
				>
					<div :style="{top: _top}" class="my-render" ref="render" v-if="active">
						<div
							:class="{active: _activeLine(line.num)}"
							:data-line="line.num"
							:id="'line_'+line.num"
							:key="line.num"
							:style="{height:_lineHeight, 'line-height':_lineHeight}"
							class="my-line"
							v-for="line in renderHtmls"
						>
							<!-- my-select-bg为选中状态 -->
							<div
								:class="[line.selected ? 'my-select-bg my-select-active' : '', line.isFsearch ? 'my-select-f' : '', line.fold == 'close' ? 'fold-close' : '']"
								:data-line="line.num"
								class="my-code"
								v-html="line.html"
							></div>
							<!-- 选中时的首行背景 -->
							<div
								:class="{'my-select-active': range.active,'my-select-f': range.isFsearch}"
								:style="{left: range.left + 'px', width: range.width + 'px'}"
								class="my-line-bg my-select-bg"
								v-for="range in line.selectStarts"
							></div>
							<!-- 选中时的末行背景 -->
							<div
								:class="{'my-select-active': range.active,'my-select-f': range.isFsearch}"
								:style="{left: range.left + 'px', width: range.width + 'px'}"
								class="my-line-bg my-select-bg"
								v-for="range in line.selectEnds"
							></div>
							<span :style="{left: _tabLineLeft(tab)}" class="my-tab-line" v-for="tab in line.tabNum"></span>
							<!-- 模拟光标 -->
							<div :style="{height: _lineHeight, left: left, visibility: _cursorVisible}" class="my-cursor" style="top:0px" v-for="left in line.cursorList"></div>
						</div>
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
						class="my-textarea"
						ref="textarea"
					></textarea>
					<auto-tip :styles="autoTipStyle" :tipList="autoTipList" @change="onClickAuto" ref="autoTip"></auto-tip>
				</div>
			</div>
			<!-- 搜索框 -->
			<search-dialog
				:count="searchCount"
				:now="searchNow"
				@close="onCloseSearch"
				@next="onSearchNext(false)"
				@prev="onSearchPrev(false)"
				@replace="replace"
				@replaceAll="replaceAll"
				@search="onSearch"
				ref="searchDialog"
				v-show="searchVisible"
			></search-dialog>
		</div>
		<!-- 右键菜单 -->
		<Menu :checkable="false" :menuList="menuList" :styles="menuStyle" @change="onClickMenu" ref="menu" v-show="menuVisible"></Menu>
		<tip :content="tipContent" :styles="tipStyle" ref="tip" v-show="tipContent"></tip>
	</div>
</template>

<script>
import Tokenizer from '@/module/tokenizer/core/index';
import Lint from '@/module/lint/core/index';
import Autocomplete from '@/module/autocomplete/core/index';
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
import Util from '@/common/Util';
import $ from 'jquery';
const contexts = Context.contexts;

export default {
    name: 'Editor',
    components: {
        SearchDialog,
        Menu,
        AutoTip,
        Tip,
    },
    props: {
        id: {
            type: Number
        },
        active: {
            type: Boolean,
            default: false
        }
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
            // language: '',
            tabSize: 4,
            renderHtmls: [],
            startLine: 1,
            startToEndToken: null,
            top: 0,
            cursorLeft: 0,
            scrollLeft: 0,
            scrollTop: 0,
            maxVisibleLines: 1,
            maxLine: 1,
            contentHeight: '100%',
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
            autoTipStyle: {
                top: '0px',
                left: '0px'
            },
            errorMap: {},
            autoTipList: [],
            tipContent: null,
            menuVisible: false,
            searchVisible: false,
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
            return (this.folder.getRelativeLine(this.startLine) - 1) * this.charObj.charHight + 'px';
        },
        _lineHeight() {
            return this.charObj.charHight + 'px';
        },
        _cursorVisible() {
            return this.cursorVisible && this.cursorFocus ? 'visible' : 'hidden';
        },
        _hScrollWidth() {
            return this._contentMinWidth;
        },
        _contentMinWidth() {
            let width = 0;
            if (this.$refs.content) {
                width = Util.getStrExactWidth(this.maxWidthObj.text, this.tabSize, this.$refs.content);
                width += this.charObj.fullAngleCharWidth;
            }
            width = this.scrollerArea.width > width ? this.scrollerArea.width : width;
            return width + 'px';
        },
        _textAreaPos() {
            let left = this.cursorLeft;
            let top = this.top;
            if (this.nowCursorPos) {
                let line = this.nowCursorPos.line < this.startLine ? this.startLine : this.nowCursorPos.line;
                top = this.folder.getRelativeLine(line) * this.charObj.charHight;
                if (top > this.scrollTop + this.scrollerArea.height - 2 * this.charObj.charHight) {
                    top = this.scrollTop + this.scrollerArea.height - 2 * this.charObj.charHight;
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
        },
        myContext() {
            return contexts[this.id];
        }
    },
    watch: {
        language: function (newVal) {
            this.myContext.htmls.forEach((lineObj) => {
                lineObj.tokens = null;
                lineObj.folds = null;
                lineObj.states = null;
                lineObj.html = '';
            });
            this.render();
            this.lint.initLanguage(newVal);
            this.tokenizer.initLanguage(newVal);
            this.tokenizer.tokenizeVisibleLins();
            this.tokenizer.tokenizeLines(1);
        },
        tabSize: function (newVal) {
            this.render();
            this.maxWidthObj = { lineId: null, text: '', width: 0 };
            this.myContext.setLineWidth(this.myContext.htmls);
        },
        maxLine: function (newVal) {
            this.setContentHeight();
        },
        startLine: function (newVal) {
            this.tokenizer.onScroll();
            this.render();
        },
        nowCursorPos: {
            handler: function (newVal) {
                let statusBar = this.$parent.$refs.statusBar;
                if (newVal) {
                    statusBar.setLine(newVal.line);
                    statusBar.setLine(newVal.column);
                } else {
                    statusBar.setLine('?');
                    statusBar.setLine('?');
                }
            },
            deep: true
        },
        active: function (newVal) {
            if (newVal) {
                this.showEditor();
            } else {
                this.autocomplete.clearSearch();
            }
        }
    },
    created() {
        this.initData();
        this.initEvent();
    },
    mounted() {
        this.showEditor();
    },
    destroyed() {
        this.unbindEvent();
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
        unbindEvent() {
            $(document).unbind('mousemove', this.initEvent.fn1);
            $(document).unbind('mouseup', this.initEvent.fn2);
        },
        showEditor() {
            if (this.active) {
                this.$nextTick(() => {
                    this.charObj = Util.getCharWidth(this.$refs.content);
                    this.maxVisibleLines = Math.ceil(this.$refs.scroller.clientHeight / this.charObj.charHight) + 1;
                    this.render();
                    this.focus();
                });
            }
        },
        // 显示光标
        showCursor() {
            this.cursorFocus = true;
            if (!this.cursor.multiCursorPos.size) {
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
            this.closeAllMenu();
        },
        // 聚焦
        focus() {
            this.$refs.textarea.focus();
            setTimeout(() => {
                setTimeout(() => {
                    this.$refs.textarea.focus();
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
                        height: this.$refs.scroller.clientHeight,
                        width: this.$refs.scroller.clientWidth,
                    }
                });
            });
        },
        // 渲染代码
        renderLine(lineId) {
            let that = this;
            // 只更新一行
            if (lineId) {
                if (this.myContext.renderedIdMap.has(lineId)) {
                    let item = this.myContext.lineIdMap.get(lineId);
                    let obj = this.myContext.renderedIdMap.get(lineId);
                    // 高亮完成渲染某一行时，render可能还没完成，导致num没更新，此时跳过
                    if (this.myContext.htmls[obj.num - 1] && this.myContext.htmls[obj.num - 1].lineId === lineId) {
                        Object.assign(obj, _getObj(item, obj.num));
                        this.renderCursor();
                        this.renderSelectedBg();
                    }
                }
                return;
            }
            this.myContext.renderedIdMap.clear();
            this.myContext.renderedLineMap.clear();
            this.renderHtmls = [];
            for (let i = 0, startLine = this.startLine; i < this.maxVisibleLines && startLine <= this.myContext.htmls.length; i++) {
                let lineObj = this.myContext.htmls[startLine - 1];
                let lineId = lineObj.lineId;
                let obj = _getObj(lineObj, startLine);
                let fold = this.folder.getFoldByLine(startLine);
                this.renderHtmls.push(obj);
                this.myContext.renderedIdMap.set(lineId, obj);
                this.myContext.renderedLineMap.set(startLine, obj);
                if (fold) {
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
                if (that.folder.getFoldByLine(line)) { //该行已经折叠
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
                    return;
                }
                this.renderHtmls.forEach((item) => {
                    item.selected = false;
                    item.selectStarts = [];
                    item.selectEnds = [];
                });
                this.fSelecter.ranges.forEach((range) => {
                    this._renderSelectedBg(range, true);
                });
                this.selecter.ranges.forEach((range) => {
                    let _range = this.fSelecter.getRangeByCursorPos(range.start);
                    if (this.searchVisible) {
                        // 优先渲染搜索框的选中范围
                        if (!_range || !_range.active) {
                            this._renderSelectedBg(range);
                        }
                    } else {
                        this._renderSelectedBg(range);
                    }
                });
            });
        },
        // 渲染选中背景
        _renderSelectedBg(range, isFsearch) {
            let selecter = isFsearch ? this.fSelecter : this.selecter;
            let firstLine = this.renderHtmls[0].num;
            let lastLine = this.renderHtmls.peek().num;
            let start = range.start;
            let end = range.end;
            let text = this.myContext.htmls[start.line - 1].text;
            start.left = this.getStrWidth(text, 0, start.column);
            if (start.line == end.line) {
                start.width = this.getStrWidth(text, start.column, end.column);
            } else {
                start.width = this.getStrWidth(text, start.column);
                end.left = 0;
                text = this.myContext.htmls[end.line - 1].text;
                end.width = this.getStrWidth(text, 0, end.column);
            }
            firstLine = firstLine > start.line + 1 ? firstLine : start.line + 1;
            lastLine = lastLine < end.line - 1 ? lastLine : end.line - 1;
            for (let line = firstLine; line <= lastLine; line++) {
                if (this.myContext.renderedLineMap.has(line)) {
                    let lineObj = this.myContext.renderedLineMap.get(line);
                    lineObj.selected = true;
                    lineObj.isFsearch = isFsearch;
                }
            }
            if (this.myContext.renderedLineMap.has(start.line)) {
                this.myContext.renderedLineMap.get(start.line).selectStarts.push({
                    left: start.left,
                    width: start.width,
                    active: range.active,
                    isFsearch: isFsearch
                });
            }
            if (end.line > start.line && this.myContext.renderedLineMap.has(end.line)) {
                this.myContext.renderedLineMap.get(end.line).selectEnds.push({
                    left: end.left,
                    width: end.width,
                    active: range.active,
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
                if (this.renderCursor.id !== renderCursorId || !this.renderHtmls.length) {
                    return;
                }
                this.renderHtmls.forEach((item) => {
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
                let lineObj = that.myContext.htmls[cursorPos.line - 1];
                if (cursorPos.del) {
                    return;
                }
                // if ($('#line_' + cursorPos.line).length && lineObj.tokens && lineObj.tokens.length) {
                //     left = that.getExactLeft(cursorPos);
                // } else {
                //     left = that.getStrWidthByLine(cursorPos.line, 0, cursorPos.column);
                // }
                left = that.getExactLeft(cursorPos);
                // 强制滚动使光标处于可见区域
                if (forceCursorView && cursorPos === that.nowCursorPos) {
                    if (left > that.scrollerArea.width + that.scrollLeft - that.charObj.fullAngleCharWidth) {
                        that.$refs.scroller.scrollLeft = left + that.charObj.fullAngleCharWidth - that.scrollerArea.width;
                    } else if (left < that.scrollLeft) {
                        that.$refs.scroller.scrollLeft = left - 1;
                    }
                }
                if (cursorPos === that.nowCursorPos) {
                    that.cursorLeft = left;
                }
                return left + 'px';
            }
        },
        closeAllMenu() {
            this.menuVisible = false;
            this.autoTipList = null;
            this.autocomplete.clearSearch();
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
            let searchConfig = this.myContext.getToSearchConfig();
            let obj = {
                replaceVisible: !!replaceMode,
                wholeWord: false,
                ignoreCase: false
            };
            if (searchConfig.text) {
                obj.searchText = searchConfig.text;
            }
            if (this.searchVisible && !obj.text) {
                return;
            }
            this.searchVisible = true;
            this.cursorFocus = false;
            this.$refs.searchDialog.initData(obj);
            this.$refs.searchDialog.focus();
        },
        // ctrl+d搜索完整单词
        searchWord(direct) {
            this.searcher.search({ direct: direct });
            if (this.searchVisible) {
                let searchConfig = this.searcher.getConfig();
                if (searchConfig && searchConfig.text) {
                    let $search = this.$refs.searchDialog;
                    if ($search.searchText != searchConfig.text || !$search.wholeWord || !$search.ignoreCase) {
                        let config = {
                            searchText: searchConfig.text,
                            wholeWord: true,
                            ignoreCase: true
                        }
                        $search.initData(config);
                    } else {
                        direct === 'up' ? this.onSearchPrev() : this.onSearchNext();
                    }
                }
            }
        },
        replace(data) {
            if (this.fSelecter.ranges.size) {
                let range = this.fSearcher.now();
                this.myContext.replace(data.text, [range]);
            }
        },
        replaceAll(data) {
            if (this.fSelecter.ranges.size) {
                this.myContext.replace(data.text, this.fSelecter.ranges.toArray());
                this.searchCount = 0;
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
            this.nowCursorPos = nowCursorPos;
            if (nowCursorPos) {
                let setNowCursorPosId = this.setNowCursorPos.id + 1 || 1;
                this.setNowCursorPos.id = setNowCursorPosId;
                // 强制滚动使光标处于可见区域
                this.$nextTick(() => {
                    if (this.setNowCursorPos.id != setNowCursorPosId) {
                        return;
                    }
                    let height = this.folder.getRelativeLine(nowCursorPos.line) * this.charObj.charHight;
                    if (height > this.scrollTop + this.scrollerArea.height) {
                        requestAnimationFrame(() => {
                            this.setStartLine(height - this.scrollerArea.height);
                            this.$refs.scroller.scrollTop = height - this.scrollerArea.height;
                        });
                    } else if (nowCursorPos.line <= this.startLine) {
                        requestAnimationFrame(() => {
                            if (nowCursorPos.line <= this.startLine) { //此时this.startLine可能已经通过onScrll而改变
                                this.startLine = nowCursorPos.line;
                                this.$refs.scroller.scrollTop = (this.folder.getRelativeLine(nowCursorPos.line) - 1) * this.charObj.charHight;
                            }
                        });
                    }
                    this.renderCursor(true);
                });
            }
        },
        // 设置滚动区域真实高度
        setContentHeight() {
            let maxLine = this.myContext.htmls.length;
            maxLine = this.folder.getRelativeLine(maxLine);
            this.contentHeight = maxLine * this.charObj.charHight + 'px';
        },
        setStartLine(scrollTop) {
            let startLine = 1;
            startLine = Math.floor(scrollTop / this.charObj.charHight);
            startLine++;
            this.startLine = this.folder.getRealLine(startLine);
            this.top = -scrollTop % this.charObj.charHight;
        },
        setErrorMap(errorMap) {
            this.errorMap = errorMap;
        },
        setAutoTip(results) {
            clearTimeout(this.setAutoTip.hideTimer);
            if (results && results.length) {
                results.forEach((item) => {
                    item.active = false;
                });
                this.autoTipList = results;
                this.autoTipList[0].active = true;
                let width = this.$refs.autoTip.clientWidth;
                let height = this.$refs.autoTip.clientHeight;
                this.autoTipStyle.top = this.folder.getRelativeLine(this.nowCursorPos.line) * this.charObj.charHight;
                this.autoTipStyle.left = this.getExactLeft(this.nowCursorPos);
                if (this.autoTipStyle.top + height > Util.getNum(this._top) + this.$refs.render.clientHeight) {
                    this.autoTipStyle.top -= height + this.charObj.charHight;
                }
                if (this.autoTipStyle.left + width > this.scrollLeft + this.scrollerArea.width) {
                    this.autoTipStyle.left -= width;
                }
                this.autoTipStyle.top += 'px';
                this.autoTipStyle.left += 'px';
            } else {
                //内容改变时会触发setAutoTip(null)
                this.setAutoTip.hideTimer = setTimeout(() => {
                    this.autoTipList = null;
                }, 0);
            }
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
            let $target = $(e.target);
            let line = ($target.attr('data-line') || $target.parent().attr('data-line')) - 0;
            let column = $target.attr('data-column');
            if (!line) {
                if (e.target === this.$refs.content) {
                    line = this.myContext.htmls.length;
                } else { //移动到了区域外
                    return null;
                }
            }
            let lineObj = this.myContext.htmls[line - 1];
            if (!column) {
                column = lineObj.text.length;
            } else {
                column = column - 0;
                for (let i = 0; i < lineObj.tokens.length; i++) {
                    if (lineObj.tokens[i].column == column) {
                        column += this.getColumnByWidth(lineObj.tokens[i].value, e.offsetX);
                        break;
                    }
                }
            }
            return {
                line: line,
                column: column
            }
        },
        // 获取光标真实位置
        getExactLeft(cursorPos) {
            let lineObj = this.myContext.htmls[cursorPos.line - 1];
            if (!lineObj.tokens || !lineObj.tokens.length) {
                return 0;
            }
            let token = lineObj.tokens[0];
            for (let i = 1; i < lineObj.tokens.length; i++) {
                if (lineObj.tokens[i].column < cursorPos.column) {
                    token = lineObj.tokens[i];
                } else {
                    break;
                }
            }
            let $token = $('#line_' + cursorPos.line).
                children('.my-code').
                children('span[data-column="' + token.column + '"]');
            if (!$token.length) {
                return 0;
            }
            let text = token.value.slice(0, cursorPos.column - token.column);
            return $token[0].offsetLeft + this.getStrWidth(text);
        },
        // 右键菜单事件
        onContextmenu(e) {
            let menuWidth = 0;
            let menuHeight = 0;
            let $editor = $(this.$refs.editor);
            let offset = $editor.offset();
            this.menuVisible = true;
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
                this.focus();
            });
        },
        // 选中菜单
        onClickMenu(menu) {
            switch (menu.op) {
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
            let word = this.autocomplete.getNowWord(this.nowCursorPos);
            let ranges = [];
            this.cursor.multiCursorPos.forEach((item) => {
                ranges.push({
                    start: {
                        line: item.line,
                        column: item.column - word.length
                    },
                    end: {
                        line: item.line,
                        column: item.column
                    }
                });
            });
            this.myContext.replace(item.result, ranges);
            this.autoTipList = null;
            this.focus();
        },
        // 提示图标hover事件
        onIconMouseOver(line, e) {
            let $editor = $(this.$refs.editor);
            let $tip = $(this.$refs.tip.$el);
            let offset = $editor.offset();
            let top = e.clientY - offset.top + 10;
            this.tipContent = this.errorMap[line];
            this.$nextTick(() => {
                if (top + $tip[0].clientHeight > this.scrollerArea.height) {
                    top = this.scrollerArea.height - $tip[0].clientHeight;
                }
                this.tipStyle = {
                    left: e.clientX - offset.left + 10 + 'px',
                    top: top + 'px'
                }
            });
        },
        onIconMouseLeave() {
            this.tipContent = null;
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
            if (e.which == 3) { //右键
                return;
            }
            let pos = this.getPosByEvent(e);
            let cursorPos = null;
            let range = null;
            this.mouseStartObj = {
                time: Date.now(),
                start: pos,
            }
            if (e.ctrlKey && this.cursor.multiKeyCode === 'ctrl' ||
                e.altKey && this.cursor.multiKeyCode === 'alt') {
                let range = this.selecter.getRangeWithCursorPos(pos);
                if (range) { //删除选中范围
                    this.selecter.removeRange(range);
                }
                cursorPos = this.cursor.addCursorPos(pos);
            } else {
                cursorPos = this.cursor.setCursorPos(pos);
                if (e.which !== 3) {
                    this.searcher.clearSearch();
                }
            }
            if (e.which != 3) {
                this.fSearcher.clearNow();
                if (this.mouseUpTime && Date.now() - this.mouseUpTime < 200) { //双击选中单词
                    this.mouseStartObj.doubleClick = true;
                    this.searchWord();
                }
            }
            this.mouseStartObj.cursorPos = cursorPos;
            this.searcher.clearSearch(true);
            this.focus();
        },
        onContentMmove(e) {
            if (this.mouseStartObj && Date.now() - this.mouseStartObj.time > 100) {
                let end = this.getPosByEvent(e);
                if (end && Util.comparePos(end, this.mouseStartObj.cursorPos)) {
                    this.cursor.removeCursor(this.mouseStartObj.cursorPos);
                    this.mouseStartObj.cursorPos = this.cursor.addCursorPos({ line: end.line, column: end.column });
                    if (this.mouseStartObj.preRange) {
                        this.selecter.updateRange(this.mouseStartObj.preRange, {
                            start: this.mouseStartObj.start,
                            end: end
                        });
                    } else {
                        this.mouseStartObj.preRange = this.selecter.addRange({
                            start: this.mouseStartObj.start,
                            end: end
                        });
                    }
                    // 删除区域范围内的光标
                    this.cursor.removeCursorInRange(this.mouseStartObj.preRange);
                }
            }
        },
        // 鼠标移动事件
        onDocumentMmove(e) {
            let that = this;
            let offset = $(this.$refs.scroller).offset();
            if (this.mouseStartObj && Date.now() - this.mouseStartObj.time > 100) {
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
                    line = line < 1 ? 1 : (line > that.myContext.htmls.length ? that.myContext.htmls.length : line);
                    column = column < 0 ? 0 : (column > that.myContext.htmls[originLine - 1].text.length ? that.myContext.htmls[originLine - 1].text.length : column);
                    that.mouseStartObj.cursorPos = that.cursor.setCursorPos({ line: line, column: column });
                    that.mouseStartObj.preRange = that.selecter.setRange(that.mouseStartObj.start, { line: line, column: column });
                    that.selectMoveTimer = requestAnimationFrame(() => {
                        _run(autoDirect, speed)
                    });
                }
            }
        },
        // 鼠标抬起事件
        onDocumentMouseUp(e) {
            // 停止滚动选中
            cancelAnimationFrame(this.selectMoveTimer);
            this.mouseStartObj = null;
            this.mouseUpTime = Date.now();
            this.$refs.searchDialog && this.$refs.searchDialog.directBlur();
        },
        // 左右滚动事件
        onScroll(e) {
            this.setStartLine(e.target.scrollTop);
            this.scrollTop = e.target.scrollTop;
            this.scrollLeft = e.target.scrollLeft;
            this.$refs.scroller.scrollLeft = this.scrollLeft;
        },
        // 滚动滚轮
        onWheel(e) {
            this.$refs.scroller.scrollTop = this.scrollTop + e.deltaY;
            this.$refs.scroller.scrollLeft = this.scrollLeft + e.deltaX;
        },
        // 中文输入开始
        onCompositionstart() {
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
            let mime = window.clipboardData ? "Text" : "text/plain";
            let clipboardData = e.clipboardData || window.clipboardData;
            clipboardData.setData(mime, this.myContext.getCopyText());
        },
        onCut(e) {
            let mime = window.clipboardData ? "Text" : "text/plain";
            let clipboardData = e.clipboardData || window.clipboardData;
            clipboardData.setData(mime, this.myContext.getCopyText(true));
        },
        // 粘贴事件
        onPaste(e) {
            let mime = window.clipboardData ? "Text" : "text/plain";
            let clipboardData = e.clipboardData || window.clipboardData;
            let copyText = '';
            copyText = clipboardData.getData(mime);
            this.myContext.insertContent(copyText);
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
                config: {
                    text: data.text,
                    wholeWord: data.wholeWord,
                    ignoreCase: data.ignoreCase,
                }
            });
            this.searchNow = resultObj.now;
            this.searchCount = resultObj.count;
            if (this.cursorFocus === false) {
                this.searcher.clearSearch();
            }
        },
        onSearchNext(cursorFocus) {
            if (cursorFocus !== undefined) {
                this.cursorFocus = cursorFocus;
            }
            if (this.fSearcher.hasCache()) {
                let resultObj = this.fSearcher.search({});
                this.searchNow = resultObj.now;
                this.searchCount = resultObj.count;
            }
        },
        onSearchPrev(cursorFocus) {
            if (cursorFocus !== undefined) {
                this.cursorFocus = cursorFocus;
            }
            if (this.fSearcher.hasCache()) {
                let resultObj = this.fSearcher.search({ direct: 'up' });
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