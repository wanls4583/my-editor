/*
 * @Author: lisong
 * @Date: 2022-02-14 11:20:31
 * @Description:
 */
import Util from '@/common/util';
import Btree from '@/common/btree';

const regs = {
    space: /\s/,
};
export default class {
    constructor(editor, context) {
        this.editor = editor;
        this.context = context;
        this.multiCursorPos = new Btree(Util.comparePos);
        this.multiKeyCode = 'ctrl';
        this.wordPattern = Util.getWordPattern(this.editor.language);
        this.rightWrodPattern = new RegExp(`^(${this.wordPattern.source})`);
        this.leftWrodPattern = new RegExp(`(${this.wordPattern.source})$`);
    }
    destroy() {
        this.editor = null;
        this.context = null;
        this.multiCursorPos.empty();
    }
    // 添加光标
    addCursorPos(cursorPos) {
        let pos = this.getCursorsByLineColumn(cursorPos.line, cursorPos.column);
        if (pos) {
            this.editor.setNowCursorPos(pos);
            return pos;
        }
        cursorPos = {
            line: cursorPos.line,
            column: cursorPos.column,
        };
        this.multiCursorPos.insert(cursorPos);
        this.editor.setNowCursorPos(cursorPos);
        return cursorPos;
    }
    addCursorAbove() {
        this.multiCursorPos.forEach((item) => {
            if (item.line > 1) {
                let width = item.moveWidth || this.editor.getStrWidth(this.context.htmls[item.line - 1].text, 0, item.column);
                let column = this.editor.getColumnByWidth(this.context.htmls[item.line - 2].text, width);
                let cursorPos = this.addCursorPos({
                    line: item.line - 1,
                    column: column,
                });
                cursorPos.moveWidth = width;
                this.editor.setNowCursorPos(cursorPos);
            }
        });
    }
    addCursorBelow() {
        this.multiCursorPos.forEach((item) => {
            if (item.line < this.context.htmls.length) {
                let width = item.moveWidth || this.editor.getStrWidth(this.context.htmls[item.line - 1].text, 0, item.column);
                let column = this.editor.getColumnByWidth(this.context.htmls[item.line].text, width);
                let cursorPos = this.addCursorPos({
                    line: item.line + 1,
                    column: column,
                });
                cursorPos.moveWidth = width;
                this.editor.setNowCursorPos(cursorPos);
            }
        });
    }
    addCursorLineEnds() {
        if (this.editor.selecter.activedRanges.size) {
            this.clearCursorPos();
            this.editor.selecter.activedRanges.forEach((item) => {
                let startLine = item.start.line;
                let endLine = item.end.line;
                while (startLine < endLine) {
                    this.addCursorPos({
                        line: startLine,
                        column: this.context.htmls[startLine - 1].text.length,
                    });
                    startLine++;
                }
                this.editor.setNowCursorPos(
                    this.addCursorPos({
                        line: endLine,
                        column: this.context.htmls[endLine - 1].text.length,
                    })
                );
            });
            this.editor.searcher.clearSearch();
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
        this.editor.setNowCursorPos(cursorPos);
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
        if (cursorPos === this.editor.nowCursorPos) {
            //触发滚动
            this.editor.setNowCursorPos(this.editor.nowCursorPos);
        } else {
            this.editor.renderCursor();
        }
        return cursorPos;
    }
    removeCursor(cursorPos) {
        cursorPos = this.getCursorsByLineColumn(cursorPos.line, cursorPos.column);
        if (cursorPos) {
            cursorPos.del = true;
            this.multiCursorPos.delete(cursorPos);
            if (cursorPos === this.editor.nowCursorPos) {
                this.editor.setNowCursorPos(null);
            }
            this.editor.renderCursor();
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
            this.editor.renderCursor();
        }
    }
    clearCursorPos() {
        this.multiCursorPos.forEach((item) => {
            item.del = true;
        });
        this.multiCursorPos.empty();
        this.editor.setNowCursorPos(null);
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
    moveCursor(cursorPos, direct, wholeWord, stopUpdate) {
        let text = this.context.htmls[cursorPos.line - 1].text;
        let line = cursorPos.line;
        let column = cursorPos.column;
        // 去除上下移动光标的初始宽度记录
        if (direct !== 'up' && direct !== 'down') {
            cursorPos.moveWidth = 0;
        }
        if (direct === 'home') {
            column = 0;
        } else if (direct === 'end') {
            column = this.context.htmls[line - 1].text.length;
        } else if (direct === 'up') {
            if (line > 1) {
                let width = cursorPos.moveWidth || this.editor.getStrWidth(text, 0, column);
                cursorPos.moveWidth = width;
                line--;
                text = this.context.htmls[line - 1].text;
                column = this.editor.getColumnByWidth(text, width);
            }
        } else if (direct === 'down') {
            if (line < this.context.htmls.length) {
                let width = cursorPos.moveWidth || this.editor.getStrWidth(text, 0, column);
                cursorPos.moveWidth = width;
                line++;
                text = this.context.htmls[line - 1].text;
                column = this.editor.getColumnByWidth(text, width);
            }
        } else if (direct === 'left') {
            while (column === 0 && line > 1) {
                line--;
                text = this.context.htmls[line - 1].text;
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
            while (column === text.length && line < this.context.htmls.length) {
                line++;
                column = 0;
                text = this.context.htmls[line - 1].text;
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
        !stopUpdate && this.updateCursorPos(cursorPos, line, column);

        return {
            line: line,
            column: column,
        };
    }
    switchMultiKeyCode() {
        this.multiKeyCode = this.multiKeyCode === 'ctrl' ? 'alt' : 'ctrl';
    }
}
