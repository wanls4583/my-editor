<template>
	<div :style="{'padding-bottom': _statusHeight}" @selectstart.prevent class="my-editor-wrap">
		<!-- 行号 -->
		<div :style="{top: _numTop}" class="my-editor-nums">
			<!-- 占位行号，避免行号宽度滚动时变化 -->
			<div class="my-editor-num" style="visibility:hidden">{{maxLine}}</div>
			<div :class="{'my-editor-num-active': cursorPos.line==num}" :key="num" class="my-editor-num" v-for="num in nums">
				<span>{{num}}</span>
			</div>
		</div>
		<div :style="{'box-shadow': _leftShadow}" class="my-editor-content-wrap">
			<!-- 可滚动区域 -->
			<div @mousedown="onScrollerMdown" @wheel.prevent="onWheel" class="my-editor-content-scroller" ref="scroller">
				<!-- 内如区域 -->
				<div :style="{top: _top, minWidth: _contentMinWidth}" @selectend.prevent="onSelectend" class="my-editor-content" ref="content">
					<div :class="{active: cursorPos.line == line.num}" :key="line.num" class="my-editor-line" v-for="line in renderHtmls">
						<!-- my-editor-bg-color为选中的背景颜色 -->
						<div :class="[line.selected ? 'my-editor-bg-color' : '']" class="my-editor-code" v-html="line.html"></div>
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
						:style="{height: _lineHeight, top: _cursorRealPos.top, left: _cursorRealPos.left, visibility: _cursorVisible}"
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
				<div :style="{height: _vScrollHeight}" class="my-editor-v-scroller"></div>
			</div>
			<!-- 输入框 -->
			<textarea
				:style="{top: _textAreaPos.top, left: _textAreaPos.left}"
				@blur="onBlur"
				@compositionend="onCompositionend"
				@compositionstart="onCompositionstart"
				@copy.prevent="onCopy"
				@focus="onFocus"
				@input="onInput"
				@keydown="onKeyDown"
				@paste.prevent="onPaste"
				class="my-editor-textarea"
				ref="textarea"
			></textarea>
		</div>
		<status-bar :column="cursorPos.column+1" :height="statusHeight" :language="language" :line="cursorPos.line" :tabSize="tabSize"></status-bar>
	</div>
</template>

