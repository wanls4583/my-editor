export default class {
    constructor(editor, context) {
        this.editor = editor;
        this.context = context;
    }
    // 向上复制行内容
    copyLineUp() {
        this.copyLine('up');
    }
    // 向下复制行内容
    copyLineDown() {
        this.copyLine('down');
    }
    // 复制行内容
    copyLine(copyDirect = 'up') {
        let historyArr = null;
        let index = 0;
        let preLine = -1;
        let texts = [];
        let cursorPosList = [];
        let originCursorPosList = [];
        let afterCursorPosList = [];
        let list = this.editor.cursor.multiCursorPos.toArray();
        for (let i = 0; i < list.length; i++) {
            let item = list[i];
            let range = this.editor.selecter.getRangeByCursorPos(item);
            let cursorPos = null;
            let text = '';
            if (range) {
                cursorPos = { line: range.start.line, column: 0 };
                text =
                    this.context.htmls.slice(range.start.line - 1, range.end.line).map((item) => {
                        return item.text;
                    }).join('\n') + '\n';
                originCursorPosList.push({
                    start: { line: range.start.line, column: range.start.column },
                    end: { line: range.end.line, column: range.end.column },
                });
                list[i] = range;
            } else {
                cursorPos = { line: item.line, column: 0 };
                text = this.context.htmls[item.line - 1].text + '\n';
                originCursorPosList.push({ line: item.line, column: item.column });
            }
            if (cursorPos.line > preLine) { //添加移动区域
                cursorPosList.push(cursorPos);
                texts.push(text);
            } else if (range) { //合并移动区域
                if (range.end.line > range.start.line) {
                    texts[texts.length - 1] +=
                        this.context.htmls.slice(range.start.line, range.end.line).map((item) => {
                            return item.text;
                        }).join('\n') + '\n';
                }
            }
            preLine = range ? range.end.line : item.line;
        }
        historyArr = this.context._insertMultiContent({ text: texts, cursorPosList, afterCursorPosList });
        historyArr.originCursorPosList = originCursorPosList;
        historyArr.afterCursorPosList = afterCursorPosList;
        // 更正光标位置
        for (let i = 0; i < historyArr.length; i++) {
            let cursorPos = historyArr[i].cursorPos;
            let item = list[index];
            let nextItem = null;
            let preLine = -1;
            let preCursorPos = null;
            if (item.start) {
                let delta = item.end.line - item.start.line;
                preLine = item.end.line;
                if (copyDirect === 'up') {
                    preCursorPos = {
                        start: { line: cursorPos.line, column: item.start.column },
                        end: { line: cursorPos.line + delta, column: item.end.column },
                    };
                } else {
                    preCursorPos = {
                        start: { line: cursorPos.line - 1 - delta, column: item.start.column },
                        end: { line: cursorPos.line - 1, column: item.end.column },
                    }
                }
            } else {
                preLine = item.line;
                if (copyDirect === 'up') {
                    preCursorPos = { line: cursorPos.line, column: item.column };
                } else {
                    preCursorPos = { line: cursorPos.line - 1, column: item.column };
                }
            }
            afterCursorPosList.push(preCursorPos);
            nextItem = list[++index];
            while (nextItem) {
                let line = preCursorPos.end ? preCursorPos.end.line : preCursorPos.line;
                if (nextItem.start) {
                    if (nextItem.start.line === preLine) {
                        let delta = nextItem.end.line - nextItem.start.line;
                        preLine = nextItem.end.line;
                        preCursorPos = {
                            start: { line: line, column: nextItem.start.column },
                            end: { line: line + delta, column: nextItem.end.column }
                        };
                        afterCursorPosList.push(preCursorPos);
                    } else {
                        break;
                    }
                } else if (nextItem.line === preLine) {
                    preLine = nextItem.line;
                    preCursorPos = { line: line, column: nextItem.column };
                    afterCursorPosList.push(preCursorPos);
                } else {
                    break;
                }
                nextItem = list[++index];
            }
        }
        this.context.addCursorList(afterCursorPosList);
        this.editor.history.pushHistory(historyArr);
    }
}