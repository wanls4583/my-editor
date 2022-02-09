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
				:class="{'my-editor-num-active': cursorPos.line==line.num}"
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
						:class="{active: cursorPos.line == line.num}"
						:data-line="line.num"
						:id="'line_'+line.num"
						:key="line.num"
						:style="{height:_lineHeight, 'line-height':_lineHeight}"
						class="my-editor-line"
						v-for="line in renderHtmls"
					>
						<!-- my-editor-bg-color为选中的背景颜色 -->
						<div
							:class="[line.selected ? 'my-editor-bg-color' : '', line.fold == 'close' ? 'fold-close' : '']"
							:data-line="line.num"
							class="my-editor-code"
							v-html="line.html"
						></div>
						<!-- 选中时的首行背景 -->
						<div
							:style="{left: selectedRange.start.left + 'px', width: selectedRange.start.width + 'px'}"
							class="my-editor-line-bg my-editor-bg-color"
							v-if="_startBgLineVisible(line.num)"
						></div>
						<!-- 选中时的末行背景 -->
						<div
							:style="{left: selectedRange.end.left + 'px', width: selectedRange.end.width + 'px'}"
							class="my-editor-line-bg my-editor-bg-color"
							v-if="_endBgLineVisible(line.num)"
						></div>
						<span :style="{left: _tabLineLeft(tab)}" class="my-editor-tab-line" v-for="tab in line.tabNum"></span>
					</div>
					<!-- 模拟光标 -->
					<div
						:style="{height: _lineHeight, top: cursorRealPos.top, left: cursorRealPos.left, visibility: _cursorVisible}"
						class="my-editor-cursor"
						v-show="cursorPos.show"
					></div>
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
		<status-bar :column="cursorPos.column+1" :height="statusHeight" :language.sync="language" :line="cursorPos.line" :tabSize.sync="tabSize" ref="statusBar"></status-bar>
		<!-- 右键菜单 -->
		<panel :checkable="false" :menuList="menuList" :styles="menuStyle" @change="onClickMenu" ref="menu" v-show="menuVisble"></panel>
		<tip :content="tipContent" :styles="tipStyle" v-show="tipContent"></tip>
	</div>
</template>

