export default class {
    constructor(editor, context) {
        this.editor = editor;
        this.context = context;
    }
    // 向上移动整行内容
    moveLineUp() {
        let historyArr = null;
        let serial = this.context.serial++;
        let nextLine = Infinity;
        let texts = [];
        let cursorPosList = [];
        let originCursorPosList = [];
        let afterCursorPosList = [];
        let list = this.editor.cursor.multiCursorPos.toArray();
        for (let i = list.length - 1; i >= 0; i--) {
            let item = list[i];
            let range = this.editor.selecter.getRangeByCursorPos(item);
            let replaceRange = null;
            let replaceText = '';
            let joinRange = false;
            if (range) {
                replaceRange = {
                    start: { line: range.start.line - 1, column: 0 },
                    end: { line: range.end.line, column: this.context.htmls[range.end.line - 1].text.length }
                }
                originCursorPosList.push({
                    start: { line: range.start.line, column: range.start.column },
                    end: { line: range.end.line, column: range.end.column },
                });
            } else {
                replaceRange = {
                    start: { line: item.line - 1, column: 0 },
                    end: { line: item.line, column: this.context.htmls[item.line - 1].text.length }
                }
                originCursorPosList.push({ line: item.line, column: item.column });
            }
            if (replaceRange.start.line > 0) {
                if (replaceRange.end.line >= nextLine) { //和下一个替换区域相邻，合并区域
                    let nextRange = cursorPosList.peek();
                    nextRange.start = replaceRange.start;
                    replaceRange = nextRange;
                    joinRange = true;
                } else { //添加替换区域
                    cursorPosList.push(replaceRange);
                }
                replaceText =
                    this.context.getRangeText(
                        { line: replaceRange.start.line + 1, column: 0 },
                        { line: replaceRange.end.line, column: this.context.htmls[replaceRange.end.line - 1].text.length }
                    )
                    + '\n'
                    + this.context.htmls[replaceRange.start.line - 1].text;
                if (joinRange) {
                    texts[texts.length - 1] = replaceText;
                } else {
                    texts.push(replaceText);
                }
                if (range) {
                    afterCursorPosList.push({
                        start: { line: range.start.line - 1, column: range.start.column },
                        end: { line: range.end.line - 1, column: range.end.column },
                    });
                } else {
                    afterCursorPosList.push({ line: item.line - 1, column: item.column });
                }
                nextLine = replaceRange.start.line;
            }
        }
        if (cursorPosList.length) {
            cursorPosList.reverse();
            originCursorPosList.reverse();
            afterCursorPosList.reverse();
            texts.reverse();
            historyArr = this.context._deleteMultiContent({ rangeOrCursorList: cursorPosList });
            historyArr.serial = serial;
            historyArr.originCursorPosList = originCursorPosList;
            this.editor.history.pushHistory(historyArr);
            historyArr = this.context._insertMultiContent({
                text: texts,
                cursorPosList: historyArr.map((item) => { return item.cursorPos })
            });
            historyArr.serial = serial;
            historyArr.afterCursorPosList = afterCursorPosList;
            this.context.addCursorList(afterCursorPosList);
            this.editor.history.pushHistory(historyArr);
        }
    }
    // 向下移动整行内容
    moveLineDown() {
        let historyArr = null;
        let serial = this.context.serial++;
        let preLine = -Infinity;
        let texts = [];
        let cursorPosList = [];
        let originCursorPosList = [];
        let afterCursorPosList = [];
        let list = this.editor.cursor.multiCursorPos.toArray();
        for (let i = 0; i < list.length; i++) {
            let item = list[i];
            let range = this.editor.selecter.getRangeByCursorPos(item);
            let replaceRange = null;
            let replaceText = '';
            let joinRange = false;
            if (range) {
                replaceRange = {
                    start: { line: range.start.line, column: 0 },
                    end: { line: range.end.line + 1, column: this.context.htmls[range.end.line].text.length }
                }
                originCursorPosList.push({
                    start: { line: range.start.line, column: range.start.column },
                    end: { line: range.end.line, column: range.end.column },
                });
            } else {
                replaceRange = {
                    start: { line: item.line, column: 0 },
                    end: { line: item.line + 1, column: this.context.htmls[item.line].text.length }
                }
                originCursorPosList.push({ line: item.line, column: item.column });
            }
            if (replaceRange.end.line < this.editor.maxLine) {
                if (replaceRange.start.line <= preLine + 1) { //和上一个替换区域相邻，合并区域
                    let preRange = cursorPosList.peek();
                    preRange.end = replaceRange.end;
                    replaceRange = preRange;
                    joinRange = true;
                } else { //添加替换区域
                    cursorPosList.push(replaceRange);
                }
                replaceText =
                    this.context.htmls[replaceRange.end.line - 1].text
                    + '\n'
                    + this.context.getRangeText(
                        { line: replaceRange.start.line, column: 0 },
                        { line: replaceRange.end.line - 1, column: this.context.htmls[replaceRange.end.line - 2].text.length }
                    );
                if (joinRange) {
                    texts[texts.length - 1] = replaceText;
                } else {
                    texts.push(replaceText);
                }
                if (range) {
                    afterCursorPosList.push({
                        start: { line: range.start.line + 1, column: range.start.column },
                        end: { line: range.end.line + 1, column: range.end.column },
                    });
                } else {
                    afterCursorPosList.push({ line: item.line + 1, column: item.column });
                }
                preLine = replaceRange.end.line;
            }
        }
        if (cursorPosList.length) {
            historyArr = this.context._deleteMultiContent({ rangeOrCursorList: cursorPosList });
            historyArr.serial = serial;
            historyArr.originCursorPosList = originCursorPosList;
            this.editor.history.pushHistory(historyArr);
            historyArr = this.context._insertMultiContent({
                text: texts,
                cursorPosList: historyArr.map((item) => { return item.cursorPos })
            });
            historyArr.serial = serial;
            historyArr.afterCursorPosList = afterCursorPosList;
            this.context.addCursorList(afterCursorPosList);
            this.editor.history.pushHistory(historyArr);
        }
    }
}