<template>
	<div @selectstart.prevent class="my-editor-wrap">
		<!-- 行号 -->
		<div :style="{top: top + 'px'}" class="my-editor-nums">
			<div :class="{'my-editor-num-active': cursorPos.line==num}" :key="num" class="my-editor-num" v-for="num in nums">
				<span>{{num}}</span>
			</div>
		</div>
		<div class="my-editor-content-wrap">
			<!-- 可滚动区域 -->
			<div @mousedown="onScrollerMdown" @wheel.prevent="onWheel" class="my-editor-content-scroller" ref="scroller">
				<!-- 内如区域 -->
				<div :style="{top: top + 'px', minWidth: _contentMinWidth}" @selectend.prevent="onSelectend" class="my-editor-content" ref="content">
					<div :class="{active: cursorPos.line == line.num}" :key="line.num" class="my-editor-line" v-for="line in renderHtmls">
						<!-- my-editor-bg-color为选中的背景颜色 -->
						<div
							:class="{'my-editor-bg-color': selectedRange && line.num > selectedRange.start.line && line.num < selectedRange.end.line}"
							class="my-editor-code"
						>{{line.html}}</div>
						<!-- 选中时的首行背景 -->
						<div
							:style="{left: selectedRange.start.left + 'px', width: selectedRange.start.width + 'px'}"
							class="my-editor-line-bg my-editor-bg-color"
							v-if="selectedRange && line.num == selectedRange.start.line"
						></div>
						<!-- 选中时的末行背景 -->
						<div
							:style="{left: selectedRange.end.left + 'px', width: selectedRange.end.width + 'px'}"
							class="my-editor-line-bg my-editor-bg-color"
							v-if="selectedRange && line.num == selectedRange.end.line && selectedRange.end.line > selectedRange.start.line"
						></div>
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
			<div @scroll="onHscroll" class="my-editor-h-scroller-wrap" ref="hScroller">
				<div :style="{width: _hScrollWidth}" class="my-editor-h-scroller"></div>
			</div>
			<!-- 垂直滚动条 -->
			<div @scroll="onVscroll" class="my-editor-v-scroller-wrap" ref="vScroller">
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
	</div>
</template>