<script>
import Tokenizer from '@/module/tokenizer/core/index';
import Lint from '@/module/lint/core/index';
import Fold from '@/module/fold/index';
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
    lineIdMap: new Map(), //htmls的唯一标识对象
    renderedIdMap: new Map(), //renderHtmls的唯一标识对象
    foldMap: new Map() //folds的唯一标识对象
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
            cursorPos: {
                line: 1,
                column: 0,
                top: 0,
                left: 0,
                show: false,
                visible: true,
            },
            cursorRealPos: {
                top: '0px',
                left: '0px'
            },
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
            selectedRange: null,
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
            return this.cursorPos.visible ? 'visible' : 'hidden';
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
            let cursorRealPos = this.cursorRealPos;
            let left = Util.getNum(cursorRealPos.left);
            let top = Util.getNum(cursorRealPos.top) + this.top;
            left -= this.scrollLeft;
            left = left < this.charObj.charWidth ? this.charObj.charWidth : left;
            left = left > this.scrollerArea.width - this.charObj.charWidth ? this.scrollerArea.width - this.charObj.charWidth : left;
            top += this.charObj.charHight;
            if (top > this.scrollerArea.height - 2 * this.charObj.charHight) {
                top = this.scrollerArea.height - 2 * this.charObj.charHight;
            }
            return {
                top: top + 'px',
                left: left + 'px'
            }
        },
        _startBgLineVisible() {
            return (num) => {
                return this.selectedRange && num == this.selectedRange.start.line
            }
        },
        _endBgLineVisible() {
            return (num) => {
                return this.selectedRange && num == this.selectedRange.end.line && this.selectedRange.end.line > this.selectedRange.start.line
            }
        },
        _tabLineLeft() {
            return (tab) => {
                return (tab - 1) * this.tabSize * this.charObj.charWidth + 'px';
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
            if (this.cursorPos.show) {
                return;
            }
            this.cursorPos.show = true;
            this.cursorPos.visible = true;
            let _timer = () => {
                clearTimeout(this.curserTimer);
                this.curserTimer = setTimeout(() => {
                    this.cursorPos.visible = !this.cursorPos.visible;
                    _timer();
                }, 500);
            }
            _timer();
        },
        // 隐藏光标
        hideCursor() {
            clearTimeout(this.curserTimer);
            this.cursorPos.show = false;
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
            this.renderHtmls = [];
            for (let i = 0, startLine = this.startLine; i < this.maxVisibleLines && startLine <= context.htmls.length; i++) {
                let lineObj = context.htmls[startLine - 1];
                let lineId = lineObj.lineId;
                let obj = _getObj(lineObj, startLine);
                this.renderHtmls.push(obj);
                context.renderedIdMap.set(lineId, obj);
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
                if (spaceNum) {
                    tabNum = /\t+/.exec(spaceNum[0]);
                    tabNum = tabNum && tabNum[0].length || 0;
                    tabNum = tabNum + Math.ceil((spaceNum[0].length - tabNum) / that.tabSize);
                }
                if (that.selectedRange && line > that.selectedRange.start.line && line < that.selectedRange.end.line) {
                    selected = true;
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
                    selected: selected,
                    fold: fold,
                }
            }
        },
        // 渲染选中背景
        renderSelectedBg(forceCursorView) {
            if (!this.selectedRange) {
                return;
            }
            let start = this.selectedRange.start;
            let end = this.selectedRange.end;
            let same = Util.comparePos(start, end);
            this.setCursorPos(end.line, end.column, forceCursorView);
            if (same > 0) {
                let tmp = start;
                start = end;
                end = tmp;
            } else if (!same) {
                this.clearRnage();
                return;
            }
            let text = context.htmls[start.line - 1].text;
            start.left = this.getStrWidth(text, 0, start.column);
            if (start.line == end.line) {
                start.width = this.getStrWidth(text, start.column, end.column);
            } else {
                start.width = this.getStrWidth(text, start.column);
                end.left = 0;
                text = context.htmls[end.line - 1].text;
                end.width = this.getStrWidth(text, 0, end.column);
                this.renderHtmls.map((item) => {
                    item.selected = item.num > start.line && item.num < end.line;
                });
            }
            this.setSelectedRange(start, end);
        },
        // 清除选中背景
        clearRnage() {
            this.selectedRange = null;
            this.renderHtmls.map((item) => {
                item.selected = false;
            });
        },
        // 插入内容
        insertContent(text, isDoCommand) {
            // 如果有选中区域，需要先删除选中区域
            if (this.selectedRange) {
                this.deleteContent();
            }
            let nowLineText = context.htmls[this.cursorPos.line - 1].text;
            let nowColume = this.cursorPos.column;
            let nowLine = this.cursorPos.line;
            let newLine = nowLine;
            let newColumn = nowColume;
            this.tokenizer.onInsertContentBefore(nowLine);
            this.lint.onInsertContentBefore(nowLine);
            this.folder.onInsertContentBefore(nowLine);
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
                context.htmls = context.htmls.slice(0, this.cursorPos.line - 1).concat(text).concat(context.htmls.slice(this.cursorPos.line));
            } else { // 插入一行
                newColumn += text[0].text.length;
                text[0].text = nowLineText.slice(0, nowColume) + text[0].text + nowLineText.slice(this.cursorPos.column);
                context.htmls.splice(this.cursorPos.line - 1, 1, text[0]);
            }
            newLine += text.length - 1;
            this.maxLine = context.htmls.length;
            this.render();
            this.tokenizer.onInsertContentAfter(newLine);
            this.lint.onInsertContentAfter(newLine);
            this.folder.onInsertContentAfter(newLine);
            this.setLineWidth(text);
            if (context.foldMap.has(nowLine) && text.length > 1) {
                this.unFold(nowLine);
            }
            this.setCursorPos(newLine, newColumn);
            let historyObj = {
                type: Util.command.DELETE,
                start: {
                    line: nowLine,
                    column: nowColume
                },
                end: {
                    line: newLine,
                    column: newColumn
                }
            }
            if (!isDoCommand) { // 新增历史记录
                this.history.pushHistory(historyObj);
            } else { // 撤销或重做操作后，更新历史记录
                this.history.updateHistory(context.history.index, historyObj);
            }
        },
        // 删除内容
        deleteContent(keyCode, isDoCommand) {
            let start = null;
            let startObj = context.htmls[this.cursorPos.line - 1];
            let text = startObj.text;
            let originPos = { line: this.cursorPos.line, column: this.cursorPos.column };
            let deleteText = '';
            let rangeUuid = [];
            let newLine = this.cursorPos.line;
            let newColumn = this.cursorPos.column;
            this.tokenizer.onDeleteContentBefore(this.cursorPos.line);
            this.lint.onDeleteContentBefore(this.cursorPos.line);
            this.folder.onDeleteContentBefore(this.cursorPos.line);
            if (this.selectedRange) { // 删除选中区域
                let end = this.selectedRange.end;
                let endObj = context.htmls[end.line - 1];
                start = this.selectedRange.start;
                startObj = context.htmls[start.line - 1];
                originPos = { line: end.line, column: end.column };
                text = startObj.text;
                deleteText = this.getRangeText(this.selectedRange.start, this.selectedRange.end);
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
            } else if (Util.keyCode.DELETE == keyCode) { // 向后删除一个字符
                if (this.cursorPos.column == text.length) { // 光标处于行尾
                    if (this.cursorPos.line < context.htmls.length) {
                        context.lineIdMap.delete(context.htmls[this.cursorPos.line].lineId);
                        text = startObj.text + context.htmls[this.cursorPos.line].text;
                        context.htmls.splice(this.cursorPos.line, 1);
                        deleteText = '\n';
                    }
                } else {
                    deleteText = text[this.cursorPos.column];
                    text = text.slice(0, this.cursorPos.column) + text.slice(this.cursorPos.column + 1);
                }
                startObj.text = text;
            } else { // 向前删除一个字符
                if (this.cursorPos.column == 0) { // 光标处于行首
                    if (this.cursorPos.line > 1) {
                        let column = context.htmls[this.cursorPos.line - 2].text.length;
                        context.lineIdMap.delete(context.htmls[this.cursorPos.line - 2].lineId);
                        text = context.htmls[this.cursorPos.line - 2].text + text;
                        context.htmls.splice(this.cursorPos.line - 2, 1);
                        deleteText = '\n';
                        newLine = this.cursorPos.line - 1;
                        newColumn = column;
                    }
                } else {
                    deleteText = text[this.cursorPos.column - 1];
                    text = text.slice(0, this.cursorPos.column - 1) + text.slice(this.cursorPos.column);
                    newColumn = this.cursorPos.column - 1;
                }
                startObj.text = text;
            }
            startObj.width = this.getStrWidth(startObj.text);
            startObj.tokens = null;
            startObj.folds = null;
            startObj.states = null;
            this.maxLine = context.htmls.length;
            this.render(); //必须放在tokenizer前面，renderline(lineId)的时候.obj.num将失效
            this.clearRnage();
            this.tokenizer.onDeleteContentAfter(newLine);
            this.lint.onDeleteContentAfter(newLine);
            this.folder.onDeleteContentAfter(newLine);
            if (newLine != this.cursorPos.line || this.cursorPos.column != newColumn) {
                this.setCursorPos(newLine, newColumn);
            }
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
                keyCode: keyCode,
                cursorPos: Util.deepAssign({}, this.cursorPos),
                preCursorPos: originPos,
                text: deleteText
            };
            if (!isDoCommand) { // 新增历史记录
                deleteText && this.history.pushHistory(historyObj);
            } else { // 撤销或重做操作后，更新历史记录
                this.history.updateHistory(context.history.index, historyObj);
            }
        },
        // 折叠行
        foldLine(line) {
            let resultFold = this.folder.foldLine(line);
            this.focus();
            if (resultFold) {
                if (this.cursorPos.line > line && this.cursorPos.line < resultFold.end.line) {
                    let lineObj = context.htmls[line - 1];
                    this.setCursorPos(line, lineObj.text.length);
                }
                this.setScrollerHeight();
                this.setCursorRealPos();
                this.render();
            }
        },
        // 展开折叠行
        unFold(line) {
            this.focus();
            if (this.folder.unFold(line)) {
                this.setScrollerHeight();
                this.setCursorRealPos();
                this.render();
            }
        },
        // 设置光标位置
        setCursorPos(line, column, forceCursorView) {
            this.cursorPos.line = line;
            this.cursorPos.column = column;
            this.cursorPos.visible = true;
            this.forceCursorView = forceCursorView === undefined ? true : forceCursorView;
            cancelAnimationFrame(this.setCursorPos.timer);
            this.setCursorPos.timer = requestAnimationFrame(() => {
                this.$nextTick(() => {
                    this.setCursorRealPos();
                });
            });
        },
        // 设置真实光标位置
        setCursorRealPos() {
            let that = this;
            let left = 0;
            let lineObj = context.htmls[that.cursorPos.line - 1];
            if ($('#line_' + this.cursorPos.line).length && lineObj.tokens && lineObj.tokens.length) {
                left = _getExactLeft();
            } else {
                left = this.getStrWidthByLine(this.cursorPos.line, 0, this.cursorPos.column);
            }
            let top = (this.folder.getRelativeLine(this.cursorPos.line) - this.folder.getRelativeLine(this.startLine)) * this.charObj.charHight;
            let relTop = this.folder.getRelativeLine(this.cursorPos.line) * this.charObj.charHight;
            // 强制滚动使光标处于可见区域
            if (this.forceCursorView) {
                if (relTop > this.scrollTop + this.scrollerArea.height - this.charObj.charHight) {
                    this.$vScroller.scrollTop = relTop + this.charObj.charHight - this.scrollerArea.height;
                } else if (top < 0 || top == 0 && this.top < 0) {
                    this.$vScroller.scrollTop = (this.cursorPos.line - 1) * this.charObj.charHight;
                }
                if (left > this.scrollerArea.width + this.scrollLeft - this.charObj.fullAngleCharWidth) {
                    this.$hScroller.scrollLeft = left + this.charObj.fullAngleCharWidth - this.scrollerArea.width;
                } else if (left < this.scrollLeft) {
                    this.$hScroller.scrollLeft = left - 1;
                }
            }
            this.cursorRealPos = {
                top: top + 'px',
                left: left + 'px'
            };

            function _getExactLeft() {
                let lineObj = context.htmls[that.cursorPos.line - 1];
                let token = lineObj.tokens[0];
                for (let i = 1; i < lineObj.tokens.length; i++) {
                    if (lineObj.tokens[i].column < that.cursorPos.column) {
                        token = lineObj.tokens[i];
                    } else {
                        break;
                    }
                }
                let $token = $('#line_' + that.cursorPos.line).children('.my-editor-code').children('span[data-column="' + token.column + '"]');
                let text = token.value.slice(0, that.cursorPos.column - token.column);
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
        setScrollerHeight() {
            let maxLine = context.htmls.length;
            maxLine = this.folder.getRelativeLine(maxLine);
            this.scrollerHeight = maxLine * this.charObj.charHight + 'px';
        },
        /**
         * 设置选中区域
         * @param {Object} start
         * @param {Object} end
         */
        setSelectedRange(start, end) {
            this.selectedRange = {
                start: start,
                end: end
            }
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
            // this.menuList[0].map((menu) => {
            //     if (['cut', 'copy'].indexOf(menu.op) > -1) {
            //         menu.disabled = !this.selectedRange;
            //     }
            // });
        },
        // 选中菜单
        onClickMenu(menu) {
            switch (menu.op) {
                case 'cut':
                case 'copy':
                    if (this.selectedRange) {
                        let text = this.getRangeText(this.selectedRange.start, this.selectedRange.end);
                        if (menu.op == 'cut') {
                            this.deleteContent();
                        }
                        Util.writeClipboard(text);
                    } else {
                        let text = context.htmls[this.cursorPos.line - 1].text;
                        if (menu.op === 'cut') {
                            text && this.setSelectedRange({ line: this.cursorPos.line, column: 0 }, { line: this.cursorPos.line, column: text.length });
                            text && this.deleteContent();
                        }
                        Util.writeClipboard(text);
                    }
                    break;
                case 'paste':
                    if (this.selectedRange) {
                        this.deleteContent();
                    }
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
            this.focus();
            if (e.which == 3) { //右键
                return;
            }
            let pos = this.getPosByEvent(e);
            this.setCursorPos(pos.line, pos.column);
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
                this.setSelectedRange(Object.assign({}, this.mouseStartObj.start), this.getPosByEvent(e));
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
                let originLine = that.cursorPos.line;
                let originColumn = that.cursorPos.column;
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
                    that.setCursorPos(line, column);
                    that.setSelectedRange(that.mouseStartObj.start, { line: line, column: column });
                    that.renderSelectedBg();
                    that.selectMoveTimer = requestAnimationFrame(() => {
                        _run(autoDirect, speed)
                    });
                }
            }
        },
        // 鼠标抬起事件
        onScrollerMup(e) {
            // 按下到抬起的间隔大于100ms，属于选中结束事件
            if (this.mouseStartObj && Date.now() - this.mouseStartObj.time > 100) {
                let end = this.getPosByEvent(e);
                this.setSelectedRange(this.mouseStartObj.start, end);
                this.renderSelectedBg();
                this.setCursorPos(end.line, end.column);
            } else if (e.which != 3) {
                this.clearRnage();
            }
            // 停止滚动选中
            cancelAnimationFrame(this.selectMoveTimer);
            this.mouseStartObj = null;
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
            if (this.selectedRange) {
                let text = this.getRangeText(this.selectedRange.start, this.selectedRange.end);
                clipboardData.setData(mime, text);
            } else {
                clipboardData.setData(mime, context.htmls[this.cursorPos.line - 1].text);
            }
        },
        onCut(e) {
            let mime = window.clipboardData ? "Text" : "text/plain";
            let clipboardData = e.clipboardData || window.clipboardData;
            if (this.selectedRange) {
                let text = this.getRangeText(this.selectedRange.start, this.selectedRange.end);
                clipboardData.setData(mime, text);
                this.deleteContent();
            } else {
                let text = context.htmls[this.cursorPos.line - 1].text;
                text && clipboardData.setData(mime, context.htmls[this.cursorPos.line - 1].text);
                text && this.setSelectedRange({ line: this.cursorPos.line, column: 0 }, { line: this.cursorPos.line, column: text.length });
                this.deleteContent();
            }
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
            this.showCursor();
        },
        // 失去焦点
        onBlur() {
            this.hideCursor();
            this.menuVisble = false;
        },
        // 键盘按下事件
        onKeyDown(e) {
            if (e.ctrlKey) {
                switch (e.keyCode) {
                    case 65://ctrl+a,全选
                        e.preventDefault();
                        this.setSelectedRange({ line: 1, column: 0 }, { line: context.htmls.length, column: context.htmls.peek().text.length })
                        this.renderSelectedBg(false);
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
            } else {
                switch (e.keyCode) {
                    case 9: //tab键
                        e.preventDefault();
                        this.insertContent('\t');
                        break;
                    case 37: //left arrow
                        if (this.cursorPos.column > 0) {
                            this.setCursorPos(this.cursorPos.line, this.cursorPos.column - 1);
                        } else if (this.cursorPos.line > 1) {
                            this.setCursorPos(this.cursorPos.line - 1, context.htmls[this.cursorPos.line - 2].text.length);
                        }
                        this.clearRnage();
                        break;
                    case 38: //up arrow
                        if (this.cursorPos.line > 1) {
                            let text = context.htmls[this.cursorPos.line - 1].text;
                            let width = this.getStrWidth(text, 0, this.cursorPos.column);
                            text = context.htmls[this.cursorPos.line - 2].text;
                            let column = this.getColumnByWidth(text, width);
                            this.setCursorPos(this.cursorPos.line - 1, column);
                        }
                        this.clearRnage();
                        break;
                    case 39: //right arrow
                        let text = context.htmls[this.cursorPos.line - 1].text;
                        if (this.cursorPos.column < text.length) {
                            this.setCursorPos(this.cursorPos.line, this.cursorPos.column + 1);
                        } else if (this.cursorPos.line < context.htmls.length) {
                            this.setCursorPos(this.cursorPos.line + 1, 0);
                        }
                        this.clearRnage();
                        break;
                    case 40: //down arrow
                        if (this.cursorPos.line < context.htmls.length) {
                            let text = context.htmls[this.cursorPos.line - 1].text;
                            let width = this.getStrWidth(text, 0, this.cursorPos.column);
                            text = context.htmls[this.cursorPos.line].text;
                            let column = this.getColumnByWidth(text, width);
                            this.setCursorPos(this.cursorPos.line + 1, column);
                        }
                        this.clearRnage();
                        break;
                    case Util.keyCode.DELETE: //delete
                        this.deleteContent(Util.keyCode.DELETE);
                        break;
                    case Util.keyCode.BACKSPACE: //backspace
                        this.deleteContent(Util.keyCode.BACKSPACE);
                        break;
                }
            }
        }
    }
}
</script>