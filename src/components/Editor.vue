<template>
    <div @contextmenu.prevent.stop="onContextmenu" @selectstart.prevent @wheel.prevent="onWheel" class="my-editor-wrap" ref="editor">
        <!-- 行号 -->
        <div :style="{ top: _numTop }" class="my-nums" v-if="active">
            <!-- 占位行号，避免行号宽度滚动时变化 -->
            <div class="my-num" style="visibility: hidden">{{ maxLine }}</div>
            <div :class="{ 'my-active': nowCursorPos.line === line.num }" :key="line.num" :style="{ height: _lineHeight, 'line-height': _lineHeight }" class="my-num" v-for="line in renderHtmls">
                <span @mouseleave="onIconMouseLeave" @mouseover="onIconMouseOver(line.num, $event)" class="my-line-icon my-center-center">
                    <i class="my-icon-error" style="margin-top: -2px" v-if="errorMap[line.num]"></i>
                </span>
                <span class="num">{{ line.num }}</span>
                <!-- 折叠图标 -->
                <span
                    :class="['iconfont', line.fold == 'open' ? 'my-fold-open icon-down1' : 'my-fold-close icon-right']"
                    @click="onToggleFold(line.num)"
                    class="my-fold my-center-center"
                    v-if="line.fold"
                ></span>
            </div>
        </div>
        <div :style="{ 'box-shadow': _leftShadow }" class="my-content-wrap">
            <!-- 可滚动区域 -->
            <div @scroll="onScroll" class="my-scroller my-scroll-overlay" ref="scroller">
                <!-- 内如区域 -->
                <div
                    :style="{ minWidth: _contentMinWidth, height: contentHeight }"
                    @mousedown="onContentMdown"
                    @mousemove="onContentMmove"
                    @selectend.prevent="onSelectend"
                    class="my-content"
                    ref="content"
                >
                    <div :style="{ top: _top }" class="my-render" ref="render" v-if="active">
                        <div
                            :class="{ 'my-active': _activeLine(line.num) }"
                            :data-line="line.num"
                            :id="'line_' + line.num"
                            :key="line.num"
                            :style="{ height: _lineHeight, 'line-height': _lineHeight }"
                            class="my-line"
                            v-for="line in renderHtmls"
                        >
                            <!-- my-select-bg为选中状态 -->
                            <div
                                :class="[
                                    line.active ? 'my-active' : '',
                                    line.selected ? (line.isFsearch ? 'my-search-bg' : 'my-select-bg') : '',
                                    line.selected && selectedFg ? 'my-select-fg' : '',
                                    line.fold == 'close' ? 'fold-close' : '',
                                ]"
                                :data-line="line.num"
                                class="my-code"
                                v-html="line.html"
                            ></div>
                            <!-- 当前光标所处范围-begin -->
                            <div
                                class="my-bracket-match"
                                :style="{ left: bracketMatch.start.left + 'px', width: bracketMatch.start.width + 'px' }"
                                v-if="bracketMatch && line.num == bracketMatch.start.line"
                            ></div>
                            <!-- 当前光标所处范围-end -->
                            <div
                                class="my-bracket-match"
                                :style="{ left: bracketMatch.end.left + 'px', width: bracketMatch.end.width + 'px' }"
                                v-if="bracketMatch && line.num == bracketMatch.end.line"
                            ></div>
                            <!-- 选中时的首行背景 -->
                            <div
                                :class="{ 'my-active': range.active, 'my-search-bg': range.isFsearch }"
                                :style="{ left: range.left + 'px', width: range.width + 'px' }"
                                class="my-line-bg my-select-bg"
                                v-for="range in line.selectStarts"
                            ></div>
                            <!-- 选中时的末行背景 -->
                            <div
                                :class="{ 'my-active': range.active, 'my-search-bg': range.isFsearch }"
                                :style="{ left: range.left + 'px', width: range.width + 'px' }"
                                class="my-line-bg my-select-bg"
                                v-for="range in line.selectEnds"
                            ></div>
                            <span :style="{ left: _tabLineLeft(tab) }" class="my-tab-line" v-for="tab in line.tabNum"></span>
                            <!-- 模拟光标 -->
                            <div :style="{ height: _lineHeight, left: left, visibility: _cursorVisible }" class="my-cursor" style="top: 0px" v-for="left in line.cursorList"></div>
                        </div>
                    </div>
                    <!-- 输入框 -->
                    <textarea
                        :style="{ top: _textAreaPos.top, left: _textAreaPos.left }"
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
                    <auto-tip :styles="autoTipStyle" :tipList="autoTipList" @change="onClickAuto" ref="autoTip" v-show="autoTipList && autoTipList.length"></auto-tip>
                </div>
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
        <!-- 右键菜单 -->
        <Menu :checkable="false" :menuList="menuList" :styles="menuStyle" @change="onClickMenu" ref="menu" v-show="menuVisible"></Menu>
        <tip :content="tipContent" :styles="tipStyle" ref="tip" v-show="tipContent"></tip>
    </div>
