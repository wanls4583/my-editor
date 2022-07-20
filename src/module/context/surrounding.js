import Util from '@/common/util';

export default class {
    constructor(editor, context) {
        this.editor = editor;
        this.context = context;
    }
    check(text) {
        if (text.length > 1 ||
            this.editor.selecter.activedRanges.size != this.editor.cursor.multiCursorPos.size) {
            return false;
        }
        let cursorPos = null;
        let range = null;
        let sourceConfigData = null;
        let pass = false;
        let texts = [];
        let historyArr = null;
        let cursorPosList = [];
        let originCursorPosList = null;
        let afterCursorPosList = [];
        let endings = [];
        let head = this.editor.cursor.multiCursorPos.getHead();
        while (cursorPos = head.next()) {
            pass = false;
            sourceConfigData = this.context.getConfigData(cursorPos);
            if (sourceConfigData) {
                let pair = sourceConfigData.__surroundingPairsMap__[text];
                if (pair) {
                    texts.push(text);
                    texts.push(pair.close);
                    pass = true;
                }
            }
            if (!pass) {
                return false;
            }
            range = this.editor.selecter.getActiveRangeByCursorPos(cursorPos);
            cursorPosList.push(range.start);
            cursorPosList.push(range.end);
            endings.push(Util.comparePos(range.start, cursorPos) === 0 ? 'left' : 'right');
        }
        endings.reverse();
        originCursorPosList = this.context.getOriginCursorPosList();
        historyArr = this.context._insertMultiContent({ text: texts, cursorPosList });
        for (let i = 0; i < historyArr.length; i++) {
            let pos = historyArr[i].cursorPos;
            let nextPos = historyArr[++i].cursorPos;
            afterCursorPosList.push({
                start: { line: pos.line, column: pos.column },
                end: { line: nextPos.line, column: nextPos.column - texts[i].length },
                ending: endings.pop()
            });
        }
        historyArr.originCursorPosList = originCursorPosList;
        historyArr.afterCursorPosList = afterCursorPosList;
        this.context.addCursorList(afterCursorPosList);
        this.editor.history.pushHistory(historyArr);
        return true;
    }
}