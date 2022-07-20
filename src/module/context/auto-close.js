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
            nowWord = this.editor.searcher.getNowWord(head.value);
            if (nowWord.text && Util.compairPos(nowWord.range.end, head.value) !== 0) {
                return false;
            }
            cursorPosList.push(cursorPos);
        }
        let originCursorPosList = this.context.getOriginCursorPosList();
        let historyArr = this.context._insertMultiContent({ text: texts, cursorPosList });
        historyArr.originCursorPosList = originCursorPosList;
        this.context.addCursorList(historyArr.map((item) => { return item.cursorPos }));
        this.editor.history.pushHistory(historyArr);
        return true;
    }
}