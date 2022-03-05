/*
 * @Author: lisong
 * @Date: 2022-02-14 11:20:31
 * @Description: 
 */
import Util from '@/common/Util';
import Btree from '@/common/Btree';

const regs = {
    word: /[a-zA-Z0-9_]/,
    dWord: Util.fullAngleReg,
    space: /\s/
}
export default class {
    constructor(editor, context) {
        this.initProperties(editor, context);
        this.multiCursorPos = new Btree(Util.comparePos);
        this.multiKeyCode = 'ctrl';
    }
    initProperties(editor, context) {
        Util.defineProperties(this, editor, [
            'nowCursorPos',
            'searcher',
            'selecter',
            'setNowCursorPos',
            'renderCursor',
            'getColumnByWidth',
            'getStrWidth',
        ]);
        Util.defineProperties(this, context, ['htmls']);
    }
    clearCursorPos(cursorPos) {
        if (cursorPos) {
            cursorPos = this.getCursorsByLineColumn(cursorPos.line, cursorPos.column);
            if (cursorPos) {
                cursorPos.del = true;
                this.multiCursorPos.delete(cursorPos);
                if (cursorPos === this.nowCursorPos) {
                    this.setNowCursorPos(null);
                }
            }
            return;
        }
        this.multiCursorPos.forEach((item) => {
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
        this.multiCursorPos.insert(cursorPos);
        this.setNowCursorPos(cursorPos);
        return cursorPos;
    }
    addCursorAbove() {
        this.multiCursorPos.toArray().map((item) => {
            if (item.line > 1) {
                let maxColumn = this.htmls[item.line - 2].text.length;
                let column = item.moveColumn !== undefined ? item.moveColumn : item.column;
                let cursorPos = this.addCursorPos({
                    line: item.line - 1,
                    column: column > maxColumn ? maxColumn : column
                });
                cursorPos.moveColumn = column;
                this.setNowCursorPos(cursorPos);
            }
        });
    }
    addCursorBelow() {
        this.multiCursorPos.toArray().map((item) => {
            if (item.line < this.htmls.length) {
                let maxColumn = this.htmls[item.line].text.length;
                let column = item.moveColumn !== undefined ? item.moveColumn : item.column;
                let cursorPos = this.addCursorPos({
                    line: item.line + 1,
                    column: column > maxColumn ? maxColumn : column
                });
                cursorPos.moveColumn = column;
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
                        column: this.htmls[startLine - 1].text.length
                    });
                    startLine++;
                }
                this.setNowCursorPos(this.addCursorPos({
                    line: endLine,
                    column: this.htmls[endLine - 1].text.length
                }));
            });
            this.searcher.clearSearch();
        }
    }
    // 设置光标
    setCursorPos(cursorPos) {
        cursorPos = {
            line: cursorPos.line,
            column: cursorPos.column
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
        this.multiCursorPos.delete(cursorPos);
        cursorPos.line = line;
        cursorPos.column = column;
        this.multiCursorPos.insert(cursorPos);
        console.log(this.nowCursorPos);
        if (cursorPos === this.nowCursorPos) { //触发滚动
            this.setNowCursorPos(this.nowCursorPos);
        } else {
            this.renderCursor();
        }
        return cursorPos;
    }
    getCursorsByLine(line) {
        let results = [];
        let it = this.multiCursorPos.search(null, (a, b) => {
            return line - b.line;
        });
        let value = null;
        if (it) {
            value = it.prev();
            while (value && value.line === line) {
                results.push(value);
                value = it.prev();
            }
            results.reverse();
            it.reset();
            value = it.next();
            while (value && value.line === line) {
                results.push(value);
                value = it.next();
            }
        }
        return results;
    }
    getCursorsByLineColumn(line, column) {
        let it = this.multiCursorPos.search({
            line: line,
            column: column
        });
        return it && it.next();
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
    switchMultiKeyCode() {
        this.multiKeyCode = this.multiKeyCode === 'ctrl' ? 'alt' : 'ctrl';
    }
}