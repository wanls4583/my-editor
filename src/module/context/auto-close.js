import Util from '@/common/util';

export default class {
    constructor(editor, context) {
        this.editor = editor;
        this.context = context;
    }
    check(text) {
        return this.checkOpen(text) || this.checkClose(text);
    }
    checkOpen(text) {
        if (text.length > 1 || this.editor.selecter.activedRanges.size) {
            return false;
        }
        let nowWord = null;
        let cursorPos = null;
        let sourceConfigData = null;
        let pass = false;
        let beforText = '';
        let texts = [];
        let cursorPosList = [];
        let head = this.editor.cursor.multiCursorPos.getHead();
        while (cursorPos = head.next()) {
            pass = false;
            beforText = this.context.htmls[cursorPos.line - 1].text.slice(0, cursorPos.column) + text;
            sourceConfigData = this.context.getConfigData(cursorPos);
            if (sourceConfigData) {
                for (let i = 0; i < sourceConfigData.autoClosingPairs.length; i++) {
                    let item = sourceConfigData.autoClosingPairs[i];
                    if (beforText.endsWith(item.open)) {
                        texts.push(text + item.close);
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
    checkClose(text) {
        if (text.length > 1 || this.editor.selecter.activedRanges.size) {
            return false;
        }
        let nowWord = null;
        let cursorPos = null;
        let sourceConfigData = null;
        let pass = false;
        let close = '';
        let beforText = '';
        let afterText = '';
        let cursorPosList = [];
        let head = this.editor.cursor.multiCursorPos.getHead();
        while (cursorPos = head.next()) {
            pass = false;
            beforText = this.context.htmls[cursorPos.line - 1].text;
            afterText = beforText.slice(cursorPos.column);
            beforText = beforText.slice(0, cursorPos.column) + text;
            sourceConfigData = this.context.getConfigData(cursorPos);
            if (sourceConfigData) {
                for (let i = 0; i < sourceConfigData.autoClosingPairs.length; i++) {
                    let item = sourceConfigData.autoClosingPairs[i];
                    if (beforText.endsWith(item.close)) {
                        if (afterText.startsWith(item.close)) {
                            close = item.close;
                            pass = true;
                        }
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
            cursorPosList.push({ line: cursorPos.line, column: cursorPos.column + close.length });
        }
        this.editor.cursor.clearCursorPos();
        this.context.addCursorList(cursorPosList);
        return true;
    }
}