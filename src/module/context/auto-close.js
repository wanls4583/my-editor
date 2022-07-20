import Util from '@/common/util';

export default class {
    constructor(editor, context) {
        this.editor = editor;
        this.context = context;
    }
    check(text) {
        if (text.length > 1 || this.editor.selecter.activedRanges.size) {
            return false;
        }
        let nowWord = null;
        let cursorPos = null;
        let sourceConfigData = null;
        let pass = false;
        let _text = '';
        let texts = [];
        let cursorPosList = [];
        let head = this.editor.cursor.multiCursorPos.getHead();
        while (cursorPos = head.next()) {
            pass = false;
            _text = this.context.htmls[cursorPos.line - 1].text.slice(0, cursorPos.column) + text;
            sourceConfigData = this.context.getConfigData(cursorPos);
            if (sourceConfigData) {
                for (let i = 0; i < sourceConfigData.autoClosingPairs.length; i++) {
                    if (_text.endsWith(sourceConfigData.autoClosingPairs[i].open)) {
                        texts.push(text + sourceConfigData.autoClosingPairs[i].close);
                        pass = true;
                        break;
                    }
                }
            }
            if (!pass) {
                return false;
            }
            nowWord = this.editor.searcher.getNowWord(cursorPos);
            if (nowWord.text && Util.comparePos(nowWord.range.end, cursorPos) !== 0) {
                return false;
            }
            cursorPosList.push(cursorPos);
        }
        let originCursorPosList = this.context.getOriginCursorPosList();
        let historyArr = this.context._insertMultiContent({ text: texts, cursorPosList });
        let afterCursorPosList = historyArr.map((item, index) => {
            return { line: item.cursorPos.line, column: item.cursorPos.column - texts[index].length + 1 };
        });
        historyArr.originCursorPosList = originCursorPosList;
        historyArr.afterCursorPosList = afterCursorPosList;
        this.context.addCursorList(afterCursorPosList);
        this.editor.history.pushHistory(historyArr);
        return true;
    }
}