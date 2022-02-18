<template>
	<div
		:style="{'padding-bottom': _statusHeight}"
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
			<div @mousedown="onScrollerMdown" class="my-editor-content-scroller" ref="scroller">
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
							:class="[line.selected ? 'my-editor-select-bg my-editor-select-active' : '', line.fold == 'close' ? 'fold-close' : '']"
							:data-line="line.num"
							class="my-editor-code"
							v-html="line.html"
						></div>
						<!-- 选中时的首行背景 -->
						<div
							:class="{'my-editor-select-active': range.active}"
							:style="{left: range.left + 'px', width: range.width + 'px'}"
							class="my-editor-line-bg my-editor-select-bg"
							v-for="range in line.selectStarts"
						></div>
						<!-- 选中时的末行背景 -->
						<div
							:style="{left: range.left + 'px', width: range.width + 'px'}"
							class="my-editor-line-bg my-editor-select-bg my-editor-select-active"
							v-for="range in line.selectEnds"
						></div>
						<span :style="{left: _tabLineLeft(tab)}" class="my-editor-tab-line" v-for="tab in line.tabNum"></span>
					</div>
					<!-- 模拟光标 -->
					<div :style="{height: _lineHeight, top: item.top, left: item.left, visibility: _cursorVisible}" class="my-editor-cursor" v-for="item in multiCursorPos"></div>
				</div>
			</div>
			<!-- 水平滚动条 -->
			<div @mousedown.stop @mouseup.stop @scroll="onHscroll" class="my-editor-h-scroller-wrap" ref="hScroller">
				<div :style="{width: _hScrollWidth}" class="my-editor-h-scroller"></div>
			</div>
			<!-- 垂直滚动条 -->
			<div @mousedown.stop @mouseup.stop @scroll="onVscroll" class="my-editor-v-scroller-wrap" ref="vScroller">
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
		</div>
		<!-- 状态栏 -->
		<status-bar
			:column="nowCursorPos.column+1"
			:height="statusHeight"
			:language.sync="language"
			:line="nowCursorPos.line"
			:tabSize.sync="tabSize"
			ref="statusBar"
		></status-bar>
		<!-- 右键菜单 -->
		<panel :checkable="false" :menuList="menuList" :styles="menuStyle" @change="onClickMenu" ref="menu" v-show="menuVisble"></panel>
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
import StatusBar from './StatusBar';
import Panel from './Panel';
import Tip from './Tip';
import Util from '@/common/Util';
import $ from 'jquery';
const context = {
    htmls: [],
    folds: [],
    history: [], // 操作历史
    selectedRanges: [],
    lineIdMap: new Map(), //htmls的唯一标识对象
    renderedIdMap: new Map(), //renderHtmls的唯一标识对象
    renderedLineMap: new Map(), //renderHtmls的唯一标识对象
    foldMap: new Map(), //folds的唯一标识对象
    setContextValue: function (prop, value) {
        context[prop] = value
    }
}
const regs = {
    word: /[a-zA-Z0-9_]/,
    dWord: Util.fullAngleReg,
    space: /\s/
}
export default {
    name: 'Home',
    components: {
        StatusBar,
        Panel,
        Tip
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
                top: 0,
                left: 0,
            },
            multiCursorPos: [],
            cursorVisible: true,
            cursorFocus: true,
            language: 'HTML',
            // language: 'JavaScript',
            // language: 'CSS',
            statusHeight: 23,
            tabSize: 4,
            renderHtmls: [],
            startLine: 1,
            startToEndToken: null,
            top: 0,
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
            tipContent: false,
            tipContent: '',
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
            if (this.multiCursorPos.length) {
                let cursorRealPos = this.multiCursorPos.slice().sort((a, b) => {
                    return a.top - b.top;
                })[0];
                left = Util.getNum(cursorRealPos.left);
                top = Util.getNum(cursorRealPos.top) + this.top;
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
                return this.multiCursorPos.length === 1 && this.nowCursorPos.line == num;
            }
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
        }
    },
    created() {
        window.editor = this;
        window.context = context;
        this.initData();
        this.initEvent();
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
        this.render();
        this.focus();
    },
    methods: {
        // 初始化数据
        initData() {
            this.lineId = Number.MIN_SAFE_INTEGER;
            context.htmls.push({
                lineId: this.lineId++,
                text: '',
                html: '',
                width: 0,
                tokens: [],
                folds: [],
                states: []
            });
            context.lineIdMap.set(context.htmls[0].lineId, context.htmls[0]);
            this.maxWidthObj.lineId = context.htmls[0].lineId;
            this.tokenizer = new Tokenizer(this, context);
            this.lint = new Lint(this, context);
            this.folder = new Fold(this, context);
            this.history = new History(this, context);
            this.searcher = new Search(this, context);
            this.selecter = new Select(this, context);
            this.cursor = new Cursor(this, context);
            this.cursor.addCursorPos(this.nowCursorPos);
        },
        // 初始化文档事件
        initEvent() {
            $(document).on('mousemove', (e) => {
                this.onScrollerMmove(e);
            });
            $(document).on('mouseup', (e) => {
                this.onScrollerMup(e);
            });
        },
        // 显示光标
        showCursor() {
            this.cursorFocus = true;
            if (!this.multiCursorPos.length) {
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
        render() {
            this.renderLine();
            this.renderSelectedBg();
            this.$nextTick(() => {
                this.scrollerArea = {
                    height: this.$scroller.clientHeight,
                    width: this.$scroller.clientWidth,
                }
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
                    Object.assign(obj, _getObj(item, obj.num));
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
                }
            }
        },
        renderSelectedBg() {
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
            if (!context.selectedRanges.length) {
                return;
            }
            context.selectedRanges.map((selectedRange) => {
                this._renderSelectedBg(selectedRange);
            });
        },
        // 渲染选中背景
        _renderSelectedBg(selectedRange) {
            let firstLine = this.renderHtmls[0].num;
            let lastLine = this.renderHtmls.peek().num;
            let start = selectedRange.start;
            let end = selectedRange.end;
            let text = context.htmls[start.line - 1].text;
            let active = false;
            start.left = this.getStrWidth(text, 0, start.column);
            if (start.line == end.line) {
                start.width = this.getStrWidth(text, start.column, end.column);
            } else {
                start.width = this.getStrWidth(text, start.column);
                end.left = 0;
                text = context.htmls[end.line - 1].text;
                end.width = this.getStrWidth(text, 0, end.column);
            }
            selectedRange.start = start;
            selectedRange.end = end;
            firstLine = firstLine > start.line + 1 ? firstLine : start.line + 1;
            lastLine = lastLine < end.line - 1 ? lastLine : end.line - 1;
            for (let line = firstLine; line <= lastLine; line++) {
                context.renderedLineMap.get(line).selected = true;
            }
            if (context.renderedLineMap.has(start.line)) {
                active = this.selecter.checkSelectedActive(selectedRange);
                context.renderedLineMap.get(start.line).selectStarts.push({
                    left: start.left,
                    width: start.width,
                    active: active

                });
            }
            if (end.line > start.line && context.renderedLineMap.has(end.line)) {
                context.renderedLineMap.get(end.line).selectEnds.push({
                    left: end.left,
                    width: end.width,
                    active: active || this.selecter.checkSelectedActive(selectedRange)
                });
            }
        },
        insertContent(text, cursorPos, commandObj) {
            let historyArr = [];
            // 如果有选中区域，需要先删除选中区域
            if (context.selectedRanges.filter((item) => { return item.active }).length) {
                this.deleteContent();
            }
            if (cursorPos) {
                if (text instanceof Array) {
                    text.map((item, index) => {
                        let _cursorPos = this.cursor.addCursorPos(cursorPos[index]);
                        let historyObj = this._insertContent(text[index], _cursorPos);
                        historyArr.push(historyObj);
                        if (commandObj && commandObj.keyCode === Util.keyCode.DELETE) {
                            this.cursor.updateCursorPos(_cursorPos, cursorPos[index].line, cursorPos[index].column);
                        }
                    });
                } else {
                    let _cursorPos = this.cursor.addCursorPos(cursorPos);
                    historyArr = this._insertContent(text, _cursorPos);
                    if (commandObj && commandObj.keyCode === Util.keyCode.DELETE) {
                        this.cursor.updateCursorPos(_cursorPos, cursorPos.line, cursorPos.column);
                    }
                }
            } else if (this.multiCursorPos.length > 1) {
                let texts = text instanceof Array ? text : text.split(/\r\n|\n/);
                // 多点插入时候，逆序插入
                let multiCursorPos = this.multiCursorPos.slice().reverse();
                if (texts.length === this.multiCursorPos.length) {
                    multiCursorPos.map((cursorPos, index) => {
                        let historyObj = this._insertContent(texts[index], cursorPos);
                        historyArr.push(historyObj);
                    });
                } else {
                    multiCursorPos.map((cursorPos) => {
                        let historyObj = this._insertContent(text, cursorPos);
                        historyArr.push(historyObj);
                    });
                }
            } else {
                historyArr = this._insertContent(text, this.multiCursorPos[0]);
            }
            if (!commandObj) { // 新增历史记录
                this.history.pushHistory(historyArr);
            } else { // 撤销或重做操作后，更新历史记录
                this.history.updateHistory(context.history.index, historyArr);
            }
        },
        // 插入内容
        _insertContent(text, cursorPos) {
            let nowLineText = context.htmls[cursorPos.line - 1].text;
            let originPos = { line: cursorPos.line, column: cursorPos.column };
            let nowColume = cursorPos.column;
            let nowLine = cursorPos.line;
            let newLine = nowLine;
            let newColumn = nowColume;
            this.tokenizer.onInsertContentBefore(nowLine);
            this.lint.onInsertContentBefore(nowLine);
            this.folder.onInsertContentBefore(Object.assign({}, originPos));
            text = text.split(/\r\n|\n/);
            text = text.map((item) => {
                item = {
                    lineId: this.lineId++,
                    text: item,
                    html: '',
                    width: 0,
                    tokens: null,
                    folds: null,
                    states: null
                };
                context.lineIdMap.set(item.lineId, item);
                return item;
            });
            if (text.length > 1) { // 插入多行
                newColumn = text[text.length - 1].text.length;
                text[0].text = nowLineText.slice(0, nowColume) + text[0].text;
                text[text.length - 1].text = text[text.length - 1].text + nowLineText.slice(nowColume);
                context.htmls = context.htmls.slice(0, cursorPos.line - 1).concat(text).concat(context.htmls.slice(cursorPos.line));
            } else { // 插入一行
                newColumn += text[0].text.length;
                text[0].text = nowLineText.slice(0, nowColume) + text[0].text + nowLineText.slice(cursorPos.column);
                context.htmls.splice(cursorPos.line - 1, 1, text[0]);
            }
            newLine += text.length - 1;
            this.maxLine = context.htmls.length;
            this.folder.onInsertContentAfter({ line: newLine, column: newColumn });
            this.lint.onInsertContentAfter(newLine);
            this.render();
            this.tokenizer.onInsertContentAfter(newLine);
            this.setLineWidth(text);
            if (context.foldMap.has(nowLine) && text.length > 1) {
                this.unFold(nowLine);
            }
            this.cursor.updateCursorPos(cursorPos, newLine, newColumn, true);
            let historyObj = {
                type: Util.command.DELETE,
                cursorPos: {
                    line: newLine,
                    column: newColumn
                },
                preCursorPos: {
                    line: nowLine,
                    column: nowColume
                }
            }
            return historyObj;
        },
        deleteContent(keyCode, rangePos, isCommand) {
            let historyArr = [];
            let cursorPos = null;
            if (rangePos) {
                rangePos = rangePos instanceof Array ? rangePos : [rangePos];
                rangePos.map((item) => {
                    this.selecter.addSelectedRange(item.start, item.end);
                    cursorPos = this.cursor.addCursorPos(item.end);
                    let historyObj = this._deleteContent(cursorPos, keyCode);
                    historyObj.text && historyArr.push(historyObj);
                });
            } else {
                this.multiCursorPos.map((cursorPos) => {
                    let historyObj = this._deleteContent(cursorPos, keyCode);
                    historyObj.text && historyArr.push(historyObj);
                });
            }
            this.setNowCursorPos(this.multiCursorPos[0]);
            historyArr = historyArr.length > 1 ? historyArr : historyArr[0];
            if (!isCommand) { // 新增历史记录
                historyArr && this.history.pushHistory(historyArr);
            } else { // 撤销或重做操作后，更新历史记录
                this.history.updateHistory(context.history.index, historyArr);
            }
        },
        // 删除内容
        _deleteContent(cursorPos, keyCode) {
            let selectedRange = null;
            if (cursorPos.start && cursorPos.end) { //删除范围内的内容
                selectedRange = cursorPos;
                cursorPos = selectedRange.end;
            } else { //光标在选中范围的边界
                selectedRange = this.selecter.checkCursorSelected(cursorPos);
            }
            let start = null;
            let startObj = context.htmls[cursorPos.line - 1];
            let text = startObj.text;
            let deleteText = '';
            let rangeUuid = [];
            let originPos = { line: cursorPos.line, column: cursorPos.column };
            let newLine = cursorPos.line;
            let newColumn = cursorPos.column;
            this.tokenizer.onDeleteContentBefore(cursorPos.line);
            this.lint.onDeleteContentBefore(cursorPos.line);
            this.folder.onDeleteContentBefore(Object.assign({}, cursorPos));
            if (selectedRange) { // 删除选中区域
                let end = selectedRange.end;
                let endObj = context.htmls[end.line - 1];
                start = selectedRange.start;
                startObj = context.htmls[start.line - 1];
                originPos = { line: end.line, column: end.column };
                text = startObj.text;
                deleteText = this.getRangeText(selectedRange.start, selectedRange.end);
                if (start.line == 1 && end.line == this.maxLine) { //全选删除
                    rangeUuid = [this.maxWidthObj.lineId];
                    context.lineIdMap.clear();
                } else {
                    rangeUuid = context.htmls.slice(start.line - 1, end.line).map((item) => {
                        context.lineIdMap.delete(item.lineId);
                        return item.lineId;
                    });
                }
                context.lineIdMap.set(startObj.lineId, startObj);
                if (start.line == end.line) { // 单行选中
                    text = text.slice(0, start.column) + text.slice(end.column);
                    startObj.text = text;
                } else { // 多行选中
                    text = text.slice(0, start.column);
                    startObj.text = text;
                    text = endObj.text;
                    text = text.slice(end.column);
                    startObj.text += text;
                    context.htmls.splice(start.line, end.line - start.line);
                }
                newLine = start.line;
                newColumn = start.column;
                this.selecter.clearRange(selectedRange);
            } else if (Util.keyCode.DELETE == keyCode) { // 向后删除一个字符
                if (cursorPos.column == text.length) { // 光标处于行尾
                    if (cursorPos.line < context.htmls.length) {
                        context.lineIdMap.delete(context.htmls[cursorPos.line].lineId);
                        text = startObj.text + context.htmls[cursorPos.line].text;
                        context.htmls.splice(cursorPos.line, 1);
                        deleteText = '\n';
                        this.multiCursorPos.map((item) => {
                            if (item.line > cursorPos.line) {
                                if (item.line === cursorPos.line + 1) {
                                    if (item.column === 0) {
                                        item.column = cursorPos.column;
                                    } else {
                                        item.column--;
                                    }
                                }
                                item.line--;
                            }
                        });
                    }
                } else {
                    deleteText = text[cursorPos.column];
                    text = text.slice(0, cursorPos.column) + text.slice(cursorPos.column + 1);
                    this.multiCursorPos.map((item) => {
                        if (item.line === cursorPos.line && item.column > cursorPos.column) {
                            item.column--;
                        }
                    });
                }
                startObj.text = text;
            } else { // 向前删除一个字符
                if (cursorPos.column == 0) { // 光标处于行首
                    if (cursorPos.line > 1) {
                        let column = context.htmls[cursorPos.line - 2].text.length;
                        context.lineIdMap.delete(context.htmls[cursorPos.line - 2].lineId);
                        text = context.htmls[cursorPos.line - 2].text + text;
                        context.htmls.splice(cursorPos.line - 2, 1);
                        deleteText = '\n';
                        newLine = cursorPos.line - 1;
                        newColumn = column;
                    }
                } else {
                    deleteText = text[cursorPos.column - 1];
                    text = text.slice(0, cursorPos.column - 1) + text.slice(cursorPos.column);
                    newColumn = cursorPos.column - 1;
                }
                startObj.text = text;
            }
            startObj.width = this.getStrWidth(startObj.text);
            startObj.tokens = null;
            startObj.folds = null;
            startObj.states = null;
            this.maxLine = context.htmls.length;
            this.folder.onDeleteContentAfter({ line: newLine, column: newColumn });
            this.lint.onDeleteContentAfter(newLine);
            this.render(); //必须放在tokenizer前面，renderline(lineId)的时候.obj.num将失效
            this.tokenizer.onDeleteContentAfter(newLine);
            this.cursor.updateCursorPos(cursorPos, newLine, newColumn, true);
            // 更新最大文本宽度
            if (startObj.width >= this.maxWidthObj.width) {
                this.maxWidthObj = {
                    lineId: startObj.lineId,
                    text: startObj.text,
                    width: startObj.width
                }
            } else if (rangeUuid.indexOf(this.maxWidthObj.lineId) > -1) {
                this.setMaxWidth();
            }
            let historyObj = {
                type: Util.command.INSERT,
                cursorPos: {
                    line: cursorPos.line,
                    column: cursorPos.column
                },
                preCursorPos: {
                    line: originPos.line,
                    column: originPos.column
                },
                keyCode: keyCode,
                text: deleteText
            };
            return historyObj;
        },
        moveLineUp(cursorPos, isCommand) {
            let that = this;
            let cursorPosList = [];
            let historyPosList = [];
            let prePos = null;
            if (cursorPos) {
                cursorPosList = cursorPos instanceof Array ? cursorPos : [cursorPos];
            } else {
                that.multiCursorPos.map((item) => {
                    if (!prePos || item.line - prePos.line > 1) {
                        item.line > 1 && cursorPosList.push(item);
                        prePos = item;
                    }
                });
            }
            cursorPosList.map((cursorPos) => {
                cursorPos = this.cursor.addCursorPos(cursorPos);
                _moveLineUp(cursorPos);
                historyPosList.push({ line: cursorPos.line, column: cursorPos.column });
            });
            let historyObj = {
                type: Util.command.MOVEDOWN,
                cursorPos: historyPosList
            }
            if (!isCommand) { // 新增历史记录
                this.history.pushHistory(historyObj);
            } else { // 撤销或重做操作后，更新历史记录
                this.history.updateHistory(context.history.index, historyObj);
            }

            function _moveLineUp(cursorPos) {
                let upLineText = context.htmls[cursorPos.line - 2].text;
                let nowLineText = context.htmls[cursorPos.line - 1].text;
                let start = { line: cursorPos.line - 1, column: 0 };
                that._deleteContent({
                    start: start,
                    end: { line: cursorPos.line, column: nowLineText.length }
                });
                that._insertContent(nowLineText + '\n' + upLineText, start);
                that.cursor.updateCursorPos(cursorPos, cursorPos.line - 1, cursorPos.column);
            }
        },
        moveLineDown(cursorPos, isCommand) {
            let that = this;
            let cursorPosList = [];
            let historyPosList = [];
            let prePos = null;
            let historyArr = [];
            if (cursorPos) {
                cursorPosList = cursorPos instanceof Array ? cursorPos : [cursorPos];
            } else {
                that.multiCursorPos.map((item) => {
                    if (!prePos || item.line - prePos.line > 1) {
                        item.line > 1 && cursorPosList.push(item);
                        prePos = item;
                    }
                });
            }
            cursorPosList.map((cursorPos) => {
                cursorPos = this.cursor.addCursorPos(cursorPos);
                _moveLineDown(cursorPos);
                historyPosList.push({ line: cursorPos.line, column: cursorPos.column });
            });
            let historyObj = {
                type: Util.command.MOVEUP,
                cursorPos: historyPosList
            }
            if (!isCommand) { // 新增历史记录
                this.history.pushHistory(historyObj);
            } else { // 撤销或重做操作后，更新历史记录
                this.history.updateHistory(context.history.index, historyObj);
            }

            function _moveLineDown(cursorPos) {
                let downLineText = context.htmls[cursorPos.line].text;
                let nowLineText = context.htmls[cursorPos.line - 1].text;
                let start = { line: cursorPos.line, column: 0 };
                that._deleteContent({
                    start: start,
                    end: { line: cursorPos.line + 1, column: downLineText.length }
                });
                that._insertContent(downLineText + '\n' + nowLineText, start);
                that.cursor.updateCursorPos(cursorPos, cursorPos.line + 1, cursorPos.column);
            }
        },
        // 向下复制一行
        copyLineDown(cursorPos, isCommand) {
            let copyedLineMap = {};
            let cursorPosList = [];
            let historyPosList = [];
            let texts = [];
            if (cursorPos) {
                cursorPosList = cursorPos instanceof Array ? cursorPos : [cursorPos];
            } else {
                this.multiCursorPos.map((item) => {
                    if (!copyedLineMap[item.line]) {
                        cursorPosList.push(item);
                    }
                });
            }
            cursorPosList.slice().reverse().map((cursorPos) => {
                let text = context.htmls[cursorPos.line - 1].text;
                cursorPos = this.cursor.addCursorPos(cursorPos);
                historyPosList.push(cursorPos);
                this._insertContent('\n' + text, { line: cursorPos.line, column: text.length });
                this.cursor.updateAfterPos({ line: cursorPos.line + 1, column: 0 }, cursorPos.line + 2, 0);
            });
            historyPosList = historyPosList.map((item) => {
                return { line: item.line, column: item.column };
            }).reverse();
            this.setCursorRealPos();
            this.renderSelectedBg();
            let historyObj = {
                type: Util.command.DELETE_DOWN,
                cursorPos: historyPosList
            }
            if (!isCommand) { // 新增历史记录
                this.history.pushHistory(historyObj);
            } else { // 撤销或重做操作后，更新历史记录
                this.history.updateHistory(context.history.index, historyObj);
            }
        },
        // 向下删除一行
        deleteLineDown(cursorPos, isCommand) {
            let copyedLineMap = {};
            let cursorPosList = [];
            let historyPosList = [];
            let texts = [];
            if (cursorPos) {
                cursorPosList = cursorPos instanceof Array ? cursorPos : [cursorPos];
            } else {
                this.multiCursorPos.reverse().slice().map((item) => {
                    if (!copyedLineMap[item.line]) {
                        cursorPosList.push(item);
                    }
                });
            }
            cursorPosList.slice().reverse().map((cursorPos) => {
                let nowText = context.htmls[cursorPos.line - 1].text;
                let downText = context.htmls[cursorPos.line].text;
                cursorPos = this.cursor.addCursorPos(cursorPos);
                historyPosList.push(cursorPos);
                this._deleteContent({
                    start: { line: cursorPos.line, column: nowText.length },
                    end: { line: cursorPos.line + 1, column: downText.length }
                });
                this.cursor.updateAfterPos({ line: cursorPos.line + 1, column: 0 }, cursorPos.line, 0);
            });
            historyPosList = historyPosList.map((item) => {
                return { line: item.line, column: item.column };
            }).reverse();
            this.setCursorRealPos();
            this.renderSelectedBg();
            let historyObj = {
                type: Util.command.COPY_DOWN,
                cursorPos: historyPosList
            }
            if (!isCommand) { // 新增历史记录
                this.history.pushHistory(historyObj);
            } else { // 撤销或重做操作后，更新历史记录
                this.history.updateHistory(context.history.index, historyObj);
            }
        },
        copyLineUp(cursorPos, isCommand) {

        },
        deleteLineUp(cursorPos, isCommand) {

        },
        // 折叠行
        foldLine(line) {
            let resultFold = this.folder.foldLine(line);
            this.focus();
            if (resultFold) {
                this.multiCursorPos.map((cursorPos) => {
                    if (cursorPos.line > line && cursorPos.line < resultFold.end.line) {
                        let lineObj = context.htmls[line - 1];
                        this.cursor.updateCursorPos(cursorPos, line, lineObj.text.length);
                    }
                });
                this.forceCursorView = false;
                this.setCursorRealPos();
                this.setScrollerHeight();
                this.render();
            }
        },
        // 展开折叠行
        unFold(line) {
            this.focus();
            if (this.folder.unFold(line)) {
                this.forceCursorView = false;
                this.setCursorRealPos();
                this.setScrollerHeight();
                this.render();
            }
        },
        search() {
            let searchObj = this.getToSearchObj();
            let resultObj = null;
            let hasCache = this.searcher.hasCache();
            if (!searchObj.text) {
                return;
            }
            resultObj = this.searcher.search(searchObj.text, searchObj);
            if (resultObj && resultObj.result) {
                if (!context.selectedRanges.length) {
                    this.cursor.setCursorPos(resultObj.result.end);
                } else {
                    this.cursor.addCursorPos(resultObj.result.end);
                }
                if (!hasCache) {
                    resultObj.list.map((rangePos) => {
                        this.selecter.addSelectedRange(rangePos.start, rangePos.end);
                    });
                }
                this.renderSelectedBg();
            }
        },
        clearSearch() {
            this.searcher.clearCache();
            this.getToSearchObj.searchObj = null;
        },
        setNowCursorPos(nowCursorPos) {
            this.nowCursorPos = nowCursorPos;
        },
        // 设置真实光标位置
        setCursorRealPos(cursorPos) {
            let that = this;
            if (!cursorPos) {
                this.multiCursorPos.map((cursorPos) => {
                    _deleySet(cursorPos);
                });
            } else {
                _deleySet(cursorPos);
            }
            this.cursorVisible = true;

            function _deleySet(cursorPos) {
                that.$nextTick(() => {
                    !cursorPos.del && _setCursorRealPos(cursorPos);
                });
            }

            function _setCursorRealPos(cursorPos) {
                let left = 0;
                let lineObj = context.htmls[cursorPos.line - 1];
                if ($('#line_' + cursorPos.line).length && lineObj.tokens && lineObj.tokens.length) {
                    left = _getExactLeft(cursorPos);
                } else {
                    left = that.getStrWidthByLine(cursorPos.line, 0, cursorPos.column);
                }
                let top = (that.folder.getRelativeLine(cursorPos.line) - that.folder.getRelativeLine(that.startLine)) * that.charObj.charHight;
                let relTop = that.folder.getRelativeLine(cursorPos.line) * that.charObj.charHight;
                // 强制滚动使光标处于可见区域
                if (that.forceCursorView !== false && cursorPos === that.nowCursorPos) {
                    if (relTop > that.scrollTop + that.scrollerArea.height - that.charObj.charHight) {
                        that.$vScroller.scrollTop = relTop + that.charObj.charHight - that.scrollerArea.height;
                    } else if (top < 0 || top == 0 && that.top < 0) {
                        that.$vScroller.scrollTop = (cursorPos.line - 1) * that.charObj.charHight;
                    }
                    if (left > that.scrollerArea.width + that.scrollLeft - that.charObj.fullAngleCharWidth) {
                        that.$hScroller.scrollLeft = left + that.charObj.fullAngleCharWidth - that.scrollerArea.width;
                    } else if (left < that.scrollLeft) {
                        that.$hScroller.scrollLeft = left - 1;
                    }
                }
                requestAnimationFrame(() => {
                    that.forceCursorView = true;
                });
                cursorPos.top = top + 'px';
                cursorPos.left = left + 'px';
                that.multiCursorPos.splice();
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
                let $token = $('#line_' + cursorPos.line).children('.my-editor-code').children('span[data-column="' + token.column + '"]');
                let text = token.value.slice(0, cursorPos.column - token.column);
                return $token[0].offsetLeft + that.getStrWidth(text);
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
        // 获取选中范围内的文本
        getRangeText(start, end) {
            var text = context.htmls[start.line - 1].text;
            if (start.line != end.line) {
                let arr = [];
                text = text.slice(start.column);
                arr = context.htmls.slice(start.line, end.line - 1);
                arr = arr.map((item) => {
                    return item.text;
                });
                text += arr.length ? '\n' + arr.join('\n') : '';
                text += '\n' + context.htmls[end.line - 1].text.slice(0, end.column);
            } else {
                text = text.slice(start.column, end.column);
            }
            return text;
        },
        // 获取待复制的文本
        getCopyText(cut) {
            let text = '';
            this.multiCursorPos.map((cursorPos) => {
                let str = '';
                let selectedRange = this.selecter.checkCursorSelected(cursorPos);
                if (selectedRange) {
                    str = this.getRangeText(selectedRange.start, selectedRange.end);
                    if (cut) {
                        this.deleteContent();
                    }
                } else {
                    str = context.htmls[cursorPos.line - 1].text;
                    if (cut) {
                        str && this.selecter.addSelectedRange({ line: cursorPos.line, column: 0 }, { line: cursorPos.line, column: str.length });
                        str && this.deleteContent();
                    }
                }
                text += '\n' + str;
            });
            return text.slice(1);
        },
        // 获取待搜索的文本
        getToSearchObj() {
            if (this.getToSearchObj.searchObj) {
                return this.getToSearchObj.searchObj;
            }
            let selectedRange = this.selecter.checkCursorSelected(this.nowCursorPos);
            let wholeWord = false;
            let searchText = '';
            if (selectedRange) {
                searchText = this.getRangeText(selectedRange.start, selectedRange.end);
            } else {
                let text = context.htmls[this.nowCursorPos.line - 1].text;
                let str = '';
                let index = this.nowCursorPos.column;
                let sReg = regs.word;
                if (index && text[index - 1].match(regs.dWord)) {
                    sReg = regs.dWord;
                }
                while (index > 0 && text[index - 1].match(sReg)) {
                    str = text[index - 1] + str;
                    index--;
                }
                index = this.nowCursorPos.column;
                while (index < text.length && text[index].match(sReg)) {
                    str += text[index];
                    index++;
                }
                wholeWord = true;
                searchText = str;
            }
            this.getToSearchObj.searchObj = {
                text: searchText,
                wholeWord: wholeWord
            }
            return this.getToSearchObj.searchObj;
        },
        // 右键菜单事件
        onContextmenu(e) {
            let panelWidth = 0;
            let panelHeight = 0;
            let $editor = $(this.$editor);
            let offset = $editor.offset();
            this.menuVisble = true;
            this.$nextTick(() => {
                panelWidth = this.$refs.menu.$el.clientWidth;
                panelHeight = this.$refs.menu.$el.clientHeight;
                if (panelHeight + e.clientY > offset.top + this.scrollerArea.height) {
                    this.menuStyle.top = e.clientY - offset.top - panelHeight + 'px';
                } else {
                    this.menuStyle.top = e.clientY - offset.top + 'px';
                }
                if (panelWidth + e.clientX > offset.left + $editor[0].clientWidth) {
                    this.menuStyle.left = e.clientX - offset.left - panelWidth + 'px';
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
                    Util.writeClipboard(this.getCopyText(menu.op === 'cut'));
                    break;
                case 'paste':
                    this.$textarea.focus();
                    Util.readClipboard().then((text) => {
                        this.insertContent(text);
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
            this.$refs.statusBar.closeAllPanel();
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
            this.mouseStartObj = {
                time: Date.now(),
                start: pos
            }
        },
        // 鼠标移动事件
        onScrollerMmove(e) {
            let that = this;
            if (this.mouseStartObj && Date.now() - this.mouseStartObj.time > 100) {
                var offset = $(this.$scroller).offset();
                let end = this.getPosByEvent(e);
                this.selecter.setSelectedRange(Object.assign({}, this.mouseStartObj.start), end);
                this.cursor.setCursorPos(end);
                this.renderSelectedBg();
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
                    that.renderSelectedBg();
                    that.selectMoveTimer = requestAnimationFrame(() => {
                        _run(autoDirect, speed)
                    });
                }
            }
        },
        // 鼠标抬起事件
        onScrollerMup(e) {
            let end = this.getPosByEvent(e);
            // 按下到抬起的间隔大于100ms，属于选中结束事件
            if (this.mouseStartObj && Date.now() - this.mouseStartObj.time > 100 &&
                Util.comparePos(this.mouseStartObj.start, end) != 0) {
                this.selecter.setSelectedRange(this.mouseStartObj.start, end);
                this.cursor.setCursorPos(end);
                this.renderSelectedBg();
            } else if (e.which != 3) {
                this.selecter.clearRange();
                this.clearSearch();
                this.renderSelectedBg();
                if (this.mouseUpTime && Date.now() - this.mouseUpTime < 300) { //双击选中单词
                    this.search();
                }
            }
            // 停止滚动选中
            cancelAnimationFrame(this.selectMoveTimer);
            this.mouseStartObj = null;
            this.mouseUpTime = Date.now();
        },
        // 左右滚动事件
        onHscroll(e) {
            this.scrollLeft = e.target.scrollLeft;
            this.$scroller.scrollLeft = this.scrollLeft;
            this.forceCursorView = false;
        },
        // 上下滚动事件
        onVscroll(e) {
            let startLine = 1;
            this.scrollTop = e.target.scrollTop;
            startLine = Math.floor(this.scrollTop / this.charObj.charHight);
            startLine++;
            this.startLine = this.folder.getRealLine(startLine);
            this.top = -this.scrollTop % this.charObj.charHight;
            this.forceCursorView = false;
            this.tokenizer.onScroll();
            this.render();
            this.setCursorRealPos();
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
                    this.insertContent(text);
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
                    this.insertContent(text);
                    this.$textarea.value = '';
                }
            }
        },
        // 复制事件
        onCopy(e) {
            let mime = window.clipboardData ? "Text" : "text/plain";
            let clipboardData = e.clipboardData || window.clipboardData;
            clipboardData.setData(mime, this.getCopyText());
        },
        onCut(e) {
            let mime = window.clipboardData ? "Text" : "text/plain";
            let clipboardData = e.clipboardData || window.clipboardData;
            clipboardData.setData(mime, this.getCopyText(true));
        },
        // 粘贴事件
        onPaste(e) {
            let mime = window.clipboardData ? "Text" : "text/plain";
            let clipboardData = e.clipboardData || window.clipboardData;
            let copyText = '';
            copyText = clipboardData.getData(mime);
            this.insertContent(copyText);
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
            let that = this;
            if (e.ctrlKey && e.shiftKey) {
                e.preventDefault();
                switch (e.keyCode) {
                    case 37: //ctrl+shift+left
                        this.selecter.select('left', true);
                        break;
                    case 38: //ctrl+shift+up
                        this.moveLineUp();
                        break;
                    case 39: //ctrl+shift+right
                        this.selecter.select('right', true);
                        break;
                    case 40: //ctrl+shift+down
                        this.moveLineDown();
                        break;
                    case 68: //ctrl+shift+d
                        this.copyLineDown();
                        break;
                }
                return false;
            } else if (e.ctrlKey) {
                switch (e.keyCode) {
                    case 37: //left arrow
                        _moveCursor('left', true);
                        this.selecter.clearRange();
                        this.renderSelectedBg();
                        break;
                    case 39: //right arrow
                        _moveCursor('right', true);
                        this.selecter.clearRange();
                        this.renderSelectedBg();
                        break;
                    case 65://ctrl+a,全选
                        e.preventDefault();
                        let end = { line: context.htmls.length, column: context.htmls.peek().text.length };
                        this.selecter.setSelectedRange({ line: 1, column: 0 }, end);
                        this.forceCursorView = false;
                        this.cursor.setCursorPos(end);
                        this.renderSelectedBg();
                        break;
                    case 68: //ctrl+d，搜素
                        e.preventDefault();
                        this.search();
                        break;
                    case 90: //ctrl+z，撤销
                    case 122:
                        e.preventDefault();
                        this.history.undo();
                        break;
                    case 89: //ctrl+y，重做
                    case 121:
                        e.preventDefault();
                        this.history.redo();
                        break;
                }
            } else if (e.shiftKey) {
                switch (e.keyCode) {
                    case 37: //left arrow
                        this.selecter.select('left');
                        break;
                    case 38: //up arrow
                        this.selecter.select('up');
                        break;
                    case 39: //right arrow
                        this.selecter.select('right');
                        break;
                    case 40: //down arrow
                        this.selecter.select('down');
                        break;
                }
            } else {
                switch (e.keyCode) {
                    case 9: //tab键
                        e.preventDefault();
                        this.insertContent('\t');
                        break;
                    case 37: //left arrow
                        _moveCursor('left');
                        this.selecter.clearRange();
                        this.renderSelectedBg();
                        break;
                    case 38: //up arrow
                        _moveCursor('up');
                        this.selecter.clearRange();
                        this.renderSelectedBg();
                        break;
                    case 39: //right arrow
                        _moveCursor('right');
                        this.selecter.clearRange();
                        this.renderSelectedBg();
                        break;
                    case 40: //down arrow
                        _moveCursor('down');
                        this.selecter.clearRange();
                        this.renderSelectedBg();
                        break;
                    case Util.keyCode.DELETE: //delete
                        this.deleteContent(Util.keyCode.DELETE);
                        break;
                    case Util.keyCode.BACKSPACE: //backspace
                        this.deleteContent(Util.keyCode.BACKSPACE);
                        break;
                }
            }

            function _moveCursor(direct, wholeWord) {
                //ctrl+d后，第一次移动光标只是取消选中状态
                if (!that.selecter.checkCursorSelected(that.nowCursorPos)) {
                    that.multiCursorPos.map((cursorPos) => {
                        that.cursor.moveCursor(cursorPos, direct, wholeWord);
                    });
                }
            }
        }
    }
}
</script>