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
        this.multiCursorPosLineMap = new Map();
        this.multiCursorPos = [];
    }
    initProperties(editor, context) {
        Util.defineProperties(this, editor, [
            'nowCursorPos',
            'selecter',
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
                this.multiCursorPosLineMap.delete(cursorPos.line);
                this.multiCursorPos.splice(index, 1);
                cursorPos.del = true;
            }
            return;
        }
        this.multiCursorPos.map((cursorPos) => {
            cursorPos.del = true;
        });
        this.multiCursorPos.empty();
        this.multiCursorPosLineMap.clear();
        this.setNowCursorPos(null);
    }
    hasCursorPos(cursorPos) {
        let posArr = this.multiCursorPosLineMap.get(cursorPos.line) || [];
        return posArr.indexOf(cursorPos) > -1;
    }
    // 更新光标位置
    updateCursorPos(cursorPos, line, column, updateAfter) {
        if (!this.hasCursorPos(cursorPos)) {
            return;
        }
        let originLine = cursorPos.line;
        let needToDel = null;
        updateAfter && this.updateAfterPos(cursorPos, line, column);
        cursorPos.line = line;
        cursorPos.column = column;
        cursorPos.line !== originLine && this.setCursorPosLineMap();
        let posArr = this.multiCursorPosLineMap.get(cursorPos.line) || [];
        let index = posArr.indexOf(cursorPos);
        // 过滤重叠光标
        if (posArr[index - 1] && Util.comparePos(posArr[index - 1], cursorPos) === 0) {
            needToDel = posArr[index - 1];
            posArr.splice(index - 1, 1);
        } else if (posArr[index + 1] && Util.comparePos(posArr[index + 1], cursorPos) === 0) {
            needToDel = posArr[index + 1];
            posArr.splice(index + 1, 1);
        }
        if (needToDel) {
            index = this.multiCursorPos.indexOf(needToDel);
            this.multiCursorPos.splice(index, 1);
        }
        this.setCursorRealPos();
        if (cursorPos === this.nowCursorPos) {
            //触发滚动
            this.setNowCursorPos(this.nowCursorPos);
        }
    }
    updateAfterPos(cursorPos, line, column) {
        this.multiCursorPos.map((item) => {
            _updateAfter(item);
        });
        this.selecter.selectedRanges.map((item) => {
            _updateAfter(item.start);
            _updateAfter(item.end);
        });
        if (cursorPos.line != line) {
            this.setCursorPosLineMap();
        }

        function _updateAfter(item) {
            if (item != cursorPos) {
                if (item.line > cursorPos.line) {
                    item.line += line - cursorPos.line;
                } else if (item.line === cursorPos.line && item.column > cursorPos.column) {
                    item.line += line - cursorPos.line;
                    item.column += column - cursorPos.column;
                }
            }
        }
    }
    // 添加光标
    addCursorPos(cursorPos) {
        let posArr = this.multiCursorPosLineMap.get(cursorPos.line) || [];
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
        this.multiCursorPos.push(cursorPos);
        this.multiCursorPos.sort((a, b) => {
            if (a.line == b.line) {
                return a.column - b.column;
            }
            return a.line - b.line;
        });
        this.setCursorPosLineMap();
        this.setNowCursorPos(cursorPos);
        return cursorPos;
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
        this.setCursorPosLineMap();
        this.setNowCursorPos(cursorPos);
    }
    // 设置光标和行号映射
    setCursorPosLineMap() {
        this.multiCursorPosLineMap = new Map();
        this.multiCursorPos.map((item) => {
            if (!this.multiCursorPosLineMap.has(item.line)) {
                this.multiCursorPosLineMap.set(item.line, []);
            }
            this.multiCursorPosLineMap.get(item.line).push(item);
        });
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
}