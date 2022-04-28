/*
 * @Author: lisong
 * @Date: 2022-02-14 11:20:31
 * @Description:
 */
import Util from '@/common/util';
import Btree from '@/common/btree';

const regs = {
    word: /[a-zA-Z0-9_]/,
    dWord: Util.fullAngleReg,
    space: /\s/,
};
export default class {
    constructor(editor, context) {
        this.initProperties(editor, context);
        this.multiCursorPos = new Btree(Util.comparePos);
        this.multiKeyCode = 'ctrl';
        this.wordPattern = Util.getWordPattern(this.language);
        this.rightWrodPattern = new RegExp(`^(${this.wordPattern.source})`);
        this.leftWrodPattern = new RegExp(`(${this.wordPattern.source})$`);
    }
    initProperties(editor, context) {
        Util.defineProperties(this, editor, ['language', 'nowCursorPos', 'searcher', 'selecter', 'setNowCursorPos', 'renderCursor', 'getColumnByWidth', 'getStrWidth']);
        Util.defineProperties(this, context, ['htmls']);
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
            column: cursorPos.column,
        };
        this.multiCursorPos.insert(cursorPos);
        this.setNowCursorPos(cursorPos);
        return cursorPos;
    }
    addCursorAbove() {
        this.multiCursorPos.forEach((item) => {
            if (item.line > 1) {
                let width = item.moveWidth || this.getStrWidth(this.htmls[item.line - 1].text, 0, item.column);
                let column = this.getColumnByWidth(this.htmls[item.line - 2].text, width);
                let cursorPos = this.addCursorPos({
                    line: item.line - 1,
                    column: column,
                });
                cursorPos.moveWidth = width;
                this.setNowCursorPos(cursorPos);
            }
        });
    }
    addCursorBelow() {
        this.multiCursorPos.forEach((item) => {
            if (item.line < this.htmls.length) {
                let width = item.moveWidth || this.getStrWidth(this.htmls[item.line - 1].text, 0, item.column);
                let column = this.getColumnByWidth(this.htmls[item.line].text, width);
                let cursorPos = this.addCursorPos({
                    line: item.line + 1,
                    column: column,
                });
                cursorPos.moveWidth = width;
                this.setNowCursorPos(cursorPos);
            }
        });
    }
    addCursorLineEnds() {
        if (this.selecter.activedRanges.size) {
            this.clearCursorPos();
            this.selecter.activedRanges.forEach((item) => {
                let startLine = item.start.line;
                let endLine = item.end.line;
                while (startLine < endLine) {
                    this.addCursorPos({
                        line: startLine,
                        column: this.htmls[startLine - 1].text.length,
                    });
                    startLine++;
                }
                this.setNowCursorPos(
                    this.addCursorPos({
                        line: endLine,
                        column: this.htmls[endLine - 1].text.length,
                    })
                );
            });
            this.searcher.clearSearch();
        }
    }
    // 设置光标
    setCursorPos(cursorPos) {
        cursorPos = {
            line: cursorPos.line,
            column: cursorPos.column,
        };
        if (this.multiCursorPos.size == 1) {
            let pos = this.multiCursorPos.get(0);
            if (Util.comparePos(pos, cursorPos) === 0) {
                return pos;
            }
        }
        this.multiCursorPos.empty();
        this.multiCursorPos.insert(cursorPos);
        this.setNowCursorPos(cursorPos);
        return cursorPos;
    }
    updateCursorPos(cursorPos, line, column) {
        let pos = this.getCursorsByLineColumn(cursorPos.line, cursorPos.column);
        if (pos === cursorPos) {
            this.multiCursorPos.delete(cursorPos);
        }
        cursorPos.line = line;
        cursorPos.column = column;
        this.multiCursorPos.insert(cursorPos);
        if (cursorPos === this.nowCursorPos) {
            //触发滚动
            this.setNowCursorPos(this.nowCursorPos);
        } else {
            this.renderCursor();
        }
        return cursorPos;
    }
    removeCursor(cursorPos) {
        cursorPos = this.getCursorsByLineColumn(cursorPos.line, cursorPos.column);
        if (cursorPos) {
            cursorPos.del = true;
            this.multiCursorPos.delete(cursorPos);
            if (cursorPos === this.nowCursorPos) {
                this.setNowCursorPos(null);
            }
            this.renderCursor();
        }
    }
    removeCursorInRange(range) {
        let it = this.multiCursorPos.search(range.start, null, true);
        if (it) {
            let value = null;
            let toDels = [];
            while ((value = it.next())) {
                let res = Util.comparePos(value, range.end);
                if (res >= 0) {
                    break;
                }
                if (Util.comparePos(value, range.start) > 0) {
                    toDels.push(value);
                }
            }
            toDels.forEach((item) => {
                item.del = true;
                this.multiCursorPos.delete(item);
            });
            this.renderCursor();
        }
    }
    clearCursorPos() {
        this.multiCursorPos.forEach((item) => {
            item.del = true;
        });
        this.multiCursorPos.empty();
        this.setNowCursorPos(null);
    }
    getCursorsByLine(line) {
        let results = [];
        let value = null;
        let it = this.multiCursorPos.search(
            {
                line: line,
                column: 0,
            },
            null,
            true
        );
        if (it) {
            while ((value = it.next())) {
                if (value.line === line) {
                    results.push(value);
                } else if (value.line > line) {
                    break;
                }
            }
        }
        return results;
    }
    getCursorsByLineColumn(line, column) {
        let it = this.multiCursorPos.search({
            line: line,
            column: column,
        });
        return it && it.next();
    }
    // 移动光标
    moveCursor(cursorPos, direct, wholeWord) {
        let text = this.htmls[cursorPos.line - 1].text;
        let line = cursorPos.line;
        let column = cursorPos.column;
        // 去除上下移动光标的初始宽度记录
        if(direct !== 'up' && direct !== 'down') {
            cursorPos.moveWidth = 0;
        }
        if (direct === 'home') {
            column = 0;
        } else if (direct === 'end') {
            column = this.htmls[line - 1].text.length;
        } else if (direct === 'up') {
            if (line > 1) {
                let width = cursorPos.moveWidth || this.getStrWidth(text, 0, column);
                cursorPos.moveWidth = width;
                line--;
                text = this.htmls[line - 1].text;
                column = this.getColumnByWidth(text, width);
            }
        } else if (direct === 'down') {
            if (line < this.htmls.length) {
                let width = cursorPos.moveWidth || this.getStrWidth(text, 0, column);
                cursorPos.moveWidth = width;
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
            if (column > 0) {
                if (wholeWord) {
                    //过滤开始的空格
                    while (column && text[column - 1].match(regs.space)) {
                        column--;
                    }
                    if (column > 0) {
                        let res = null;
                        let _column = column;
                        column--;
                        text = text.slice(0, _column);
                        res = this.leftWrodPattern.exec(text);
                        if (res) {
                            column = res.index;
                        }
                    }
                } else if (cursorPos.line === line) {
                    column--;
                }
            }
        } else {
            while (column === text.length && line < this.htmls.length) {
                line++;
                column = 0;
                text = this.htmls[line - 1].text;
            }
            if (column < text.length) {
                if (wholeWord) {
                    //过滤开始的空格
                    while (column < text.length && text[column].match(regs.space)) {
                        column++;
                    }
                    if (column < text.length) {
                        text = text.slice(column);
                        text = this.rightWrodPattern.exec(text);
                        if (text && text.index == 0) {
                            column += text[0].length;
                        } else {
                            column++;
                        }
                    }
                } else if (cursorPos.line === line) {
                    column++;
                }
            }
        }
        this.updateCursorPos(cursorPos, line, column);

        return {
            line: line,
            column: column,
        };
    }
    switchMultiKeyCode() {
        this.multiKeyCode = this.multiKeyCode === 'ctrl' ? 'alt' : 'ctrl';
    }
}
