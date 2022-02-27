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
    clearCursorPos(posList) {
        if (posList) {
            let posMap = [];
            posList = posList instanceof Array ? posList : [posList];
            posList.map((item) => {
                posMap[item.line + ',' + item.column] = true;
            });
            this.multiCursorPos = this.multiCursorPos.filter((item) => {
                if (posMap[item.line + ',' + item.column]) {
                    item.del = true;
                    return false;
                }
                return true;
            });
        }
        this.multiCursorPos.map((item) => {
            item.del = true;
        });
        this.multiCursorPos.empty();
        this.setNowCursorPos(null);
    }
    // 添加光标
    addCursorPos(cursorPos) {
        let pos = this.getCursorsByLineColumn(cursorPos.line, cursorPos.column);
        if (pos) {
            this.setNowCursorPos(pos);
            return pos;
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
        if (cursorPos === this.nowCursorPos) { //触发滚动
            this.setNowCursorPos(this.nowCursorPos);
        } else {
            this.setCursorRealPos();
        }
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
        return cursorPos;
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
    getCursorsByLineColumn(line, column) {
        let left = 0;
        let right = this.multiCursorPos.length - 1;
        while (left <= right) {
            let mid = Math.floor((left + right) / 2);
            let item = this.multiCursorPos[mid];
            if (item.line == line) {
                if (item.column === column) {
                    return item;
                } else if (item.column > column) {
                    right = mid - 1;
                } else {
                    left = mid + 1;
                }
            } else if (item.line > line) {
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        }
    }
    // 移动光标
    moveCursor(cursorPos, direct, wholeWord) {
        let text = this.htmls[cursorPos.line - 1].text;
        let line = cursorPos.line;
        let column = cursorPos.column;
        if (direct === 'home') {
            column = 0;
        } else if (direct === 'end') {
            column = this.htmls[line - 1].text.length;
        } else if (direct === 'up') {
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