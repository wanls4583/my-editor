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
    }
    initProperties(editor, context) {
        Util.defineProperties(this, editor, [
            'selectedRanges',
            'nowCursorPos',
            'multiCursorPos',
            'setCursorRealPos',
            'setNowCursorPos',
            'getColumnByWidth',
            'getStrWidth'
        ]);
        Util.defineProperties(this, context, ['htmls']);
    }
    clearCursorPos() {
        this.multiCursorPos.map((cursorPos) => {
            cursorPos.del = true;
        });
        this.multiCursorPos.empty();
        this.setNowCursorPos(null);
    }
    // 更新光标位置
    updateCursorPos(cursorPos, line, column, updateAfter) {
        if (updateAfter) {
            this.multiCursorPos.map((item) => {
                _updateAfter(item);
            });
            this.selectedRanges.map((item) => {
                _updateAfter(item.start);
                _updateAfter(item.end);
            });
        }
        if (!cursorPos.del) {
            cursorPos.line = line;
            cursorPos.column = column;
            this.setCursorRealPos(cursorPos);
            this.filterMultiCursorPos();
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
    updateAfterCursor(cursorPos, line, column, aftetrList) {
        aftetrList.map((item) => {
            _updateAfter(item);
        });

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
        if (this.multiCursorPos.filter((item) => {
                if (Util.comparePos(cursorPos, item) == 0) {
                    cursorPos = item;
                    return true;
                }
                return false;
            }).length > 0) {
            return cursorPos;
        }
        cursorPos = Object.assign({}, cursorPos);
        this.multiCursorPos.push(cursorPos);
        this.multiCursorPos.sort((a, b) => {
            if (a.line == b.line) {
                return a.column - b.column;
            }
            return a.line - b.line;
        });
        this.setNowCursorPos(cursorPos);
        this.setCursorRealPos(cursorPos);
        return cursorPos;
    }
    // 设置光标
    setCursorPos(cursorPos) {
        cursorPos = Object.assign({}, cursorPos);
        if (this.multiCursorPos.length == 1) {
            let pos = this.multiCursorPos[0];
            if (pos.line === cursorPos.line && pos.column === cursorPos.column) {
                return;
            }
        }
        this.multiCursorPos.empty();
        this.multiCursorPos.push(cursorPos);
        this.setNowCursorPos(cursorPos);
        this.setCursorRealPos(cursorPos);
    }
    filterMultiCursorPos() {
        let posMap = {};
        let multiCursorPos = this.multiCursorPos.filter((cursorPos) => {
            let key = cursorPos.line + ',' + cursorPos.column;
            if (posMap[key] || cursorPos.del) {
                return false;
            }
            posMap[key] = true;
            if (this.nowCursorPos && this.nowCursorPos.line === cursorPos.line &&
                this.nowCursorPos.column === this.nowCursorPos.column) {
                this.setNowCursorPos(cursorPos);
            }
            return true;
        });
        this.multiCursorPos.empty();
        this.multiCursorPos.push(...multiCursorPos);
    }
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