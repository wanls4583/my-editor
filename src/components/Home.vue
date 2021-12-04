<template>
	<div @selectstart.prevent class="my-editor-wrap">
		<div :style="{top: top + 'px'}" class="my-editor-nums">
			<div :class="{'my-editor-num-active': cursorPos.line==num+startLine-1}" :key="num" class="my-editor-num" v-for="num in maxLine">
				<span v-if="num+startLine-1<=htmls.length">{{num+startLine-1}}</span>
			</div>
		</div>
		<div class="my-editor-content-wrap">
			<div
				@mousedown="onScrollerMdown"
				@mousemove="onScrollerMmove"
				@mouseup="onScrollerMup"
				@wheel.prevent="onWheel"
				class="my-editor-content-scroller"
				ref="scroller"
			>
				<div :style="{top: top + 'px', minWidth: _contentMinWidth}" @selectend.prevent="onSelectend" class="my-editor-content" ref="content">
					<div :key="line.num" @mouseup="onLineMup(line.num, $event)" class="my-editor-line" v-for="line in renderHtmls">
						<div class="my-editor-code">{{line.html}}</div>
					</div>
					<div
						:style="{height: _lineHeight, top: _cursorRealPos.top, left: _cursorRealPos.left, visibility: _cursorVisible}"
						class="my-editor-cursor"
						v-show="cursorPos.show"
					></div>
				</div>
			</div>
			<div @scroll="onHscroll" class="my-editor-h-scroller-wrap" ref="hScroller">
				<div :style="{width: _hScrollWidth}" class="my-editor-h-scroller"></div>
			</div>
			<div @scroll="onVscroll" class="my-editor-v-scroller-wrap" ref="vScroller">
				<div :style="{height: _vScrollHeight}" class="my-editor-v-scroller"></div>
			</div>
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
            renderHtmls: [],
            startLine: 1,
            top: 0,
            scrollLeft: 0,
            scrollTop: 0,
            maxLine: 0,
            scrollerArea: {},
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
            var left = this.getStrWidth(this.htmls[this.cursorPos.line - 1].text, 0, this.cursorPos.column);
            var top = (this.cursorPos.line - this.startLine) * this.charObj.charHight;
            var relTop = this.cursorPos.line * this.charObj.charHight;
            // 强制滚动使光标处于可见区域
            if (this.forceCursorView) {
                if (relTop > this.scrollTop + this.scrollerArea.height - this.charObj.charHight) {
                    this.$vScroller.scrollTop = relTop + this.charObj.charHight - this.scrollerArea.height;
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
            var cursorRealPos = this._cursorRealPos;
            var left = this.$util.getNum(cursorRealPos.left);
            var top = this.$util.getNum(cursorRealPos.top) + this.top;
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
    },
    methods: {
        showCursor() {
            if (this.cursorPos.show) {
                return;
            }
            this.cursorPos.show = true;
            this.cursorPos.visible = true;
            var _timer = () => {
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
        },
        renderSelectedBg() {

        },
        // 插入内容
        insertContent(text) {
            var nowLineText = this.htmls[this.cursorPos.line - 1].text;
            var nowColume = this.cursorPos.column;
            var newLine = this.cursorPos.line;
            var newColume = nowColume;
            text = text.split('\n');
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
                var width = this.getStrWidth(item.text);
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
        clearRnage() {

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
            var maxWidthObj = { line: 1, width: 0 };
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
            var halfCharWidth = this.charObj.charWidth / 2;
            var left = 0, right = text.length;
            while (left < right) {
                var mid = (left + right) / 2;
                var width = this.getStrWidth(text, 0, mid);
                if (Math.abs(width - offsetX) < halfCharWidth) {
                    left = mid;
                    break;
                } else if (width > offsetX) {
                    right = mid - 1;
                } else {
                    left = mid + 1;
                }
            }
            return left;
        },
        // 点击代码行
        onLineMup(num, e) {
            var text = this.htmls[num - 1].text;
            var column = this.getColumnByWidth(text, e.offsetX);
            this.setCursorPos(num, left);
            this.focus();
            this.lineClicked = true;
        },
        // 鼠标按下事件
        onScrollerMdown(e) {
            this.mouseStartObj = {
                time: Date.now(),
                x: e.pageX,
                y: e.pageY,
            }
        },
        // 鼠标移动事件
        onScrollerMmove() {
            if (this.mouseStartObj && Date.now() - this.mouseStartObj.time >= 300) {
                console.log('selectmove')
            }
        },
        // 鼠标抬起事件
        onScrollerMup(e) {
            // 按下到抬起的间隔大于100ms，属于选中结束事件
            if (this.mouseStartObj && Date.now() - this.mouseStartObj.time >= 300) {
                console.log('selectend')
            } else if (!this.lineClicked) { // 点击事件
                this.setCursorPos(this.htmls.length, this.htmls[this.htmls.length - 1].text.length);
                this.focus();
            }
            this.lineClicked = false;
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
                var text = this.$textarea.value || '';
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
                var text = this.$textarea.value || '';
                if (text) {
                    this.insertContent(text);
                    this.$textarea.value = '';
                }
            }
        },
        // 复制事件
        onCopy(e) {
            var mime = window.clipboardData ? "Text" : "text/plain";
            var clipboardData = e.clipboardData || window.clipboardData;
            if (this.selectedRange) {
                var text = this.getRangeText(this.selectedRange.start, this.selectedRange.end);
                clipboardData.setData(mime, text);
                //返回false阻止默认复制，否则setData无效
                return false;
            }
        },
        // 粘贴事件
        onPaste(e) {
            var mime = window.clipboardData ? "Text" : "text/plain";
            var clipboardData = e.clipboardData || window.clipboardData;
            var copyText = '';
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
                            var text = this.htmls[this.cursorPos.line - 1].text;
                            var width = this.getStrWidth(text, 0, this.cursorPos.column);
                            text = this.htmls[this.cursorPos.line - 2].text;
                            var column = this.getColumnByWidth(text, width);
                            this.setCursorPos(this.cursorPos.line - 1, column);
                        }
                        this.clearRnage();
                        break;
                    case 39: //right arrow
                        var text = this.htmls[this.cursorPos.line - 1].text;
                        if (this.cursorPos.column < text.length) {
                            this.setCursorPos(this.cursorPos.line, this.cursorPos.column + 1);
                        } else if (this.cursorPos.line < this.htmls.length) {
                            this.setCursorPos(this.cursorPos.line + 1, 0);
                        }
                        this.clearRnage();
                        break;
                    case 40: //down arrow
                        if (this.cursorPos.line < this.htmls.length) {
                            var text = this.htmls[this.cursorPos.line - 1].text;
                            var width = this.getStrWidth(text, 0, this.cursorPos.column);
                            text = this.htmls[this.cursorPos.line].text;
                            var column = this.getColumnByWidth(text, width);
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