</template>

<script>
import Tokenizer from '@/module/tokenizer/index';
import Lint from '@/module/lint/core/index';
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
    },
    props: {
        id: {
            type: Number,
        },
        active: {
            type: Boolean,
            default: false,
        },
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
            language: '',
            theme: '',
            tabSize: 4,
            renderHtmls: [],
            startLine: 1,
            top: 0,
            cursorLeft: 0,
            scrollLeft: 0,
            scrollTop: 0,
            maxVisibleLines: 1,
            maxLine: 1,
            contentHeight: '100%',
            scrollerArea: {},
            bracketMatch: {
                start: {},
                end: {},
            },
            maxWidthObj: {
                lineId: null,
                text: '',
                width: 0,
            },
            menuList: [
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
            menuStyle: {
                top: '0px',
                left: '0px',
                'min-width': '200px',
            },
            tipStyle: {
                top: '0px',
                left: '0px',
            },
            autoTipStyle: {
                top: '50%',
                left: '50%',
            },
            errorMap: {},
            autoTipList: [],
            tipContent: null,
            menuVisible: false,
            searchVisible: false,
            selectedFg: false,
            activeLineBg: true,
            searchNow: 1,
            searchCount: 0,
        };
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
            this.tokenizer.initLanguage(newVal).then(() => {
                this.tokenizer.tokenizeVisibleLins();
                this.tokenizer.tokenizeLines(1);
            });
        },
        theme: function () {
            this.myContext.htmls.forEach((lineObj) => {
                lineObj.html = '';
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
        startLine: function (newVal) {
            this.render();
            this.tokenizer.tokenizeVisibleLins();
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
    },
    mounted() {
        this.selectedFg = !!globalData.colors['editor.selectionForeground'];
        this.showEditor();
        this.initResizeEvent();
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
        initResizeEvent() {
            const resizeObserver = new ResizeObserver((entries) => {
                if (this.$refs.editor) {
                    this.showEditor();
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
                'theme-change',
                (this.initEventBus.fn4 = (theme) => {
                    this.selectedFg = !!globalData.colors['editor.selectionForeground'];
                    if (this.active) {
                        this.theme = theme;
                    }
                    this._theme = theme;
                })
            );
        },
        unbindEvent() {
            $(document).unbind('mousemove', this.initEvent.fn1);
            $(document).unbind('mouseup', this.initEvent.fn2);
            EventBus.$off('language-change', this.initEventBus.fn1);
            EventBus.$off('tab-size-change', this.initEventBus.fn2);
            EventBus.$off('close-menu', this.initEventBus.fn3);
            EventBus.$off('theme-change', this.initEventBus.fn4);
        },
        showEditor() {
            if (this.active) {
                this.$nextTick(() => {
                    this.language = this._language || '';
                    this.theme = this._theme || '';
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
            };
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
            this.$refs.textarea.focus();
            requestAnimationFrame(() => {
                this.$refs.textarea.focus();
            });
        },
        // 渲染
        render(forceCursorView) {
            let renderId = this.renderId + 1 || 1;
            this.renderId = renderId;
            this.$nextTick(() => {
                if (this.renderId !== renderId) {
                    return;
                }
                this.renderLine();
                this.renderSelectedBg();
                this.renderSelectionToken();
                this.renderCursor(forceCursorView);
                this.$nextTick(() => {
                    this.scrollerArea = {
                        height: this.$refs.scroller.clientHeight,
                        width: this.$refs.scroller.clientWidth,
                    };
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
                        this.renderSelectionToken(obj.line);
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
                let tabNum = _getTabNum(line);
                let fold = '';
                if (that.folder.getFoldByLine(line)) {
                    //该行已经折叠
                    fold = 'close';
                } else if (that.folder.getRangeFold(line, true)) {
                    //可折叠
                    fold = 'open';
                }
                let html = item.html;
                if (!html) {
                    if (item.tokens && item.tokens.length) {
                        item.tokens = that.tokenizer.splitLongToken(item.tokens);
                        item.html = that.tokenizer.createHtml(item.tokens, item.text);
                        html = item.html;
                    } else {
                        html = Util.htmlTrans(item.text);
                    }
                }
                html = html.replace(/\t/g, that.space);
                return {
                    html: html,
                    num: line,
                    tabNum: tabNum,
                    selectStarts: [],
                    selectEnds: [],
                    selected: false,
                    isFsearch: false,
                    fold: fold,
                    cursorList: [],
                };
            }

            function _getTabNum(line) {
                let text = that.myContext.htmls[line - 1].text;
                let wReg = /[^\s]/;
                let tabNum = 0;
                if (that.myContext.renderedLineMap.has(line)) {
                    return that.myContext.renderedLineMap.get(line).tabNum;
                }
                if (wReg.exec(text)) {
                    //该行有内容
                    let spaceNum = /^\s+/.exec(text);
                    if (spaceNum) {
                        tabNum = /\t+/.exec(spaceNum[0]);
                        tabNum = (tabNum && tabNum[0].length) || 0;
                        tabNum = tabNum + Math.ceil((spaceNum[0].length - tabNum) / that.tabSize);
                    }
                } else {
                    //空行
                    let _line = line - 1;
                    while (_line >= 1) {
                        if (wReg.exec(that.myContext.htmls[_line - 1].text)) {
                            tabNum = _getTabNum(_line);
                            if (that.folder.getRangeFold(_line, true)) {
                                tabNum++;
                            }
                            break;
                        }
                        _line--;
                    }
                }
                return tabNum;
            }
        },
        renderSelectedBg() {
            let renderSelectedBgId = this.renderSelectedBgId + 1 || 1;
            this.renderSelectedBgId = renderSelectedBgId;
            this.activeLineBg = true;
            this.$nextTick(() => {
                if (this.renderSelectedBgId != renderSelectedBgId) {
                    return;
                }
                if (!this.renderHtmls.length) {
                    //删除内容后，窗口还没滚动到可视区域
                    requestAnimationFrame(() => {
                        this.renderSelectedBg();
                    });
                    return;
                }
                this.clearSelectionToken();
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
                        if (!_range && range.active) {
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
            let firstLine = this.renderHtmls[0].num;
            let lastLine = this.renderHtmls.peek().num;
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
                    let lineObj = this.myContext.renderedLineMap.get(line);
                    lineObj.selected = true;
                    lineObj.isFsearch = isFsearch;
                    lineObj.active = range.active;
                }
            }
            if (this.myContext.renderedLineMap.has(start.line)) {
                this.myContext.renderedLineMap.get(start.line).selectStarts.push({
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
                this.myContext.renderedLineMap.get(end.line).selectEnds.push({
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
            if (!lineObj.fgTokens) {
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
                if (this.renderCursorId !== renderCursorId || !this.renderHtmls.length) {
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
                if (cursorPos.del) {
                    return;
                }
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
                    let height = this.folder.getRelativeLine(nowCursorPos.line) * this.charObj.charHight;
                    if (height + this.charObj.charHight > this.scrollTop + this.scrollerArea.height) {
                        requestAnimationFrame(() => {
                            this.setStartLine(height + this.charObj.charHight - this.scrollerArea.height);
                            this.$refs.scroller.scrollTop = height + this.charObj.charHight - this.scrollerArea.height;
                        });
                    } else if (nowCursorPos.line <= this.startLine) {
                        requestAnimationFrame(() => {
                            if (nowCursorPos.line <= this.startLine) {
                                //此时this.startLine可能已经通过onScrll而改变
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
            let contentHeight = 0;
            maxLine = this.folder.getRelativeLine(maxLine);
            contentHeight = maxLine * this.charObj.charHight;
            if (this.scrollerArea) {
                contentHeight += this.scrollerArea.height - this.charObj.charHight;
            }
            this.contentHeight = contentHeight + 'px';
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
                this.$nextTick(() => {
                    let width = this.$refs.autoTip.$el.clientWidth;
                    let height = this.$refs.autoTip.$el.clientHeight;
                    this.autoTipStyle.top = this.folder.getRelativeLine(this.nowCursorPos.line) * this.charObj.charHight;
                    this.autoTipStyle.left = this.getExactLeft(this.nowCursorPos);
                    if (this.autoTipStyle.top + height > Util.getNum(this._top) + this.$refs.scroller.clientHeight) {
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
            let $token = $('#line_' + cursorPos.line)
                .children('.my-code')
                .children('span[data-column="' + token.startIndex + '"]');
            if (!$token.length) {
                return 0;
            }
            let text = lineObj.text.slice(token.startIndex, cursorPos.column);
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
            this.myContext.replaceTip(item);
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
                    top: top + 'px',
                };
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
            let mime = window.clipboardData ? 'Text' : 'text/plain';
            let clipboardData = e.clipboardData || window.clipboardData;
            clipboardData.setData(mime, this.myContext.getCopyText());
        },
        onCut(e) {
            let mime = window.clipboardData ? 'Text' : 'text/plain';
            let clipboardData = e.clipboardData || window.clipboardData;
            clipboardData.setData(mime, this.myContext.getCopyText(true));
        },
        // 粘贴事件
        onPaste(e) {
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
        onKeyDown(e) {
            this.shortcut.onKeyDown(e);
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
    },
};
</script>