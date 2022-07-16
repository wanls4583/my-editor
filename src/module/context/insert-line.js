import Util from '@/common/util';

export default class {
    constructor(editor, context) {
        this.editor = editor;
        this.context = context;
    }
    insertEmptyLineUp() {
        let cursorPosList = [];
        let preItem = {};
        let lineOne = false;
        let historyArr = null;
        let originCursorPosList = [];
        this.editor.cursor.multiCursorPos.forEach((item) => {
            let range = this.editor.selecter.getRangeByCursorPos(item);
            if (preItem.line !== item.line) {
                if (item.line === 1) {
                    cursorPosList.push({
                        line: item.line,
                        column: 0
                    });
                    lineOne = true;
                } else {
                    cursorPosList.push({
                        line: item.line - 1,
                        column: this.context.htmls[item.line - 2].text.length
                    });
                }
            }
            if (range) {
                originCursorPosList.push({
                    start: { line: range.start.line, column: range.start.column },
                    end: { line: range.end.line, column: range.end.column },
                    ending: Util.comparePos(range.start, range) === 0 ? 'left' : 'right'
                });
            } else {
                originCursorPosList.push({
                    line: item.line,
                    column: item.column
                });
            }
            preItem = item;
        });
        historyArr = this.context._insertMultiContent({ text: '\n', cursorPosList });
        historyArr.originCursorPosList = originCursorPosList;
        this.context.addCursorList(historyArr.map((item) => { return item.cursorPos }));
        this.editor.history.pushHistory(historyArr);
        if (lineOne) {
            this.editor.cursor.updateCursorPos(this.editor.cursor.multiCursorPos.get(0), 1, 0);
        }
    }
    insertEmptyLineDown() {
        let cursorPosList = [];
        let preItem = {};
        let historyArr = null;
        let originCursorPosList = [];
        this.editor.cursor.multiCursorPos.forEach((item) => {
            let range = this.editor.selecter.getRangeByCursorPos(item);
            if (preItem.line !== item.line) {
                cursorPosList.push({
                    line: item.line,
                    column: this.context.htmls[item.line - 1].text.length
                });
            }
            if (range) {
                originCursorPosList.push({
                    start: { line: range.start.line, column: range.start.column },
                    end: { line: range.end.line, column: range.end.column },
                    ending: Util.comparePos(range.start, range) === 0 ? 'left' : 'right'
                });
            } else {
                originCursorPosList.push({
                    line: item.line,
                    column: item.column
                });
            }
            preItem = item;
        });
        historyArr = this.context._insertMultiContent({ text: '\n', cursorPosList });
        historyArr.originCursorPosList = originCursorPosList;
        this.context.addCursorList(historyArr.map((item) => { return item.cursorPos }));
        this.editor.history.pushHistory(historyArr);
    }
}