<script>
import Highlight from '@/highlight/core/highlight';
import StatusBar from './StatusBar';
const context = {
    htmls: []
}
export default {
    name: 'Home',
    components: {
        StatusBar
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
            language: 'JavaScript',
            statusHeight: 23,
            tabSize: 4,
            nums: [1],
            renderHtmls: [],
            startLine: 1,
            startToEndToken: null,
            top: 0,
            scrollLeft: 0,
            scrollTop: 0,
            maxVisibleLines: 1,
            maxLine: 1,
            scrollerArea: {},
            selectedRange: null,
            maxWidthObj: {
                lineId: null,
                width: 0
            }
        }
    },
    computed: {
        _numTop() {
            return this.top - this.charObj.charHight + 'px';
        },
        _leftShadow() {
            return this.scrollLeft ? '17px 0 16px -16px rgba(0, 0, 0, 0.4) inset' : 'none';
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
        _vScrollHeight() {
            return this.maxLine * this.charObj.charHight + 'px';
        },
        _hScrollWidth() {
            return this.maxWidthObj.width ? this.maxWidthObj.width + 'px' : 'auto';
        },
        _contentMinWidth() {
            return this.maxWidthObj.width > this.scrollerArea.width ? this.maxWidthObj.width + 'px' : '100%';
        },
        _cursorRealPos() {
            let left = this.getStrWidthByLine(this.cursorPos.line, 0, this.cursorPos.column);
            let top = (this.cursorPos.line - this.startLine) * this.charObj.charHight;
            let relTop = this.cursorPos.line * this.charObj.charHight;
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
            return {
                top: top + 'px',
                left: left + 'px'
            };
        },
        _textAreaPos() {
            let cursorRealPos = this._cursorRealPos;
            let left = this.$util.getNum(cursorRealPos.left);
            let top = this.$util.getNum(cursorRealPos.top) + this.top;
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
    },
    created() {
        window.editor = this;
        window.context = context;
        this.initData();
        this.initEvent();
    },
    mounted() {
        this.$scroller = this.$refs.scroller;
        this.$content = this.$refs.content;
        this.$textarea = this.$refs.textarea;
        this.$vScroller = this.$refs.vScroller;
        this.$hScroller = this.$refs.hScroller;
        this.maxVisibleLines = Math.ceil(this.$scroller.clientHeight / this.charObj.charHight) + 1;
        this.charObj = this.$util.getCharWidth(this.$scroller);
        this.render();
        this.focus();
    },
    methods: {
        // 初始化数据
        initData() {
            this.space = this.$util.space(this.tabSize);
            this.history = []; // 操作历史
            this.lineId = Number.MIN_SAFE_INTEGER;
            this.lineIdMap = new Map(); // htmls的唯一标识对象
            this.renderedIdMap = new Map(); // renderHtmls的唯一标识对象
            context.htmls = [{
                lineId: this.lineId++,
                text: '',
                html: '',
                width: 0,
                tokens: null,
                states: null
            }];
            this.lineIdMap.set(context.htmls[0].lineId, context.htmls[0]);
            this.highlighter = new Highlight(this, context);
        },
        // 初始化文档事件
        initEvent() {
            this.$(document).on('mousemove', (e) => {
                this.onScrollerMmove(e);
            });
            this.$(document).on('mouseup', (e) => {
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
            setTimeout(() => {
                this.$textarea.focus();
            }, 300);
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
        renderLine(line) {
            let that = this;
            // 只更新一行
            if (line) {
                let obj = this.renderHtmls[line - this.startLine];
                this.renderedIdMap.delete(obj.lineId);
                obj.html = context.htmls[line - 1].html;
                obj.text = context.htmls[line - 1].text;
                obj.lineId = context.htmls[line - 1].lineId;
                Object.assign(obj, _getObj(obj, line));
                this.renderedIdMap.set(lineId, obj);
                return;
            }
            this.renderedIdMap.clear();
            this.renderHtmls = context.htmls.slice(this.startLine - 1, this.startLine - 1 + this.maxVisibleLines).map((item, index) => {
                let num = this.startLine + index;
                let lineId = item.lineId;
                item = _getObj(item, num);
                this.renderedIdMap.set(lineId, item);
                return item;
            });;
            this.nums = this.renderHtmls.map((item) => {
                return item.num
            });

            function _getObj(item, num) {
                let selected = false;
                let tabNum = /^\s+/.exec(item.text);
                tabNum = tabNum && Math.floor(tabNum[0].length / 4) || 0;
                if (that.selectedRange && num > that.selectedRange.start.line && num < that.selectedRange.end.line) {
                    selected = true;
                }
                return {
                    html: item.html,
                    num: num,
                    tabNum: tabNum,
                    selected: selected,
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
            let same = this.$util.comparePos(start, end);
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
            this.selectedRange.start = start;
            this.selectedRange.end = end;
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
            let newColume = nowColume;
            text = text.replace(/\t/g, this.space);
            text = text.split(/\r\n|\n/);
            text = text.map((item) => {
                item = {
                    lineId: this.lineId++,
                    text: item,
                    html: this.$util.htmlTrans(item),
                    width: 0,
                    tokens: null,
                    states: null
                };
                this.lineIdMap.set(item.lineId, item);
                return item;
            });
            if (text.length > 1) { // 插入多行
                newColume = text[text.length - 1].text.length;
                text[0].text = nowLineText.slice(0, nowColume) + text[0].text;
                text[0].html = this.$util.htmlTrans(text[0].text);
                text[text.length - 1].text = text[text.length - 1].text + nowLineText.slice(nowColume);
                text[text.length - 1].html = this.$util.htmlTrans(text[text.length - 1].text);
                context.htmls = context.htmls.slice(0, this.cursorPos.line - 1).concat(text).concat(context.htmls.slice(this.cursorPos.line));
            } else { // 插入一行
                newColume += text[0].text.length;
                text[0].text = nowLineText.slice(0, nowColume) + text[0].text + nowLineText.slice(this.cursorPos.column);
                text[0].html = this.$util.htmlTrans(text[0].text);
                context.htmls.splice(this.cursorPos.line - 1, 1, text[0]);
            }
            newLine += text.length - 1;
            this.maxLine = context.htmls.length;
            this.highlighter.onInsertContent(nowLine);
            this.setLineWidth(text);
            this.render();
            this.$nextTick(() => {
                this.setCursorPos(newLine, newColume);
            });
            let historyObj = {
                type: this.$util.command.DELETE,
                start: {
                    line: nowLine,
                    column: nowColume
                },
                end: {
                    line: newLine,
                    column: newColume
                }
            }
            if (!isDoCommand) { // 新增历史记录
                this.pushHistory(historyObj);
            } else { // 撤销或重做操作后，更新历史记录
                this.updateHistory(this.history.index, historyObj);
            }
        },
        // 删除内容
        deleteContent(keyCode, isDoCommand) {
            let start = null;
            let startObj = context.htmls[this.cursorPos.line - 1];
            let text = startObj.text;
            let ifOneLine = false; // 是否只需更新一行
            let originPos = { line: this.cursorPos.line, column: this.cursorPos.column };
            let deleteText = '';
            let rangeUuid = [];
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
                    this.lineIdMap.clear();
                    this.lineIdMap.set(startObj.lineId, startObj);
                } else {
                    rangeUuid = context.htmls.slice(start.line - 1, end.line).map((item) => {
                        this.lineIdMap.delete(item.lineId);
                        return item.lineId;
                    });
                }
                if (start.line == end.line) { // 单行选中
                    text = text.slice(0, start.column) + text.slice(end.column);
                    startObj.text = text;
                    ifOneLine = true;
                } else { // 多行选中
                    text = text.slice(0, start.column);
                    startObj.text = text;
                    text = endObj.text;
                    text = text.slice(end.column);
                    startObj.text += text;
                    context.htmls.splice(start.line, end.line - start.line);
                }
                this.setCursorPos(start.line, start.column);
            } else if (this.$util.keyCode.DELETE == keyCode) { // 向后删除一个字符
                if (this.cursorPos.column == text.length) { // 光标处于行尾
                    if (this.cursorPos.line < context.htmls.length) {
                        this.lineIdMap.delete(context.htmls[this.cursorPos.line].lineId);
                        text = startObj.text + context.htmls[this.cursorPos.line].text;
                        context.htmls.splice(this.cursorPos.line, 1);
                        deleteText = '\n';
                    }
                } else {
                    deleteText = text[this.cursorPos.column];
                    text = text.slice(0, this.cursorPos.column) + text.slice(this.cursorPos.column + 1);
                    ifOneLine = true;
                }
                startObj.text = text;
            } else { // 向前删除一个字符
                if (this.cursorPos.column == 0) { // 光标处于行首
                    if (this.cursorPos.line > 1) {
                        let column = context.htmls[this.cursorPos.line - 2].text.length;
                        this.lineIdMap.delete(context.htmls[this.cursorPos.line - 2].lineId);
                        text = context.htmls[this.cursorPos.line - 2].text + text;
                        context.htmls.splice(this.cursorPos.line - 2, 1);
                        this.setCursorPos(this.cursorPos.line - 1, column);
                        deleteText = '\n';
                    }
                } else {
                    deleteText = text[this.cursorPos.column - 1];
                    text = text.slice(0, this.cursorPos.column - 1) + text.slice(this.cursorPos.column);
                    this.setCursorPos(this.cursorPos.line, this.cursorPos.column - 1);
                    ifOneLine = true;
                }
                startObj.text = text;
            }
            startObj.html = this.$util.htmlTrans(startObj.text);
            startObj.width = this.getStrWidth(startObj.text);
            startObj.tokens = null;
            startObj.states = null;
            this.maxLine = context.htmls.length;
            this.highlighter.onDeleteContent(this.cursorPos.line);
            this.clearRnage();
            this.render();
            // 更新最大文本宽度
            if (startObj.width >= this.maxWidthObj.width) {
                this.maxWidthObj = {
                    lineId: startObj.lineId,
                    width: startObj.width
                }
            } else if (rangeUuid.indexOf(this.maxWidthObj.lineId) > -1) {
                this.setMaxWidth();
            }
            let historyObj = {
                type: this.$util.command.INSERT,
                keyCode: keyCode,
                cursorPos: this.$util.deepAssign({}, this.cursorPos),
                preCursorPos: originPos,
                text: deleteText
            };
            if (!isDoCommand) { // 新增历史记录
                deleteText && this.pushHistory(historyObj);
            } else { // 撤销或重做操作后，更新历史记录
                this.updateHistory(this.history.index, historyObj);
            }
        },
        // 撤销操作
        undo() {
            if (this.history.index > 0) {
                let command = this.history[this.history.index - 1];
                this.doCommand(command);
                this.history.index--;
            }
        },
        // 重做操作
        redo() {
            if (this.history.index < this.history.length) {
                let command = this.history[this.history.index];
                this.history.index++;
                this.doCommand(command);
            }
        },
        // 操作命令
        doCommand(command) {
            switch (command.type) {
                case this.$util.command.DELETE:
                    this.selectedRange = {
                        start: command.start,
                        end: command.end
                    }
                    this.deleteContent(this.$util.keyCode.BACKSPACE, true);
                    break;
                case this.$util.command.INSERT:
                    this.setCursorPos(command.cursorPos.line, command.cursorPos.column);
                    this.insertContent(command.text, true);
                    break;
            }
        },
        // 添加历史记录
        pushHistory(command) {
            var lastCommand = this.history[this.history.index - 1];
            this.history = this.history.slice(0, this.history.index);
            // 两次操作可以合并
            if (lastCommand && lastCommand.type == command.type && Date.now() - this.pushHistoryTime < 2000) {
                if (
                    lastCommand.type == this.$util.command.DELETE &&
                    command.end.line == command.start.line &&
                    this.$util.comparePos(lastCommand.end, command.start) == 0) {
                    lastCommand.end = command.end;
                } else if (
                    lastCommand.type == this.$util.command.INSERT &&
                    command.preCursorPos.line == command.cursorPos.line &&
                    this.$util.comparePos(lastCommand.cursorPos, command.preCursorPos) == 0
                ) {
                    lastCommand.text = command.text + lastCommand.text;
                    lastCommand.cursorPos = command.cursorPos;
                } else {
                    this.history.push(command);
                }
            } else {
                this.history.push(command);
            }
            this.history.index = this.history.length;
            this.pushHistoryTime = Date.now();
        },
        // 更新历史记录
        updateHistory(index, command) {
            this.history[index - 1] = command;
        },
        // 设置鼠标位置
        setCursorPos(line, column, forceCursorView) {
            this.cursorPos.line = line;
            this.cursorPos.column = column;
            this.cursorPos.visible = true;
            this.forceCursorView = forceCursorView === undefined ? true : forceCursorView;
        },
        // 获取最大宽度
        setMaxWidth() {
            let maxWidthObj = { line: 1, width: 0 };
            context.htmls.map((item, index) => {
                if (item.width > maxWidthObj.width) {
                    maxWidthObj = {
                        line: index + 1,
                        width: item.width
                    }
                }
            });
            this.maxWidthObj = maxWidthObj;
        },
        setLineWidth(texts) {
            let index = 0;
            let that = this;

            _setLineWidth();

            function _setLineWidth() {
                let count = 0;
                while (count < 10000 && index < texts.length) {
                    let lineObj = texts[index];
                    if (that.lineIdMap.has(lineObj.lineId)) {
                        let width = that.getStrWidth(lineObj.text);
                        // 增加2像素，给光标预留位置
                        width += 2;
                        lineObj.width = width;
                        if (width > that.maxWidthObj.width) {
                            that.maxWidthObj = {
                                lineId: lineObj.lineId,
                                width: width
                            }
                        }
                    }
                    index++;
                    count++;
                }
                if (index < texts.length) {
                    that.setLineWidth.timer = requestAnimationFrame(function () {
                        _setLineWidth();
                    });
                }
            }
        },
        // 获取文本在浏览器中的宽度
        getStrWidth(str, start, end) {
            return this.$util.getStrWidth(str, this.charObj.charWidth, this.charObj.fullAngleCharWidth, start, end);
        },
        // 获取行对应的文本在浏览器中的宽度
        getStrWidthByLine(line, start, end) {
            return this.getStrWidth(context.htmls[line - 1].text, start, end);
        },
        // 根据文本宽度计算当前列号
        getColumnByWidth(text, offsetX) {
            let halfCharWidth = this.charObj.charWidth / 2;
            let halfFullCharWidth = this.charObj.fullAngleCharWidth / 2;
            let left = 0, right = text.length;
            let mid, width, w1, w2;
            while (left < right) {
                mid = Math.floor((left + right) / 2);
                width = this.getStrWidth(text, 0, mid);
                w1 = text[mid - 1] && text[mid - 1].match(this.$util.fullAngleReg) ? halfFullCharWidth : halfCharWidth;
                w2 = text[mid] && (text[mid].match(this.$util.fullAngleReg) ? halfFullCharWidth : halfCharWidth) || w1;
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
            let $scroller = this.$(this.$scroller);
            let offset = $scroller.offset();
            let column = 0;
            let clientX = e.clientX < 0 ? 0 : e.clientX;
            let clientY = e.clientY < 0 ? 0 : e.clientY;
            let line = Math.ceil((clientY + this.scrollTop - offset.top) / this.charObj.charHight) || 1;
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
        // 鼠标按下事件
        onScrollerMdown(e) {
            let pos = this.getPosByEvent(e);
            this.setCursorPos(pos.line, pos.column);
            this.focus();
            this.clearRnage();
            this.mouseStartObj = {
                time: Date.now(),
                start: pos
            }
        },
        // 鼠标移动事件
        onScrollerMmove(e) {
            let that = this;
            if (this.mouseStartObj && Date.now() - this.mouseStartObj.time > 100) {
                var offset = this.$(this.$scroller).offset();
                this.selectedRange = {
                    start: Object.assign({}, this.mouseStartObj.start),
                    end: this.getPosByEvent(e)
                }
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
                    that.selectedRange = {
                        start: Object.assign(that.mouseStartObj.start),
                        end: {
                            line: line,
                            column: column
                        }
                    }
                    that.selectedRange.start = that.mouseStartObj.start;
                    that.selectedRange.end = {
                        line: line,
                        column: column
                    }
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
                this.selectedRange = {
                    start: this.mouseStartObj.start,
                    end: end
                }
                this.renderSelectedBg();
                this.setCursorPos(end.line, end.column);
            } else {
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
            this.scrollTop = e.target.scrollTop;
            this.startLine = Math.floor(this.scrollTop / this.charObj.charHight);
            this.startLine++;
            this.top = -this.scrollTop % this.charObj.charHight;
            this.forceCursorView = false;
            this.highlighter.onScroll();
            this.render();
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
        },
        // 键盘按下事件
        onKeyDown(e) {
            if (e.ctrlKey) {
                switch (e.keyCode) {
                    case 65://ctrl+a,全选
                        e.preventDefault();
                        this.selectedRange = {
                            start: {
                                line: 1,
                                column: 0
                            },
                            end: {
                                line: context.htmls.length,
                                column: context.htmls[context.htmls.length - 1].text.length
                            }
                        }
                        this.renderSelectedBg(false);
                        break;
                    case 90: //ctrl+z，撤销
                    case 122:
                        e.preventDefault();
                        this.undo();
                        break;
                    case 89: //ctrl+y，重做
                    case 121:
                        e.preventDefault();
                        this.redo();
                        break;
                }
            } else {
                switch (e.keyCode) {
                    case 9: //tab键
                        e.preventDefault();
                        this.insertContent(this.space);
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
                    case this.$util.keyCode.DELETE: //delete
                        this.deleteContent(this.$util.keyCode.DELETE);
                        break;
                    case this.$util.keyCode.BACKSPACE: //backspace
                        this.deleteContent(this.$util.keyCode.BACKSPACE);
                        break;
                }
            }
        }
    }
}
</script>