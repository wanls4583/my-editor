/*
 * @Author: lisong
 * @Date: 2022-02-18 13:42:22
 * @Description: 
 */
import Util from '@/common/Util';
import cursor from '../cursor';
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
    insertContent(text, cursorPos, commandObj) {
        let historyArr = [];
        let historyObj = null;
        let cursorPosList = [];
        if (!cursorPos) {
            // 如果有选中区域，需要先删除选中区域
            for (let i = 0; i < this.selecter.selectedRanges.length; i++) {
                let item = this.selecter.selectedRanges[i];
                if (this.selecter.checkSelectedActive(item)) {
                    this.deleteContent();
                    break;
                }
            }
            cursorPosList = this.cursor.multiCursorPos;
        } else {
            cursorPos = cursorPos instanceof Array ? cursorPos : [cursorPos];
            cursorPos.map((item) => {
                cursorPosList.push(this.cursor.addCursorPos(item));
            });
        }
        let texts = text instanceof Array ? text : text.split(/\r\n|\n/);
        let prePos = null;
        let preOriginPos = null;
        cursorPosList.map((cursorPos, index) => {
            let _text = texts.length === this.cursor.multiCursorPos.length ? texts[index] : text;
            let originPos = Object.assign({}, cursorPos);
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
            cursorPos.line = historyObj.cursorPos.line;
            cursorPos.column = historyObj.cursorPos.column;
            prePos = cursorPos;
            preOriginPos = originPos;
        });
        this.setNowCursorPos(this.cursor.multiCursorPos[0]);
        historyObj = historyArr.length > 1 ? historyArr : historyArr[0];
        if (!commandObj) { // 新增历史记录
            this.history.pushHistory(historyObj);
        } else { // 撤销或重做操作后，更新历史记录
            this.history.updateHistory(historyObj);
        }
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
        this.selecter.clearRange();
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
    deleteContent(keyCode, rangePos, isCommand) {
        let that = this;
        let historyArr = [];
        let historyObj = null;
        let rangeList = [];
        if (rangePos) {
            rangeList = rangePos instanceof Array ? rangePos : [rangePos];
        } else {
            this.cursor.multiCursorPos.map((item) => {
                let selectedRange = this.selecter.checkCursorSelected(item);
                if (selectedRange) {
                    rangeList.push(selectedRange);
                } else {
                    rangeList.push(item);
                }
            });
        }
        let prePos = null;
        let preOriginPos = null;
        rangeList.map((cursorPos) => {
            if (cursorPos.start) {
                _deleteRangePos(cursorPos);
            } else {
                _deleteCursorPos(cursorPos);
            }
        });
        historyObj = historyArr.length > 1 ? historyArr : historyArr[0];
        if (!isCommand) { // 新增历史记录
            historyObj && this.history.pushHistory(historyObj);
        } else { // 撤销或重做操作后，更新历史记录
            this.history.updateHistory(historyObj);
        }
        if (rangeList[0].start) {
            this.cursor.clearCursorPos();
            historyArr.map((item) => {
                this.cursor.addCursorPos(item.cursorPos);
            });
        }
        this.setNowCursorPos(this.cursor.multiCursorPos[0]);
        this.cursor.filterCursorPos();

        function _deleteCursorPos(cursorPos) {
            let originPos = Object.assign({}, cursorPos);
            if (prePos) {
                if (preOriginPos.line === cursorPos.line) {
                    cursorPos.line = prePos.line;
                    cursorPos.column = prePos.column + cursorPos.column - preOriginPos.column;
                } else {
                    cursorPos.line = prePos.line + cursorPos.line - preOriginPos.line;
                }
            }
            historyObj = that._deleteContent(cursorPos, keyCode);
            historyArr.push(historyObj);
            cursorPos.line = historyObj.cursorPos.line;
            cursorPos.column = historyObj.cursorPos.column;
            prePos = cursorPos;
            preOriginPos = originPos;
        }

        function _deleteRangePos(rangePos) {
            let originRangePos = {
                start: Object.assign({}, rangePos.start),
                end: Object.assign({}, rangePos.end)
            }
            if (prePos) {
                if (preOriginPos.line === rangePos.start.line) {
                    rangePos.start.line = prePos.line;
                    rangePos.start.column = prePos.column + rangePos.start.column - preOriginPos.column;
                    if (originRangePos.end.line === originRangePos.start.line) {
                        rangePos.end.column = rangePos.start.column + originRangePos.end.column - originRangePos.start.column;
                    }
                } else {
                    rangePos.start.line = prePos.line + rangePos.start.line - preOriginPos.line;
                    rangePos.end.line = rangePos.end.line + rangePos.start.line - originRangePos.start.line;
                }
            }
            historyObj = that._deleteContent(rangePos, keyCode);
            historyArr.push(historyObj);
            rangePos.end.line = historyObj.cursorPos.line;
            rangePos.end.column = historyObj.cursorPos.column;
            prePos = historyObj.cursorPos;
            preOriginPos = originRangePos.end;
        }
    }
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
            originPos = {
                line: end.line,
                column: end.column
            };
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
            keyCode: keyCode,
            text: deleteText
        };
        return historyObj;
    }
    moveLineUp(cursorPos, isCommand) {
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
        if (!isCommand) { // 新增历史记录
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
    moveLineDown(cursorPos, isCommand) {
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
        if (!isCommand) { // 新增历史记录
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
    copyLine(cursorPos, isCommand, direct) {
        let copyedLineMap = {};
        let cursorPosList = [];
        let historyPosList = [];
        direct = direct || 'up';
        if (cursorPos) {
            cursorPosList = cursorPos instanceof Array ? cursorPos : [cursorPos];
        } else {
            this.cursor.multiCursorPos.map((item) => {
                if (!copyedLineMap[item.line]) {
                    cursorPosList.push(item);
                    copyedLineMap[item.line] = true;
                }
            });
        }
        cursorPosList.slice().reverse().map((cursorPos) => {
            let text = this.htmls[cursorPos.line - 1].text;
            cursorPos = this.cursor.addCursorPos(cursorPos);
            historyPosList.push(cursorPos);
            this._insertContent('\n' + text, {
                line: cursorPos.line,
                column: text.length
            });
            this.cursor.updateAfterPos({
                line: cursorPos.line + (direct === 'up' ? 1 : 0),
                column: 0
            }, cursorPos.line + (direct === 'up' ? 2 : 1), 0);
        });
        historyPosList = historyPosList.map((item) => {
            return {
                line: item.line,
                column: item.column
            };
        }).reverse();
        this.renderSelectedBg();
        let historyObj = {
            type: direct === 'up' ? Util.command.DELETE_COPY_DOWN : Util.command.DELETE_COPY_UP,
            cursorPos: historyPosList
        }
        if (!isCommand) { // 新增历史记录
            this.history.pushHistory(historyObj);
        } else { // 撤销或重做操作后，更新历史记录
            this.history.updateHistory(historyObj);
        }
    }
    // 向上复制一行
    copyLineUp(cursorPos, isCommand) {
        this.copyLine(cursorPos, isCommand, 'up');
    }
    // 向下复制一行
    copyLineDown(cursorPos, isCommand) {
        this.copyLine(cursorPos, isCommand, 'down');
    }
    deleteCopyLine(cursorPos, isCommand, direct) {
        let copyedLineMap = {};
        let cursorPosList = [];
        let historyPosList = [];
        direct = direct || 'down';
        if (cursorPos) {
            cursorPosList = cursorPos instanceof Array ? cursorPos : [cursorPos];
        } else {
            this.cursor.multiCursorPos.reverse().slice().map((item) => {
                if (!copyedLineMap[item.line]) {
                    cursorPosList.push(item);
                }
            });
        }
        cursorPosList.slice().reverse().map((cursorPos) => {
            let upText = this.htmls[cursorPos.line - (direct === 'down' ? 1 : 2)].text;
            let downText = this.htmls[cursorPos.line - (direct === 'down' ? 0 : 1)].text;
            cursorPos = this.cursor.addCursorPos(cursorPos);
            historyPosList.push(cursorPos);
            this._deleteContent({
                start: {
                    line: cursorPos.line + (direct === 'down' ? 0 : -1),
                    column: upText.length
                },
                end: {
                    line: cursorPos.line + (direct === 'down' ? 1 : 0),
                    column: downText.length
                }
            });
            this.cursor.updateAfterPos({
                line: cursorPos.line + (direct === 'down' ? 1 : 0),
                column: 0
            }, cursorPos.line + (direct === 'down' ? 0 : -1), 0);
        });
        historyPosList = historyPosList.map((item) => {
            return {
                line: item.line,
                column: item.column
            };
        }).reverse();
        this.renderSelectedBg();
        let historyObj = {
            type: direct === 'down' ? Util.command.COPY_UP : Util.command.COPY_DOWN,
            cursorPos: historyPosList
        }
        if (!isCommand) { // 新增历史记录
            this.history.pushHistory(historyObj);
        } else { // 撤销或重做操作后，更新历史记录
            this.history.updateHistory(historyObj);
        }
    }
    // 删除上面一行
    deleteCopyLineUp(cursorPos, isCommand) {
        this.deleteCopyLine(cursorPos, isCommand, 'up');
    }
    // 删除下面一行
    deleteCopyLineDown(cursorPos, isCommand) {
        this.deleteCopyLine(cursorPos, isCommand, 'down');
    }
    // 删除当前行
    deleteLine() {
        let ranges = [];
        let preItem = null;
        this.cursor.multiCursorPos.map((item) => {
            let start = null;
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
    replace(text, ranges, isCommand) {
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
        if (!isCommand) { // 新增历史记录
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
            let selectedRange = this.selecter.checkCursorSelected(item);
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
        let selectedRange = this.selecter.checkCursorSelected(this.nowCursorPos);
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