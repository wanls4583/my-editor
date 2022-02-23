/*
 * @Author: lisong
 * @Date: 2022-02-14 11:20:31
 * @Description: 
 */
import Util from '@/common/Util';
const regs = {
    word: /[a-zA-Z0-9_]/,
    dWord: Util.fullAngleReg,
    space: /\s/
}
export default class {
    constructor(editor, context) {
        this.initProperties(editor, context);
        this.multiCursorPos = [];
    }
    initProperties(editor, context) {
        Util.defineProperties(this, editor, [
            'nowCursorPos',
            'fSelecter',
            'fSearcher',
            'setNowCursorPos',
            'setCursorRealPos',
            'getColumnByWidth',
            'getStrWidth'
        ]);
        Util.defineProperties(this, context, ['htmls']);
    }
    clearCursorPos(cursorPos) {
        if (cursorPos) {
            let index = this.multiCursorPos.indexOf(cursorPos);
            if (index > -1) {
                this.multiCursorPos.splice(index, 1);
                cursorPos.del = true;
            }
            return;
        }
        this.multiCursorPos.map((cursorPos) => {
            cursorPos.del = true;
        });
        this.multiCursorPos.empty();
        this.setNowCursorPos(null);
    }
    // 添加光标
    addCursorPos(cursorPos) {
        let posArr = this.getCursorsByLine(cursorPos.line);
        for (let pos of posArr) {
            // 添加的光标已存在
            if (Util.comparePos(cursorPos, pos) === 0) {
                this.setNowCursorPos(pos);
                return pos;
            }
        }
        cursorPos = {
            line: cursorPos.line,
            column: cursorPos.column
        };
        this.multiCursorPos.insert(cursorPos, Util.comparePos);
        this.setNowCursorPos(cursorPos);
        return cursorPos;
    }
    // 更新光标位置
    updateCursorPos(cursorPos, line, column) {
        cursorPos.line = line;
        cursorPos.column = column;
        this.setCursorRealPos();
        if (cursorPos === this.nowCursorPos) { //触发滚动
            this.setNowCursorPos(this.nowCursorPos);
        }
    }
    updateAfterPos(cursorPos, line, column) {
        this.multiCursorPos.map((item) => {
            if (item != cursorPos) {
                if (item.line > cursorPos.line) {
                    item.line += line - cursorPos.line;
                } else if (item.line === cursorPos.line && item.column >= cursorPos.column) {
                    item.line += line - cursorPos.line;
                    item.column += column - cursorPos.column;
                }
            }
        });
    }
    updateAllCursorPos(lineDelta, preColumn, nowColumn) {
        let prePos = null;
        let columnDelta = nowColumn - preColumn;
        let column = columnDelta;
        this.multiCursorPos.map((item) => {
            let originPos = Object.assign({}, item);
            if (!lineDelta) {
                if (prePos && item.line > prePos.line) {
                    column = columnDelta;
                }
                item.column += column;
                column += columnDelta;
            } else {
                item.line += lineDelta;
                if (lineDelta > 0) {
                    item.column = nowColumn;
                } else {
                    item.column += nowColumn - preColumn;
                }
            }
            if (item === this.nowCursorPos) { //触发滚动
                this.setNowCursorPos(item);
            }
            prePos = originPos;
            lineDelta += lineDelta;
        });
        this.setCursorRealPos();
    }
    // 设置光标
    setCursorPos(cursorPos) {
        cursorPos = {
            line: cursorPos.line,
            column: cursorPos.column
        };
        if (this.multiCursorPos.length == 1) {
            let pos = this.multiCursorPos[0];
            if (Util.comparePos(pos, cursorPos) === 0) {
                return;
            }
        }
        this.multiCursorPos.empty();
        this.multiCursorPos.push(cursorPos);
        this.setNowCursorPos(cursorPos);
    }
    getCursorsByLine(line) {
        let left = 0;
        let right = this.multiCursorPos.length - 1;
        let result = [];
        while (left < right) {
            let mid = Math.floor((left + right) / 2);
            if (this.multiCursorPos[mid].line == line) {
                left = mid;
                break;
            } else if (this.multiCursorPos[mid].line > line) {
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        }
        let index = left;
        while (index < this.multiCursorPos.length && this.multiCursorPos[index].line === line) {
            result.push(this.multiCursorPos[index]);
            index++;
        }
        index = left - 1;
        while (index >= 0 && this.multiCursorPos[index].line === line) {
            result.push(this.multiCursorPos[index]);
            index--;
        }
        return result;
    }
    // 移动光标
    moveCursor(cursorPos, direct, wholeWord) {
        let text = this.htmls[cursorPos.line - 1].text;
        let line = cursorPos.line;
        let column = cursorPos.column;
        if (direct === 'up') {
            if (line > 1) {
                let width = this.getStrWidth(text, 0, column);
                line--;
                text = this.htmls[line - 1].text;
                column = this.getColumnByWidth(text, width);
            }
        } else if (direct === 'down') {
            if (line < this.htmls.length) {
                let width = this.getStrWidth(text, 0, column);
                line++;
                text = this.htmls[line - 1].text;
                column = this.getColumnByWidth(text, width);
            }
        } else if (direct === 'left') {
            while (column === 0 && line > 1) {
                line--;
                text = this.htmls[line - 1].text;
                column = text.length;
            }
            if (column === 0) {
                this.updateCursorPos(cursorPos, line, column);
                return {
                    line: line,
                    column: column
                }
            }
            if (wholeWord) {
                let sReg = null;
                //过滤开始的空格
                while (column && text[column - 1].match(regs.space)) {
                    column--;
                }
                if (column == 0) {
                    this.updateCursorPos(cursorPos, line, column);
                    return {
                        line: line,
                        column: column
                    }
                }
                if (text[column - 1].match(regs.word)) { //半角文字
                    sReg = regs.word;
                } else if (text[column - 1].match(regs.dWord)) { //全角文字或字符
                    sReg = regs.dWord;
                }
                if (sReg) {
                    while (column && text[column - 1].match(sReg)) {
                        column--
                    }
                } else {
                    while (column &&
                        !text[column - 1].match(regs.space) &&
                        !text[column - 1].match(regs.word) &&
                        !text[column - 1].match(regs.dWord)) {
                        column--
                    }
                }
            } else if (cursorPos.line === line) {
                column--;
            }
        } else {
            while (column === text.length && line < this.htmls.length) {
                line++;
                column = 0;
                text = this.htmls[line - 1].text;
            }
            if (column == text.length) {
                this.updateCursorPos(cursorPos, line, column);
                return {
                    line: line,
                    column: column
                }
            }
            if (wholeWord) {
                let sReg = null;
                //过滤开始的空格
                while (column < text.length && text[column].match(regs.space)) {
                    column++;
                }
                if (column == text.length) {
                    this.updateCursorPos(cursorPos, line, column);
                    return {
                        line: line,
                        column: column
                    }
                }
                if (text[column].match(regs.word)) { //半角文字
                    sReg = regs.word;
                } else if (text[column].match(regs.dWord)) { //全角文字或字符
                    sReg = regs.dWord;
                }
                if (sReg) {
                    while (column < text.length && text[column].match(sReg)) {
                        column++
                    }
                } else {
                    while (column < text.length &&
                        !text[column].match(regs.space) &&
                        !text[column].match(regs.word) &&
                        !text[column].match(regs.dWord)) {
                        column++
                    }
                }
            } else if (cursorPos.line === line) {
                column++;
            }
        }
        this.updateCursorPos(cursorPos, line, column);
        return {
            line: line,
            column: column
        }
    }
    // 过滤重叠光标
    filterCursorPos() {
        let multiCursorPos = [];
        let prePos = null;
        this.multiCursorPos.map((item) => {
            if (!prePos || Util.comparePos(item, prePos) !== 0) {
                multiCursorPos.push(item);
            }
            prePos = item;
        });
        this.multiCursorPos = multiCursorPos;
    }
}