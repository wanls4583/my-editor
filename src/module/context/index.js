/*
 * @Author: lisong
 * @Date: 2022-02-18 13:42:22
 * @Description: 
 */
import Util from '@/common/Util';
let regs = {
    word: /[a-zA-Z0-9_]/,
    dWord: Util.fullAngleReg,
    space: /\s/
}

export default class {
    constructor(editor) {
        this.lineId = Number.MIN_SAFE_INTEGER;
        this.htmls = [];
        this.folds = [];
        this.lineIdMap = new Map(); //htmls的唯一标识对象
        this.renderedIdMap = new Map(); //renderHtmls的唯一标识对象
        this.renderedLineMap = new Map(); //renderHtmls的唯一标识对象
        this.foldMap = new Map(); //folds的唯一标识对象
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
            'render',
            'unFold',
            'renderSelectedBg',
            'setMaxWidth',
            'setLineWidth',
            'setNowCursorPos',
            'getStrWidth',
            'refreshSearch',
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
            states: []
        });
        this.lineIdMap.set(this.htmls[0].lineId, this.htmls[0]);
    }
    setData(prop, value) {
        if (typeof this[prop] === 'function') {
            return;
        }
        this[prop] = value;
    }
    insertContent(text, cursorPos, command) {
        let historyArr = [];
        let historyObj = null;
        let cursorPosList = [];
        if (!cursorPos) {
            // 如果有选中区域，需要先删除选中区域
            this.selecter.selectedRanges.length && this.deleteContent();
            cursorPosList = this.cursor.multiCursorPos;
        } else {
            cursorPos = cursorPos instanceof Array ? cursorPos : [cursorPos];
            cursorPos.map((item) => {
                cursorPosList.push(this.cursor.addCursorPos(item));
            });
        }
        historyArr = this._insertMultiContent(text, cursorPosList, command);
        this.setNowCursorPos(this.cursor.multiCursorPos[0]);
        historyObj = historyArr.length > 1 ? historyArr : historyArr[0];
        if (!command) { // 新增历史记录
            this.history.pushHistory(historyObj);
        } else { // 撤销或重做操作后，更新历史记录
            this.history.updateHistory(historyObj);
        }
    }
    _insertMultiContent(text, cursorPosList, command) {
        let prePos = null;
        let preOriginPos = null;
        let historyObj = null;
        let historyArr = [];
        let texts = text instanceof Array ? text : text.split(/\r\n|\n/);
        command = command && (command instanceof Array ? command : [command]);
        cursorPosList.map((cursorPos, index) => {
            let _text = texts.length === cursorPosList.length ? texts[index] : text;
            let originPos = Object.assign({}, cursorPos);
            let margin = command && command[index].margin || 'right';
            let active = command && command[index].active || false;
            if (prePos) {
                if (preOriginPos.line === cursorPos.line) {
                    cursorPos.line = prePos.line;
                    cursorPos.column = prePos.column + cursorPos.column - preOriginPos.column;
                } else {
                    cursorPos.line = prePos.line + cursorPos.line - preOriginPos.line;
                }
            }
            historyObj = this._insertContent(_text, cursorPos);
            historyArr.push(historyObj);
            prePos = historyObj.cursorPos;
            preOriginPos = originPos;
            historyObj.margin = margin;
            historyObj.active = active;
            if (margin === 'right') {
                cursorPos.line = historyObj.cursorPos.line;
                cursorPos.column = historyObj.cursorPos.column;
            }
            if (active) {
                this.selecter.addSelectedRange({
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
        let originPos = {
            line: cursorPos.line,
            column: cursorPos.column
        };
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
            this.lineIdMap.set(item.lineId, item);
            return item;
        });
        if (text.length > 1) { // 插入多行
            newColumn = text[text.length - 1].text.length;
            text[0].text = nowLineText.slice(0, nowColume) + text[0].text;
            text[text.length - 1].text = text[text.length - 1].text + nowLineText.slice(nowColume);
            this.htmls = this.htmls.slice(0, cursorPos.line - 1).concat(text).concat(this.htmls.slice(cursorPos.line));
        } else { // 插入一行
            newColumn += text[0].text.length;
            text[0].text = nowLineText.slice(0, nowColume) + text[0].text + nowLineText.slice(cursorPos.column);
            this.htmls.splice(cursorPos.line - 1, 1, text[0]);
        }
        newLine += text.length - 1;
        this.setEditorData('maxLine', this.htmls.length);
        this.folder.onInsertContentAfter({
            line: newLine,
            column: newColumn
        });
        this.lint.onInsertContentAfter(newLine);
        this.tokenizer.onInsertContentAfter(newLine);
        this.refreshSearch();
        this.setLineWidth(text);
        this.render();
        if (this.foldMap.has(nowLine) && text.length > 1) {
            this.unFold(nowLine);
        }
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
    }
    deleteContent(keyCode, rangePos, command) {
        let historyArr = [];
        let historyObj = null;
        let rangeList = [];
        if (rangePos) {
            rangeList = rangePos instanceof Array ? rangePos : [rangePos];
        } else {
            this.cursor.multiCursorPos.map((item) => {
                let selectedRange = this.selecter.getRangeByCursorPos(item);
                if (selectedRange) {
                    if (Util.comparePos(selectedRange.start, item) === 0) {
                        selectedRange.margin = 'left';
                    } else {
                        selectedRange.margin = 'right';
                    }
                    selectedRange.active = true;
                    rangeList.push(selectedRange);
                } else {
                    rangeList.push(item);
                }
            });
        }
        historyArr = this._deleteMultiContent(rangeList, keyCode);
        historyObj = historyArr.length > 1 ? historyArr : historyArr[0];
        if (!command) { // 新增历史记录
            historyObj && this.history.pushHistory(historyObj);
        } else { // 撤销或重做操作后，更新历史记录
            this.history.updateHistory(historyObj);
            historyArr.map((item) => {
                this.cursor.addCursorPos(item.cursorPos);
            });
        }
        this.setNowCursorPos(this.cursor.multiCursorPos[0]);
    }
    _deleteMultiContent(rangeList, keyCode) {
        let that = this;
        let historyArr = [];
        let historyObj = null;
        let prePos = null;
        let lineDelta = 0;
        let columnDelta = 0;
        rangeList.map((cursorPos) => {
            if (cursorPos.start) {
                _deleteRangePos(cursorPos);
            } else {
                _deleteCursorPos(cursorPos);
            }
        });
        this.cursor.filterCursorPos();
        return historyArr;

        function _deleteCursorPos(cursorPos) {
            cursorPos.line -= lineDelta;
            if (prePos && cursorPos.line === prePos.line) {
                cursorPos.column -= columnDelta;
            } else {
                columnDelta = 0;
            }
            historyObj = that._deleteContent(cursorPos, keyCode);
            historyArr.push(historyObj);
            prePos = historyObj.cursorPos;
            cursorPos.line = prePos.line;
            cursorPos.column = prePos.column;
            columnDelta += historyObj.preCursorPos.column - prePos.column;
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
            historyArr.push(historyObj);
            prePos = historyObj.cursorPos;
            columnDelta += historyObj.preCursorPos.column - prePos.column;
        }
    }
    // 删除内容
    _deleteContent(cursorPos, keyCode) {
        let selectedRange = null;
        let margin = keyCode === Util.keyCode.DELETE ? 'left' : 'right';
        if (cursorPos.start && cursorPos.end) { //删除范围内的内容
            selectedRange = cursorPos;
            cursorPos = selectedRange.end;
            margin = selectedRange.margin;
        }
        let start = null;
        let startObj = this.htmls[cursorPos.line - 1];
        let text = startObj.text;
        let deleteText = '';
        let rangeUuid = [];
        let originPos = {
            line: cursorPos.line,
            column: cursorPos.column
        };
        let newLine = cursorPos.line;
        let newColumn = cursorPos.column;
        this.tokenizer.onDeleteContentBefore(cursorPos.line);
        this.lint.onDeleteContentBefore(cursorPos.line);
        this.folder.onDeleteContentBefore(Object.assign({}, cursorPos));
        if (selectedRange) { // 删除选中区域
            let end = selectedRange.end;
            let endObj = this.htmls[end.line - 1];
            start = selectedRange.start;
            startObj = this.htmls[start.line - 1];
            text = startObj.text;
            deleteText = this.getRangeText(selectedRange.start, selectedRange.end);
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
            newLine = start.line;
            newColumn = start.column;
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
        this.setEditorData('maxLine', this.htmls.length);
        this.folder.onDeleteContentAfter({
            line: newLine,
            column: newColumn
        });
        this.lint.onDeleteContentAfter(newLine);
        this.tokenizer.onDeleteContentAfter(newLine);
        this.selecter.clearRange();
        this.searcher.clearCache();
        this.refreshSearch();
        this.render();
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
            cursorPos: {
                line: newLine,
                column: newColumn
            },
            preCursorPos: {
                line: originPos.line,
                column: originPos.column
            },
            text: deleteText,
            keyCode: keyCode,
            margin: margin,
            active: selectedRange && selectedRange.active
        };
        return historyObj;
    }
    moveLineUp(cursorPos, command) {
        let that = this;
        let cursorPosList = [];
        let historyPosList = [];
        let prePos = null;
        if (cursorPos) {
            cursorPosList = cursorPos instanceof Array ? cursorPos : [cursorPos];
        } else {
            that.cursor.multiCursorPos.map((item) => {
                if (!prePos || item.line - prePos.line > 1) {
                    item.line > 1 && cursorPosList.push(item);
                    prePos = item;
                }
            });
        }
        cursorPosList.map((cursorPos) => {
            cursorPos = this.cursor.addCursorPos(cursorPos);
            _moveLineUp(cursorPos);
            historyPosList.push({
                line: cursorPos.line,
                column: cursorPos.column
            });
        });
        let historyObj = {
            type: Util.command.MOVEDOWN,
            cursorPos: historyPosList
        }
        if (!command) { // 新增历史记录
            this.history.pushHistory(historyObj);
        } else { // 撤销或重做操作后，更新历史记录
            this.history.updateHistory(historyObj);
        }

        function _moveLineUp(cursorPos) {
            let upLineText = that.htmls[cursorPos.line - 2].text;
            let nowLineText = that.htmls[cursorPos.line - 1].text;
            let start = {
                line: cursorPos.line - 1,
                column: 0
            };
            that._deleteContent({
                start: start,
                end: {
                    line: cursorPos.line,
                    column: nowLineText.length
                }
            });
            that._insertContent(nowLineText + '\n' + upLineText, start);
            that.cursor.getCursorsByLine(cursorPos.line).map((item) => {
                that.cursor.updateCursorPos(item, item.line - 1, item.column);
            });
        }
    }
    moveLineDown(cursorPos, command) {
        let that = this;
        let cursorPosList = [];
        let historyPosList = [];
        let prePos = null;
        if (cursorPos) {
            cursorPosList = cursorPos instanceof Array ? cursorPos : [cursorPos];
        } else {
            that.cursor.multiCursorPos.map((item) => {
                if (!prePos || item.line - prePos.line > 1) {
                    item.line > 1 && cursorPosList.push(item);
                    prePos = item;
                }
            });
        }
        cursorPosList.map((cursorPos) => {
            cursorPos = this.cursor.addCursorPos(cursorPos);
            _moveLineDown(cursorPos);
            historyPosList.push({
                line: cursorPos.line,
                column: cursorPos.column
            });
        });
        let historyObj = {
            type: Util.command.MOVEUP,
            cursorPos: historyPosList
        }
        if (!command) { // 新增历史记录
            this.history.pushHistory(historyObj);
        } else { // 撤销或重做操作后，更新历史记录
            this.history.updateHistory(historyObj);
        }

        function _moveLineDown(cursorPos) {
            let downLineText = that.htmls[cursorPos.line].text;
            let nowLineText = that.htmls[cursorPos.line - 1].text;
            let start = {
                line: cursorPos.line,
                column: 0
            };
            that._deleteContent({
                start: start,
                end: {
                    line: cursorPos.line + 1,
                    column: downLineText.length
                }
            });
            that._insertContent(downLineText + '\n' + nowLineText, start);
            that.cursor.getCursorsByLine(cursorPos.line).map((item) => {
                that.cursor.updateCursorPos(item, item.line + 1, item.column);
            });
        }
    }
    copyLine(cursorPos, command, direct) {
        let originList = [];
        let cursorPosList = [];
        let historyPosList = [];
        let prePos = null;
        let texts = [];
        let index = 0;
        direct = direct || 'up';
        if (cursorPos) {
            originList = cursorPos instanceof Array ? cursorPos : [cursorPos];
            originList = originList.map((item) => {
                return this.cursor.addCursorPos(item);
            });
        } else {
            originList = this.cursor.multiCursorPos;
        }
        originList.map((item) => {
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
        this._insertMultiContent(texts, cursorPosList).map((item) => {
            let originLine = originList[index].line;
            let line = direct === 'up' ? item.cursorPos.line - 1 : item.cursorPos.line;
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
            type: direct === 'up' ? Util.command.DELETE_COPY_DOWN : Util.command.DELETE_COPY_UP,
            cursorPos: historyPosList
        }
        if (!command) { // 新增历史记录
            this.history.pushHistory(historyObj);
        } else { // 撤销或重做操作后，更新历史记录
            this.history.updateHistory(historyObj);
        }
    }
    // 向上复制一行
    copyLineUp(cursorPos, command) {
        this.copyLine(cursorPos, command, 'up');
    }
    // 向下复制一行
    copyLineDown(cursorPos, command) {
        this.copyLine(cursorPos, command, 'down');
    }
    deleteCopyLine(cursorPos, command, direct) {
        let originList = [];
        let cursorPosList = [];
        let historyPosList = [];
        let prePos = null;
        let index = 0;
        direct = direct || 'down';
        if (cursorPos) {
            originList = cursorPos instanceof Array ? cursorPos : [cursorPos];
            originList = originList.map((item) => {
                return this.cursor.addCursorPos(item);
            });
        } else {
            originList = this.cursor.multiCursorPos;
        }
        originList.map((item) => {
            if (!prePos || prePos.line !== item.line) {
                let upText = this.htmls[item.line - (direct === 'down' ? 1 : 2)].text;
                let downText = this.htmls[item.line - (direct === 'down' ? 0 : 1)].text;
                cursorPosList.push({
                    start: {
                        line: item.line + (direct === 'down' ? 0 : -1),
                        column: upText.length
                    },
                    end: {
                        line: item.line + (direct === 'down' ? 1 : 0),
                        column: downText.length
                    }
                });
            }
            prePos = item;
        });
        this._deleteMultiContent(cursorPosList).map((item) => {
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
    }
    // 删除上面一行
    deleteCopyLineUp(cursorPos, command) {
        this.deleteCopyLine(cursorPos, command, 'up');
    }
    // 删除下面一行
    deleteCopyLineDown(cursorPos, command) {
        this.deleteCopyLine(cursorPos, command, 'down');
    }
    // 删除当前行
    deleteLine() {
        let preItem = null;
        let ranges = [];
        this.cursor.multiCursorPos.map((item) => {
            let selectedRange = this.selecter.getRangeByCursorPos(item);
            let start = null;
            if (selectedRange) {
                ranges.push(selectedRange);
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
            ranges.push({
                start: start,
                end: {
                    line: item.line,
                    column: this.htmls[item.line - 1].text.length
                }
            });
            preItem = item;
        });
        this.deleteContent(null, ranges);
    }
    replace(text, ranges, command) {
        let historyObj = null;
        let historyRnageList = [];
        let deleteText = this.getRangeText(ranges.peek().start, ranges.peek().end);
        let direct = ranges.length > 1 && Util.comparePos(ranges[0].start, ranges[1].start) < 0 ? 'asc' : 'desc';
        for (let i = ranges.length - 1; i >= 0; i--) {
            let item = ranges[i];
            let end = null;
            deleteText && this._deleteContent({
                start: item.start,
                end: item.end
            });
            if (text) {
                historyObj = this._insertContent(text, item.start);
                end = historyObj.cursorPos;
            } else {
                end = item.start;
            }
            historyRnageList.push({
                start: item.start,
                end: end
            });
            if (direct === 'asc') {
                i == 0 && this.cursor.setCursorPos(end);
            } else {
                i == ranges.length - 1 && this.cursor.setCursorPos(end);
            }
        }
        historyObj = {
            type: Util.command.REPLACE,
            cursorPos: historyRnageList,
            text: deleteText
        }
        if (!command) { // 新增历史记录
            this.history.pushHistory(historyObj);
        } else { // 撤销或重做操作后，更新历史记录
            this.history.updateHistory(historyObj);
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
        this.cursor.multiCursorPos.map((item) => {
            let selectedRange = this.selecter.getRangeByCursorPos(item);
            let start = null;
            if (selectedRange) {
                ranges.push(selectedRange);
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
            ranges.push({
                start: start,
                end: {
                    line: item.line,
                    column: this.htmls[item.line - 1].text.length
                }
            });
            preItem = item;
        });
        ranges.map((item) => {
            let str = this.getRangeText(item.start, item.end);
            text = str[0] === '\n' ? text += str : text += '\n' + str;
        });
        cut && this.deleteContent(null, ranges);
        return text.slice(1);
    }
    // 获取待搜索的文本
    getToSearchObj() {
        //存在多个选择范围时，不能执行单词搜索
        if (this.selecter.selectedRanges.length > 1) {
            return {
                text: ''
            }
        }
        let selectedRange = this.selecter.getRangeByCursorPos(this.nowCursorPos);
        let wholeWord = false;
        let searchText = '';
        if (selectedRange) {
            searchText = this.getRangeText(selectedRange.start, selectedRange.end);
        } else {
            let text = this.htmls[this.nowCursorPos.line - 1].text;
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
        return {
            text: searchText,
            wholeWord: wholeWord,
            ignoreCase: wholeWord,
        }
    }
}