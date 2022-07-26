import Util from '@/common/util';
import Enum from '@/data/enum';
import expand from 'emmet';

const regs = {
    endTag: /(?=\<\/)/,
};

export default class {
    constructor(editor, context) {
        this.editor = editor;
        this.context = context;
    }
    replace(texts, ranges, afterCursorPosList) {
        let historyArr = null;
        let serial = this.context.serial++;
        let originCursorPosList = [];
        this.editor.cursor.multiCursorPos.forEach((item) => {
            let range = this.editor.selecter.getRangeByCursorPos(item);
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
        });
        historyArr = this.context._deleteMultiContent({ rangeOrCursorList: ranges });
        historyArr.serial = serial;
        historyArr.originCursorPosList = originCursorPosList;
        this.editor.history.pushHistory(historyArr);
        historyArr = this.context._insertMultiContent({
            text: texts,
            cursorPosList: historyArr.map((item) => { return item.cursorPos })
        });
        historyArr.serial = serial;
        historyArr.afterCursorPosList = afterCursorPosList;
        this.editor.history.pushHistory(historyArr);
        if(afterCursorPosList) {
            this.context.addCursorList(afterCursorPosList);
        } else {
            this.context.addCursorList(historyArr.map((item) => { return item.cursorPos }));
        }
    }
    // 文件变动，重写加载文件内容
    reload(text, afterCursorPosList) {
        let range = {
            start: { line: 1, column: 0 },
            end: { line: this.context.htmls.length, column: this.context.htmls.peek().text.length }
        };
        this.replace(text, [range], afterCursorPosList);
    }
    // 点击自动提示替换输入的内容
    replaceTip(tip) {
        let word = tip.word || '';
        let after = tip.after || '';
        let before = tip.before || '';
        let result = before + _getResult(tip) + after;
        let ranges = null;
        if (result === word) {
            //替换前后一致，不做操作
            return;
        }
        ranges = _getRanges.call(this);
        this.replace(result, ranges);
        _updatePos.call(this);
        if (tip.type === Enum.TOKEN_TYPE.CSS_PROPERTY) {
            //选中css属性名后，自动弹出属性值列表
            this.editor.autocomplete.search();
        }

        function _getResult(tip) {
            let result = '';
            if (tip.type === Enum.TOKEN_TYPE.EMMET_HTML || tip.type === Enum.TOKEN_TYPE.EMMET_CSS) {
                try {
                    const config = {};
                    if (tip.type === Enum.TOKEN_TYPE.EMMET_CSS) {
                        config.type = 'stylesheet';
                    }
                    result = expand(tip.result, config);
                } catch (e) {
                    result = tip.result;
                }
            } else if (tip.type === Enum.TOKEN_TYPE.TAG_NAME) {
                result += tip.result + `></${tip.result}>`;
            } else {
                result = tip.result;
            }
            return result;
        }

        function _getRanges() {
            let ranges = [];
            this.editor.cursor.multiCursorPos.forEach(cursorPos => {
                let range = null;
                range = {
                    start: { line: cursorPos.line, column: cursorPos.column - word.length },
                    end: { line: cursorPos.line, column: cursorPos.column }
                };
                ranges.push(range);
            });
            return ranges;
        }

        function _updatePos() {
            if (tip.type === Enum.TOKEN_TYPE.TAG_NAME || tip.type === Enum.TOKEN_TYPE.EMMET_HTML) {
                //生成标签后，光标定位到标签中间的位置
                let exec = regs.endTag.exec(result);
                if (exec) {
                    let text = result.slice(exec.index);
                    let deltaArr = text.split(/\r\n|\n/);
                    let multiCursorPos = this.editor.cursor.multiCursorPos.toArray();
                    for (let i = multiCursorPos.length - 1; i >= 0; i--) {
                        let cursorPos = _getDeltaPos.call(this, deltaArr, multiCursorPos[i]);
                        this.editor.cursor.updateCursorPos(multiCursorPos[i], cursorPos.line, cursorPos.column);
                    }
                }
            } else if (tip.type === Enum.TOKEN_TYPE.ATTR_NAME) {
                //选中标签属性后，光标移动端""内
                this.editor.cursor.multiCursorPos.forEach(item => {
                    this.editor.cursor.moveCursor(item, 'left');
                });
            }
        }

        function _getDeltaPos(deltaArr, cursorPos) {
            let line = cursorPos.line;
            let column = cursorPos.column;
            if (deltaArr.length === 1) {
                column -= deltaArr[0].length;
            } else {
                line -= deltaArr.length - 1;
                column = this.context.htmls[line - 1].text.length - deltaArr[0].length;
            }
            return {
                line: line,
                column: column
            };
        }
    }
}