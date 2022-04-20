/*
 * @Author: lisong
 * @Date: 2022-02-18 13:42:22
 * @Description: 
 */
import Util from '@/common/Util';

const regs = {
    word: /[a-zA-Z0-9_]/,
    emmetWord: /^[a-zA-Z][a-zA-Z0-9\-]*/,
    emmetAttr: /^[\.\#]([^\.\#\>\<\+\*\(\)]*)/,
    emmetNum: /^\*(\d+)/,
    dWord: Util.fullAngleReg,
    endTag: /(?=\<\/)/,
    space: /\s/
}

class Context {
    constructor(editor) {
        this.lineId = Number.MIN_SAFE_INTEGER;
        this.serial = 1;
        this.htmls = [];
        this.fgLines = [];
        this.lineIdMap = new Map(); //htmls的唯一标识对象
        this.renderedIdMap = new Map(); //renderHtmls的唯一标识对象
        this.renderedLineMap = new Map(); //renderHtmls的唯一标识对象
        this.initProperties(editor);
        this.initData();
    }
    initProperties(editor) {
        Util.defineProperties(this, editor, [
            'nowCursorPos',
            'maxLine',
            'maxWidthObj',
            'cursor',
            'history',
            'tokenizer',
            'lint',
            'folder',
            'selecter',
            'searcher',
            'fSelecter',
            'fSearcher',
            'autocomplete',
            'render',
            'unFold',
            'setNowCursorPos',
            'setAutoTip',
            'getStrWidth',
            '$emit'
        ]);
        this.setEditorData = (prop, value) => {
            editor.setData(prop, value);
        }
    }
    initData() {
        this.htmls.push({
            lineId: this.lineId++,
            text: '',
            html: '',
            width: 0,
            tokens: [],
            folds: [],
            states: [],
            stateFold: null
        });
        this.lineIdMap.set(this.htmls[0].lineId, this.htmls[0]);
    }
    setData(prop, value) {
        if (typeof this[prop] === 'function') {
            return;
        }
        this[prop] = value;
    }
    insertContent(text, command) {
        let historyArr = null;
        let cursorPosList = [];
        let serial = false;
        if (!command) {
            // 如果有选中区域，需要先删除选中区域
            if (this.selecter.activedRanges.size) {
                let _historyArr = this.deleteContent();
                // 连续操作标识
                _historyArr.serial = this.serial++;
                serial = _historyArr.serial;
            }
            cursorPosList = this.cursor.multiCursorPos.toArray();
        } else {
            command.forEach((item) => {
                // 多个插入的光标可能相同，这里不能先添加光标
                cursorPosList.push(item.cursorPos);
            });
        }
        historyArr = this._insertMultiContent(text, cursorPosList, command);
        historyArr.serial = serial;
        if (!command) { // 新增历史记录
            this.history.pushHistory(historyArr);
        } else { // 撤销或重做操作后，更新历史记录
            this.history.updateHistory(historyArr);
            historyArr.serial = command.serial;
        }
        this.setNowCursorPos(this.cursor.multiCursorPos.get(0));
        this.fSearcher.refreshSearch();
        return historyArr;
    }
    _insertMultiContent(text, cursorPosList, command) {
        let prePos = null;
        let historyObj = null;
        let historyArr = [];
        let texts = text instanceof Array ? text : text.split(/\r\n|\n/);
        let lineDelta = 0;
        let columnDelta = 0;
        this.cursor.clearCursorPos();
        cursorPosList.forEach((cursorPos, index) => {
            let _text = texts.length === cursorPosList.length ? texts[index] : text;
            let commandObj = command && command[index] || {};
            let margin = commandObj.margin || 'right';
            let active = commandObj.active || false;
            let pos = {
                line: cursorPos.line,
                column: cursorPos.column
            };
            pos.line += lineDelta;
            if (prePos && pos.line === prePos.line) {
                pos.column += columnDelta;
            } else {
                columnDelta = 0;
            }
            historyObj = this._insertContent(_text, pos);
            historyArr.push(historyObj);
            prePos = historyObj.cursorPos;
            historyObj.margin = margin;
            historyObj.active = active;
            lineDelta += historyObj.cursorPos.line - historyObj.preCursorPos.line;
            columnDelta += historyObj.cursorPos.column - historyObj.preCursorPos.column;
            if (margin === 'right') {
                this.cursor.addCursorPos(historyObj.cursorPos);
            } else {
                this.cursor.addCursorPos(historyObj.preCursorPos);
            }
            if (active) {
                this.selecter.addRange({
                    start: historyObj.preCursorPos,
                    end: historyObj.cursorPos
                });
            }
        });
        return historyArr;
    }
    // 插入内容
    _insertContent(text, cursorPos) {
        let nowLineText = this.htmls[cursorPos.line - 1].text;
        let newPos = Object.assign({}, cursorPos);
        text = text.split(/\r\n|\n/);
        text = text.map((item) => {
            item = {
                lineId: this.lineId++,
                text: item,
                html: '',
                width: 0,
                tokens: null,
                folds: null,
                states: null,
                stateFold: null
            };
            this.lineIdMap.set(item.lineId, item);
            return item;
        });
        if (text.length > 1) { // 插入多行
            newPos.column = text[text.length - 1].text.length;
            text[0].text = nowLineText.slice(0, cursorPos.column) + text[0].text;
            text[text.length - 1].text = text[text.length - 1].text + nowLineText.slice(cursorPos.column);
            this.htmls = this.htmls.slice(0, cursorPos.line - 1).concat(text).concat(this.htmls.slice(cursorPos.line));
        } else { // 插入一行
            newPos.column += text[0].text.length;
            text[0].text = nowLineText.slice(0, cursorPos.column) + text[0].text + nowLineText.slice(cursorPos.column);
            this.htmls.splice(cursorPos.line - 1, 1, text[0]);
        }
        newPos.line += text.length - 1;
        this.setEditorData('maxLine', this.htmls.length);
        this.lint.onInsertContentAfter(cursorPos.line, newPos.line);
        this.tokenizer.onInsertContentAfter(cursorPos.line, newPos.line);
        this.folder.onInsertContentAfter(Object.assign({}, cursorPos), Object.assign({}, newPos));
        this.setLineWidth(text);
        this.render(true);
        this.$emit('change');
        this.setAutoTip(null);
        let historyObj = {
            type: Util.command.DELETE,
            cursorPos: Object.assign({}, newPos),
            preCursorPos: Object.assign({}, cursorPos)
        }
        return historyObj;
    }
    deleteContent(keyCode, command) {
        let historyArr = [];
        let rangeList = [];
        if (command) {
            rangeList = command.map((item) => {
                let obj = {
                    start: item.preCursorPos,
                    end: item.cursorPos,
                    margin: item.margin,
                    active: item.active,
                }
                return obj;
            });
        } else {
            this.cursor.multiCursorPos.forEach((item) => {
                let range = this.selecter.getRangeByCursorPos(item);
                if (range) {
                    if (Util.comparePos(range.start, item) === 0) {
                        range.margin = 'left';
                    } else {
                        range.margin = 'right';
                    }
                    rangeList.push(range);
                } else {
                    rangeList.push(item);
                }
            });
        }
        historyArr = this._deleteMultiContent(rangeList, keyCode);
        if (!command) { // 新增历史记录
            historyArr.length && this.history.pushHistory(historyArr);
        } else { // 撤销或重做操作后，更新历史记录
            historyArr.serial = command.serial;
            this.history.updateHistory(historyArr);
            historyArr.forEach((item) => {
                this.cursor.addCursorPos(item.cursorPos);
            });
        }
        this.setNowCursorPos(this.cursor.multiCursorPos.get(0));
        this.searcher.clearSearch();
        this.fSearcher.refreshSearch();
        return historyArr;
    }
    _deleteMultiContent(rangeList, keyCode) {
        let that = this;
        let historyArr = [];
        let historyObj = null;
        let prePos = null;
        let lineDelta = 0;
        let columnDelta = 0;
        this.cursor.clearCursorPos();
        rangeList.forEach((item) => {
            if (item.start && item.end) {
                _deleteRangePos(item);
            } else {
                _deleteCursorPos(item);
            }
        });
        return historyArr;

        function _deleteCursorPos(cursorPos) {
            let pos = {
                line: cursorPos.line,
                column: cursorPos.column
            };
            pos.line -= lineDelta;
            if (prePos && pos.line === prePos.line) {
                pos.column -= columnDelta;
            } else {
                columnDelta = 0;
            }
            historyObj = that._deleteContent(pos, keyCode);
            historyObj.text && historyArr.push(historyObj);
            prePos = historyObj.cursorPos;
            lineDelta += historyObj.preCursorPos.line - prePos.line;
            columnDelta += historyObj.preCursorPos.column - prePos.column;
            that.cursor.addCursorPos({
                line: prePos.line,
                column: prePos.column
            });
        }

        function _deleteRangePos(rangePos) {
            let start = rangePos.start;
            let end = rangePos.end;
            start.line -= lineDelta;
            end.line -= lineDelta;
            if (prePos && start.line === prePos.line) {
                start.column -= columnDelta;
                if (start.line === end.line) {
                    end.column -= columnDelta;
                } else {
                    columnDelta = 0;
                }
            } else {
                columnDelta = 0;
            }
            historyObj = that._deleteContent(rangePos, keyCode);
            historyObj.text && historyArr.push(historyObj);
            prePos = historyObj.cursorPos;
            lineDelta += historyObj.preCursorPos.line - prePos.line;
            columnDelta += historyObj.preCursorPos.column - prePos.column;
            that.cursor.addCursorPos({
                line: prePos.line,
                column: prePos.column
            });
        }
    }
    // 删除内容
    _deleteContent(cursorPos, keyCode) {
        let range = null;
        let margin = keyCode === Util.keyCode.DELETE ? 'left' : 'right';
        if (cursorPos.start && cursorPos.end) { //删除范围内的内容
            range = cursorPos;
            cursorPos = range.end;
            margin = range.margin;
        }
        let start = null;
        let startObj = this.htmls[cursorPos.line - 1];
        let text = startObj.text;
        let deleteText = '';
        let rangeUuid = [startObj.lineId];
        let originPos = Object.assign({}, cursorPos);
        let newPos = Object.assign({}, cursorPos);
        if (range) { // 删除选中区域
            let end = range.end;
            let endObj = this.htmls[end.line - 1];
            start = range.start;
            startObj = this.htmls[start.line - 1];
            text = startObj.text;
            deleteText = this.getRangeText(range.start, range.end);
            if (start.line == 1 && end.line == this.maxLine) { //全选删除
                rangeUuid = [this.maxWidthObj.lineId];
                this.lineIdMap.clear();
            } else {
                rangeUuid = this.htmls.slice(start.line - 1, end.line).map((item) => {
                    this.lineIdMap.delete(item.lineId);
                    return item.lineId;
                });
            }
            this.lineIdMap.set(startObj.lineId, startObj);
            if (start.line == end.line) { // 单行选中
                text = text.slice(0, start.column) + text.slice(end.column);
                startObj.text = text;
            } else { // 多行选中
                text = text.slice(0, start.column);
                startObj.text = text;
                text = endObj.text;
                text = text.slice(end.column);
                startObj.text += text;
                this.htmls.splice(start.line, end.line - start.line);
            }
            newPos.line = start.line;
            newPos.column = start.column;
        } else if (Util.keyCode.DELETE == keyCode) { // 向后删除一个字符
            if (cursorPos.column == text.length) { // 光标处于行尾
                if (cursorPos.line < this.htmls.length) {
                    this.lineIdMap.delete(this.htmls[cursorPos.line].lineId);
                    text = startObj.text + this.htmls[cursorPos.line].text;
                    this.htmls.splice(cursorPos.line, 1);
                    deleteText = '\n';
                    originPos = {
                        line: cursorPos.line - 1,
                        column: 0
                    };
                }
            } else {
                deleteText = text[cursorPos.column];
                text = text.slice(0, cursorPos.column) + text.slice(cursorPos.column + 1);
                originPos = {
                    line: cursorPos.line,
                    column: cursorPos.column + 1
                };
            }
            startObj.text = text;
        } else { // 向前删除一个字符
            if (cursorPos.column == 0) { // 光标处于行首
                if (cursorPos.line > 1) {
                    let column = this.htmls[cursorPos.line - 2].text.length;
                    this.lineIdMap.delete(this.htmls[cursorPos.line - 2].lineId);
                    text = this.htmls[cursorPos.line - 2].text + text;
                    this.htmls.splice(cursorPos.line - 2, 1);
                    deleteText = '\n';
                    newPos.line = cursorPos.line - 1;
                    newPos.column = column;
                }
            } else {
                deleteText = text[cursorPos.column - 1];
                text = text.slice(0, cursorPos.column - 1) + text.slice(cursorPos.column);
                newPos.column = cursorPos.column - 1;
            }
            startObj.text = text;
        }
        startObj.width = this.getStrWidth(startObj.text);
        startObj.html = '';
        startObj.tokens = null;
        startObj.folds = null;
        startObj.states = null;
        startObj.stateFold = null;
        this.setEditorData('maxLine', this.htmls.length);
        this.lint.onDeleteContentAfter(originPos.line, newPos.line);
        this.tokenizer.onDeleteContentAfter(originPos.line, newPos.line);
        this.folder.onDeleteContentAfter(Object.assign({}, originPos), Object.assign({}, newPos));
        this.render(true);
        this.$emit('change');
        this.setAutoTip(null);
        // 更新最大文本宽度
        if (startObj.width >= this.maxWidthObj.width) {
            this.setEditorData('maxWidthObj', {
                lineId: startObj.lineId,
                text: startObj.text,
                width: startObj.width
            });
        } else if (rangeUuid.indexOf(this.maxWidthObj.lineId) > -1) {
            this.setMaxWidth();
        }
        let historyObj = {
            type: Util.command.INSERT,
            cursorPos: Object.assign({}, newPos),
            preCursorPos: Object.assign({}, originPos),
            text: deleteText,
            keyCode: keyCode,
            margin: margin,
            active: range && range.active
        };
        return historyObj;
    }
    // 获取最大宽度
    setMaxWidth() {
        let that = this;
        let index = 0;
        let startTime = Date.now();
        let maxWidthObj = {
            line: this.htmls[0].lineId,
            width: 0
        };
        clearTimeout(this.setMaxWidth.timer);
        _setMaxWidth();

        function _setMaxWidth() {
            while (index < that.htmls.length) {
                let item = that.htmls[index];
                if (item.width > maxWidthObj.width) {
                    maxWidthObj = {
                        lineId: item.lineId,
                        text: item.text,
                        width: item.width
                    }
                }
                index++;
                if (Date.now() - startTime > 20) {
                    break;;
                }
            }
            if (index < that.htmls.length) {
                that.setMaxWidth.timer = setTimeout(() => {
                    _setMaxWidth();
                }, 20);
            } else {
                that.setEditorData('maxWidthObj', maxWidthObj);
            }
        }
    }
    /**
     * 设置每行文本的宽度
     * @param {Array} texts
     */
    setLineWidth(texts) {
        let that = this;
        let index = 0;
        let startTime = Date.now();
        let maxWidthObj = this.maxWidthObj;
        clearTimeout(this.setLineWidth.timer);
        _setLineWidth();

        function _setLineWidth() {
            while (index < texts.length) {
                let lineObj = texts[index];
                if (that.lineIdMap.has(lineObj.lineId)) {
                    let width = that.getStrWidth(lineObj.text);
                    lineObj.width = width;
                    if (width > maxWidthObj.width) {
                        maxWidthObj = {
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
            } else {
                that.setEditorData('maxWidthObj', maxWidthObj);
            }
        }
    }
    moveLineUp(command) {
        this.moveLine(command, 'up');
    }
    moveLineDown(command) {
        this.moveLine(command, 'down');
    }
    moveLine(command, direct) {
        let that = this;
        let cursorPosList = [];
        let historyPosList = [];
        let index = 0;
        if (command) {
            cursorPosList = command.cursorPos;
            cursorPosList = cursorPosList.map((item) => {
                return this.cursor.addCursorPos(item);
            });
        } else {
            cursorPosList = this.cursor.multiCursorPos.toArray();
        }
        while (index < cursorPosList.length) {
            let line = cursorPosList[index].line;
            if (line === 1 && direct === 'up' || line === this.maxLine && direct === 'down') {
                index++;
                continue;
            }
            _moveLine(cursorPosList[index]);
            while (index < cursorPosList.length && cursorPosList[index].line === line) {
                if (direct === 'down') {
                    cursorPosList[index].line++;
                } else {
                    cursorPosList[index].line--;
                }
                historyPosList.push({
                    line: cursorPosList[index].line,
                    column: cursorPosList[index].column
                });
                index++;
            }
        }
        if (!historyPosList.length) {
            return;
        }
        let historyObj = {
            type: direct === 'down' ? Util.command.MOVEUP : Util.command.MOVEDOWN,
            cursorPos: historyPosList
        }
        if (!command) { // 新增历史记录
            this.history.pushHistory(historyObj);
        } else { // 撤销或重做操作后，更新历史记录
            this.history.updateHistory(historyObj);
        }
        this.searcher.refreshSearch();
        this.fSearcher.refreshSearch();

        function _moveLine(cursorPos) {
            let upLine = cursorPos.line - (direct === 'down' ? 0 : 1);
            let downLine = upLine + 1;
            let upText = that.htmls[upLine - 1].text;
            let downText = that.htmls[downLine - 1].text;
            let start = {
                line: upLine,
                column: 0
            };
            that._deleteContent({
                start: start,
                end: {
                    line: downLine,
                    column: downText.length
                }
            });
            that._insertContent(downText + '\n' + upText, start);
        }
    }
    // 向上复制一行
    copyLineUp(command) {
        this.copyLine(command, 'up');
    }
    // 向下复制一行
    copyLineDown(command) {
        this.copyLine(command, 'down');
    }
    copyLine(command, direct) {
        let originList = [];
        let cursorPosList = [];
        let historyPosList = [];
        let prePos = null;
        let texts = [];
        let index = 0;
        if (command) {
            originList = command.cursorPos;
        } else {
            originList = this.cursor.multiCursorPos.toArray();
        }
        originList.forEach((item) => {
            if (!prePos || prePos.line !== item.line) {
                let text = this.htmls[item.line - 1].text;
                cursorPosList.push({
                    line: item.line,
                    column: text.length
                });
                texts.push('\n' + text);
            }
            prePos = item;
        });
        this._insertMultiContent(texts, cursorPosList).forEach((item) => {
            let originLine = originList[index].line;
            let line = direct === 'down' ? item.cursorPos.line : item.cursorPos.line - 1;
            while (index < originList.length && originList[index].line === originLine) {
                originList[index].line = line;
                historyPosList.push({
                    line: line,
                    column: originList[index].column
                });
                index++;
            }
        });
        let historyObj = {
            type: direct === 'down' ? Util.command.DELETE_COPY_UP : Util.command.DELETE_COPY_DOWN,
            cursorPos: historyPosList
        }
        if (!command) { // 新增历史记录
            this.history.pushHistory(historyObj);
        } else { // 撤销或重做操作后，更新历史记录
            this.history.updateHistory(historyObj);
        }
        this.cursor.clearCursorPos();
        historyPosList.forEach((item) => {
            this.cursor.addCursorPos(item);
        });
        this.searcher.refreshSearch();
        this.fSearcher.refreshSearch();
    }
    // 删除上面一行
    deleteCopyLineUp(command) {
        this.deleteCopyLine(command, 'up');
    }
    // 删除下面一行
    deleteCopyLineDown(command) {
        this.deleteCopyLine(command, 'down');
    }
    deleteCopyLine(command, direct) {
        let originList = [];
        let cursorPosList = [];
        let historyPosList = [];
        let prePos = null;
        let index = 0;
        if (command) {
            originList = command.cursorPos;
        } else {
            originList = this.cursor.multiCursorPos.toArray();
        }
        originList.forEach((item) => {
            if (!prePos || prePos.line !== item.line) {
                let upLine = direct === 'down' ? item.line : item.line - 1;
                let downLine = upLine + 1;
                let upText = this.htmls[upLine - 1].text;
                let downText = this.htmls[downLine - 1].text;
                let range = {
                    start: {
                        line: upLine,
                        column: upText.length
                    },
                    end: {
                        line: downLine,
                        column: downText.length
                    }
                };
                cursorPosList.push(range);
            }
            prePos = item;
        });
        this._deleteMultiContent(cursorPosList).forEach((item) => {
            let originLine = originList[index].line;
            let line = item.cursorPos.line;
            while (index < originList.length && originList[index].line === originLine) {
                originList[index].line = line;
                historyPosList.push({
                    line: line,
                    column: originList[index].column
                });
                index++;
            }
        });
        let historyObj = {
            type: direct === 'down' ? Util.command.COPY_UP : Util.command.COPY_DOWN,
            cursorPos: historyPosList
        }
        if (!command) { // 新增历史记录
            this.history.pushHistory(historyObj);
        } else { // 撤销或重做操作后，更新历史记录
            this.history.updateHistory(historyObj);
        }
        this.cursor.clearCursorPos();
        historyPosList.forEach((item) => {
            this.cursor.addCursorPos(item);
        });
        this.searcher.refreshSearch();
        this.fSearcher.refreshSearch();
    }
    // 删除当前行
    deleteLine() {
        let preItem = null;
        let ranges = [];
        this.cursor.multiCursorPos.forEach((item) => {
            let range = this.selecter.getRangeByCursorPos(item);
            let start = null;
            if (range) {
                if (Util.comparePos(range.start, item) === 0) {
                    range.margin = 'left';
                } else {
                    range.margin = 'right';
                }
                ranges.push(range);
                return;
            }
            if (preItem && item.line === preItem.line) {
                return;
            }
            if (item.line > 1) {
                start = {
                    line: item.line - 1,
                    column: this.htmls[item.line - 2].text.length
                }
            } else {
                start = {
                    line: item.line,
                    column: 0
                }
            }
            range = {
                start: start,
                end: {
                    line: item.line,
                    column: this.htmls[item.line - 1].text.length
                },
                margin: 'right',
                active: false
            };
            ranges.push(range);
            preItem = item;
        });
        this.history.pushHistory(this._deleteMultiContent(ranges));
        this.searcher.clearSearch();
        this.fSearcher.refreshSearch();
    }
    replace(texts, ranges) {
        let historyArr = null;
        let serial = this.serial++;
        historyArr = this._deleteMultiContent(ranges);
        historyArr.serial = serial;
        this.history.pushHistory(historyArr);
        historyArr = this._insertMultiContent(texts, this.cursor.multiCursorPos.toArray());
        historyArr.serial = serial;
        this.history.pushHistory(historyArr);
        this.searcher.refreshSearch();
        this.fSearcher.refreshSearch();
    }
    // 点击自动提示替换输入的内容
    replaceTip(tip) {
        let word = tip.word || '';
        let lookahead = tip.lookahead || 0;
        let firstToken = null;
        let result = _getResult(tip);
        let ranges = _getRanges.call(this);
        this.replace(result, ranges);
        _updatePos.call(this);

        function _getResult(tip) {
            let result = '';
            if (tip.type === 'emmet-html') { //emmet语法
                let index = 0;
                let text = tip.result;
                while (index < text.length) {
                    let resObj = _emmet(text, index);
                    index = resObj.index;
                    result += '\n' + resObj.result;
                }
                result = result.slice(1);
            } else if (tip.type === 'entity.name.tag.html') {
                result += tip.result + `></${tip.result}>`;
            } else {
                result = tip.result;
            }
            return result;
        }

        function _getRanges() {
            let ranges = [];
            this.cursor.multiCursorPos.forEach((cursorPos, index) => {
                let range = null;
                let token = this.autocomplete.getToken(cursorPos);
                if (index === 0) {
                    firstToken = token;
                }
                if (!index || index > 0 && token.type === firstToken.type && token.value === firstToken.value) {
                    range = {
                        start: {
                            line: cursorPos.line,
                            column: cursorPos.column - word.length + lookahead
                        },
                        end: {
                            line: cursorPos.line,
                            column: cursorPos.column + lookahead
                        }
                    }
                } else {
                    range = {
                        start: {
                            line: cursorPos.line,
                            column: cursorPos.column
                        },
                        end: {
                            line: cursorPos.line,
                            column: cursorPos.column
                        }
                    }
                }
                ranges.push(range);
            });
            return ranges;
        }

        function _parenEmmet(text, index, tabNum) {
            let result = '';
            let exec = null;
            while (index < text.length && text[index] != ')') {
                let resObj = _emmet(text, index, tabNum);
                index = resObj.index;
                result += '\n' + resObj.result;
            }
            index++;
            result = result.slice(1);
            let _text = text.slice(index);
            if (exec = regs.emmetNum.exec(_text)) {
                let num = exec[1] - 0 || 1;
                index += exec[0].length;
                result = _multiply(result, num);
            }
            return {
                index: index + 1, //')'后面跟着'+'或者为结尾
                result: result
            };
        }

        function _emmet(text, index, tabNum) {
            tabNum = tabNum || 0;
            let exec = null;
            let tag = '';
            let _text = text.slice(index);
            let tab = _multiplyTab(tabNum);
            if (text[index] === '(') {
                index++;
                return _parenEmmet(text, index, tabNum);
            } else if (exec = regs.emmetWord.exec(_text)) {
                let cs = [];
                let ids = [];
                let num = 1;
                let result = `${tab}<${exec[0]}`;
                tag = exec[0];
                index += exec[0].length;
                _text = text.slice(index);
                while (exec = regs.emmetAttr.exec(_text)) {
                    if (exec[0][0] === '\.') {
                        cs.push(exec[1])
                    } else {
                        ids.push(exec[1]);
                    }
                    index += exec[0].length;
                    _text = text.slice(index);
                }
                if (cs.length) {
                    result += ` class="${cs.join(' ')}"`;
                }
                if (ids.length) {
                    result += ` id="${ids.peek()}"`;
                }
                result += '>';
                if (exec = regs.emmetNum.exec(_text)) {
                    num = exec[1] - 0 || 1;
                    index += exec[0].length;
                    _text = text.slice(index);
                }
                if (text[index] === '>') {
                    let obj = _emmet(text, index + 1, tabNum + 1);
                    index = obj.index;
                    result = _multiply(result + '\n' + obj.result + `\n${tab}</${tag}>`, num);
                } else if (text[index] === '+') {
                    index++;
                    result = _multiply(result + `</${tag}>`, num);
                } else {
                    result = _multiply(result + `</${tag}>`, num);
                }
                return {
                    index: index,
                    result: result
                }
            } else {
                return {
                    index: index + 1,
                    result: ''
                };
            }
        }

        function _multiply(text, num) {
            let str = '';
            for (let i = 0; i < num; i++) {
                str += text + '\n';
            }
            return str.slice(0, -1);
        }

        function _multiplyTab(num) {
            let str = '';
            for (let i = 0; i < num; i++) {
                str += '\t';
            }
            return str;
        }

        function _updatePos() {
            if (tip.type === 'emmet-html' || tip.type === 'entity.name.tag.html') { //生成标签后，光标定位到标签中间的位置
                let exec = regs.endTag.exec(result);
                let text = result.slice(exec.index);
                let deltaArr = text.split('\n');
                let multiCursorPos = this.cursor.multiCursorPos.toArray();
                for (let i = multiCursorPos.length - 1; i >= 0; i--) {
                    let cursorPos = _getDeltaPos.call(this, deltaArr, multiCursorPos[i]);
                    this.cursor.updateCursorPos(multiCursorPos[i], cursorPos.line, cursorPos.column);
                }
            }
        }

        function _getDeltaPos(deltaArr, cursorPos) {
            let line = cursorPos.line;
            let column = cursorPos.column;
            if (deltaArr.length === 1) {
                column -= deltaArr[0].length;
            } else {
                line -= deltaArr.length - 1;
                column = this.htmls[line - 1].text.length - deltaArr[0].length;
            }
            return {
                line: line,
                column: column
            }
        }
    }
    // 获取选中范围内的文本
    getRangeText(start, end) {
        var text = this.htmls[start.line - 1].text;
        if (start.line != end.line) {
            let arr = [];
            text = text.slice(start.column);
            arr = this.htmls.slice(start.line, end.line - 1);
            arr = arr.map((item) => {
                return item.text;
            });
            text += arr.length ? '\n' + arr.join('\n') : '';
            text += '\n' + this.htmls[end.line - 1].text.slice(0, end.column);
        } else {
            text = text.slice(start.column, end.column);
        }
        return text;
    }
    // 获取待复制的文本
    getCopyText(cut) {
        let text = '';
        let preItem = null;
        let ranges = [];
        this.cursor.multiCursorPos.forEach((item) => {
            let range = this.selecter.getRangeByCursorPos(item);
            let start = null;
            if (range) {
                ranges.push(range);
                return;
            }
            if (preItem && item.line === preItem.line) {
                return;
            }
            if (item.line > 1) {
                start = {
                    line: item.line - 1,
                    column: this.htmls[item.line - 2].text.length
                }
            } else {
                start = {
                    line: item.line,
                    column: 0
                }
            }
            range = {
                start: start,
                end: {
                    line: item.line,
                    column: this.htmls[item.line - 1].text.length
                }
            };
            ranges.push(range);
            preItem = item;
        });
        ranges.forEach((item) => {
            let str = this.getRangeText(item.start, item.end);
            text = str[0] === '\n' ? text += str : text += '\n' + str;
        });
        if (cut) {
            this.history.pushHistory(this._deleteMultiContent(ranges));
            this.searcher.clearSearch();
            this.fSearcher.refreshSearch();
        }
        return text.slice(1);
    }
    // 获取待搜索的文本
    getToSearchConfig() {
        if (this.selecter.activedRanges.size > 1) {
            return null;
        }
        let wholeWord = false;
        let searchText = '';
        if (this.selecter.ranges.size) {
            let range = this.selecter.getRangeByCursorPos(this.nowCursorPos);
            if (range) {
                searchText = this.getRangeText(range.start, range.end)
            }
        } else {
            searchText = this.getNowWord().text;
            wholeWord = true;
        }
        return {
            text: searchText,
            wholeWord: wholeWord,
            ignoreCase: wholeWord,
        }
    }
    getNowWord() {
        let text = this.htmls[this.nowCursorPos.line - 1].text;
        let str = '';
        let index = this.nowCursorPos.column;
        let sReg = regs.word;
        let startColumn = index;
        let endColumn = index;
        if (index && text[index - 1].match(regs.dWord)) {
            sReg = regs.dWord;
        }
        while (index > 0 && text[index - 1].match(sReg)) {
            str = text[index - 1] + str;
            startColumn = index;
            index--;
        }
        index = this.nowCursorPos.column;
        while (index < text.length && text[index].match(sReg)) {
            str += text[index];
            endColumn = index;
            index++;
        }
        return {
            text: str,
            range: {
                start: {
                    line: this.nowCursorPos.line,
                    column: startColumn
                },
                end: {
                    line: this.nowCursorPos.line,
                    column: endColumn
                }
            }
        }
    }
    getAllText() {
        return this.htmls.map((item) => {
            return item.text
        }).join('\n');
    }
}
Context.contexts = {};

export default Context;