<script>
export default {
    name: 'Home',
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
            htmls: [{
                text: '',
                html: '',
                width: 0
            }],
            nums: [1],
            renderHtmls: [],
            startLine: 1,
            top: 0,
            scrollLeft: 0,
            scrollTop: 0,
            maxLine: 0,
            scrollerArea: {},
            selectedRange: null,
            maxWidthObj: {
                line: 1,
                width: 0
            }
        }
    },
    computed: {
        _lineHeight() {
            return this.charObj.charHight + 'px';
        },
        _cursorVisible() {
            return this.cursorPos.visible ? 'visible' : 'hidden';
        },
        _vScrollHeight() {
            return this.htmls.length * this.charObj.charHight + 'px';
        },
        _hScrollWidth() {
            return this.maxWidthObj.width ? this.maxWidthObj.width + 'px' : 'auto';
        },
        _contentMinWidth() {
            return this.maxWidthObj.width > this.scrollerArea.width ? this.maxWidthObj.width + 'px' : '100%';
        },
        _cursorRealPos() {
            let left = this.getStrWidth(this.htmls[this.cursorPos.line - 1].text, 0, this.cursorPos.column);
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
        }
    },
    created() {
    },
    mounted() {
        this.$scroller = this.$refs.scroller;
        this.$content = this.$refs.content;
        this.$textarea = this.$refs.textarea;
        this.$vScroller = this.$refs.vScroller;
        this.$hScroller = this.$refs.hScroller;
        this.maxLine = Math.ceil(this.$scroller.clientHeight / this.charObj.charHight) + 1;
        this.charObj = this.$util.getCharWidth(this.$scroller);
        this.render();
        this.focus();
        this.initData();
        this.initEvent();
    },
    methods: {
        initData() {
            this.tabSize = 4;
            this.space = this.$util.space(this.tabSize);
        },
        initEvent() {
            this.$(document).on('mousemove', (e) => {
                this.onScrollerMmove(e);
            });
            this.$(document).on('mouseup', (e) => {
                this.onScrollerMup(e);
            });
        },
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
        hideCursor() {
            clearTimeout(this.curserTimer);
            this.cursorPos.show = false;
        },
        focus() {
            setTimeout(() => {
                this.$textarea.focus();
            }, 300);
        },
        render() {
            this.renderLine();
            this.$nextTick(() => {
                this.scrollerArea = {
                    height: this.$scroller.clientHeight,
                    width: this.$scroller.clientWidth,
                }
            });
        },
        renderLine() {
            this.renderHtmls = this.htmls.slice(this.startLine - 1, this.startLine - 1 + this.maxLine);
            this.renderHtmls = this.renderHtmls.map((item, index) => {
                return {
                    html: item.html,
                    num: this.startLine + index
                }
            });
            this.nums = this.renderHtmls.map((item) => {
                return item.num
            });
        },
        renderSelectedBg() {
            if (!this.selectedRange) {
                return;
            }
            let start = this.selectedRange.start;
            let end = this.selectedRange.end;
            let same = this.$util.comparePos(start, end);
            this.setCursorPos(end.line, end.column);
            if (same > 0) {
                let tmp = start;
                start = end;
                end = tmp;
            } else if (!same) {
                this.clearRnage();
                return;
            }
            let text = this.htmls[start.line - 1].text;
            start.left = this.getStrWidth(text, 0, start.column);
            if (start.line == end.line) {
                start.width = this.getStrWidth(text, start.column, end.column);
            } else {
                start.width = this.getStrWidth(text, start.column);
                end.left = 0;
                text = this.htmls[end.line - 1].text;
                end.width = this.getStrWidth(text, 0, end.column);
            }
            this.selectedRange.start = start;
            this.selectedRange.end = end;
        },
        clearRnage() {
            this.selectedRange = null;
        },
        // 插入内容
        insertContent(text) {
            let nowLineText = this.htmls[this.cursorPos.line - 1].text;
            let nowColume = this.cursorPos.column;
            let newLine = this.cursorPos.line;
            let newColume = nowColume;
            text = text.replace(/\t/g, this.space);
            text = text.split(/\r\n|\n/);
            text = text.map((item) => {
                return {
                    text: item,
                    html: item
                }
            });
            if (text.length > 1) { // 插入多行
                newColume = text[text.length - 1].text.length;
                text[0].text = nowLineText.slice(0, nowColume) + text[0].text;
                text[0].html = text[0].text;
                text[text.length - 1].text = text[text.length - 1].text + nowLineText.slice(nowColume);
                text[text.length - 1].html = text[text.length - 1].text;
                this.htmls = this.htmls.slice(0, this.cursorPos.line - 1).concat(text).concat(this.htmls.slice(this.cursorPos.line));
            } else { // 插入一行
                newColume += text[0].text.length;
                this.htmls[this.cursorPos.line - 1].text = nowLineText.slice(0, nowColume) + text[0].text + nowLineText.slice(this.cursorPos.column);
                this.htmls[this.cursorPos.line - 1].html = this.htmls[this.cursorPos.line - 1].text;
                text[0] = this.htmls[this.cursorPos.line - 1];
            }
            text.map((item, index) => {
                let width = this.getStrWidth(item.text);
                // 增加2像素，给光标预留位置
                width += 2;
                item.width = width;
                if (width > this.maxWidthObj.width) {
                    this.maxWidthObj = {
                        line: this.cursorPos.line + index,
                        width: width
                    }
                }
            });
            newLine += text.length - 1;
            this.render();
            this.$nextTick(() => {
                this.setCursorPos(newLine, newColume);
            });
        },
        // 删除内容
        deleteContent(keyCode) {

        },
        // 设置鼠标位置
        setCursorPos(line, column) {
            this.cursorPos.line = line;
            this.cursorPos.column = column;
            this.cursorPos.visible = true;
            this.forceCursorView = true;
        },
        // 获取最大宽度
        setMaxWidth() {
            let maxWidthObj = { line: 1, width: 0 };
            this.htmls.map((item, index) => {
                if (item.width > maxWidthObj.width) {
                    maxWidthObj = {
                        line: index + 1,
                        width: item.width
                    }
                }
            });
            this.maxWidthObj = maxWidthObj;
        },
        getStrWidth(str, start, end) {
            return this.$util.getStrWidth(str, this.charObj.charWidth, this.charObj.fullAngleCharWidth, start, end);
        },
        getColumnByWidth(text, offsetX) {
            let halfCharWidth = this.charObj.charWidth / 2;
            let halfFullCharWidth = this.charObj.fullAngleCharWidth / 2;
            let left = 0, right = text.length;
            let mid, width, w;
            while (left < right) {
                mid = Math.floor((left + right) / 2);
                width = this.getStrWidth(text, 0, mid);
                w = text[mid - 1] && text[mid - 1].match(this.$util.fullAngleReg) ? halfFullCharWidth : halfCharWidth;
                if (!mid || Math.abs(width - offsetX) < w) {
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
            if (line > this.htmls.length) {
                line = this.htmls.length;
                column = this.htmls[line - 1].text.length;
            } else {
                column = this.getColumnByWidth(this.htmls[line - 1].text, clientX + this.scrollLeft - offset.left);
            }
            return {
                line: line,
                column: column
            }
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
                    line = line < 1 ? 1 : (line > that.htmls.length ? that.htmls.length : line);
                    column = column < 0 ? 0 : (column > that.htmls[originLine - 1].text.length ? that.htmls[originLine - 1].text.length : column);
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
                //返回false阻止默认复制，否则setData无效
                return false;
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
            if (e.ctrlKey && e.keyCode == 65) { //ctrl+a,全选
                e.preventDefault();
                this.selectedRange = {
                    start: {
                        line: 1,
                        column: 0
                    },
                    end: {
                        line: maxLength,
                        column: this.htmls[this.htmls.length - 1].text.length
                    }
                }
                this.renderSelectedBg();
            } else if (e.ctrlKey && (e.keyCode == 90 || e.keyCode == 122)) { //ctrl+z，撤销
                e.preventDefault();
                this.clearRnage();
            } else if (e.ctrlKey && (e.keyCode == 89 || e.keyCode == 121)) { //ctrl+y，重做
                e.preventDefault();
                this.clearRnage();
            } else {
                switch (e.keyCode) {
                    case 37: //left arrow
                        if (this.cursorPos.column > 0) {
                            this.setCursorPos(this.cursorPos.line, this.cursorPos.column - 1);
                        } else if (this.cursorPos.line > 1) {
                            this.setCursorPos(this.cursorPos.line - 1, this.htmls[this.cursorPos.line - 2].text.length);
                        }
                        this.clearRnage();
                        break;
                    case 38: //up arrow
                        if (this.cursorPos.line > 1) {
                            let text = this.htmls[this.cursorPos.line - 1].text;
                            let width = this.getStrWidth(text, 0, this.cursorPos.column);
                            text = this.htmls[this.cursorPos.line - 2].text;
                            let column = this.getColumnByWidth(text, width);
                            this.setCursorPos(this.cursorPos.line - 1, column);
                        }
                        this.clearRnage();
                        break;
                    case 39: //right arrow
                        let text = this.htmls[this.cursorPos.line - 1].text;
                        if (this.cursorPos.column < text.length) {
                            this.setCursorPos(this.cursorPos.line, this.cursorPos.column + 1);
                        } else if (this.cursorPos.line < this.htmls.length) {
                            this.setCursorPos(this.cursorPos.line + 1, 0);
                        }
                        this.clearRnage();
                        break;
                    case 40: //down arrow
                        if (this.cursorPos.line < this.htmls.length) {
                            let text = this.htmls[this.cursorPos.line - 1].text;
                            let width = this.getStrWidth(text, 0, this.cursorPos.column);
                            text = this.htmls[this.cursorPos.line].text;
                            let column = this.getColumnByWidth(text, width);
                            this.setCursorPos(this.cursorPos.line + 1, column);
                        }
                        this.clearRnage();
                        break;
                    case this.$util.keyCode.delete: //delete
                        this.deleteContent(this.$util.keyCode.delete);
                        break;
                    case this.$util.keyCode.backspace: //backspace
                        this.deleteContent(this.$util.keyCode.backspace);
                        break;
                }
            }
        }
    }
}
</script>