/*
 * @Author: lisong
 * @Date: 2022-02-13 10:41:16
 * @Description: 
 */
import Util from '@/common/Util';
import Btree from '@/common/Btree';

export default class {
    constructor(editor, context) {
        this.initProperties(editor, context);
        this.ranges = new Btree(_comparator);
        this.activedRanges = new Btree(_comparator);

        function _comparator(a, b) {
            if (a.start.line === b.start.line) {
                return a.start.column - b.start.column;
            }
            return a.start.line - b.start.line;
        }
    }
    initProperties(editor, context) {
        Util.defineProperties(this, editor, [
            'renderSelectedBg',
            'cursor',
        ]);
        Util.defineProperties(this, context, [
            'htmls',
        ]);
        this.setContextData = (prop, value) => {
            context.setData(prop, value);
        }
        this.setEditorData = (prop, value) => {
            editor.setData(prop, value);
        }
    }
    // 检测光标是否在选中区域范围内
    getRangeByCursorPos(cursorPos) {
        let result = this.ranges.search(cursorPos, (value, item) => {
            if (value.line == item.start.line && value.column == item.start.column ||
                value.line == item.end.line && value.column == item.end.column) {
                return 0;
            }
            if (value.line === item.end.line) {
                return value.column - item.end.column;
            }
            return value.line - item.end.line;
        });
        return result && result.next();
    }
    select(direct, wholeWord) {
        this.cursor.multiCursorPos.map((cursorPos) => {
            let range = this.getRangeByCursorPos(cursorPos);
            if (range) {
                let start = range.start;
                let end = range.end;
                this.cursor.moveCursor(cursorPos, direct, wholeWord);
                if (direct === 'left') {
                    if (Util.comparePos(cursorPos, range.start) < 0) {
                        start = cursorPos;
                    } else {
                        end = cursorPos;
                    }
                } else {
                    if (Util.comparePos(cursorPos, range.end) > 0) {
                        end = cursorPos;
                    } else {
                        start = cursorPos;
                    }
                }
                this.updateRange(range, {
                    start: start,
                    end: end
                });
            } else {
                let start = Object.assign({}, cursorPos);
                let end = this.cursor.moveCursor(cursorPos, direct, wholeWord);
                range = this.createRange(start, end);
                if (range) {
                    this.addRange({
                        start: start,
                        end: end
                    });
                }
            }
        });
        this.renderSelectedBg();
    }
    selectAll() {
        let end = {
            line: this.htmls.length,
            column: this.htmls.peek().text.length
        };
        this.setEditorData('forceCursorView', false);
        this.cursor.setCursorPos(end);
        this.setRange({
            line: 1,
            column: 0
        }, end);
        this.renderSelectedBg();
    }
    selectAllOccurence() {
        this.cursor.clearCursorPos();
        this.activedRanges = this.ranges.slice();
        this.activedRanges.forEach((item) => {
            this.cursor.addCursorPos(item.end);
            item.active = true;
        });
        this.renderSelectedBg();
    }
    addActive(cursorPos) {
        let range = this.getRangeByCursorPos(cursorPos);
        if (range && !range.active) {
            range.active = true;
            this.activedRanges.insert(range);
        }
        this.renderSelectedBg();
    }
    // 添加选中区域
    addRange(ranges) {
        let results = [];
        let list = ranges instanceof Array ? ranges : [ranges];
        list.map((range) => {
            let start = range.start;
            let end = range.end;
            let same = Util.comparePos(start, end);
            if (same > 0) {
                let tmp = start;
                start = end;
                end = tmp;
            } else if (!same) {
                return;
            }
            let active = this.cursor.getCursorsByLineColumn(start.line, start.column) ||
                this.cursor.getCursorsByLineColumn(end.line, end.column);
            range = {
                start: {
                    line: start.line,
                    column: start.column
                },
                end: {
                    line: end.line,
                    column: end.column
                },
                active: !!active
            };
            this.ranges.insert(range);
            active && this.activedRanges.insert(range);;
            results.push(range);
        });
        this.renderSelectedBg();
        return ranges instanceof Array ? results : results[0];
    }
    /**
     * 设置选中区域
     * @param {Object} start
     * @param {Object} end
     */
    setRange(start, end) {
        let same = Util.comparePos(start, end);
        if (same > 0) {
            let tmp = start;
            start = end;
            end = tmp;
        } else if (!same) {
            return;
        }
        let active = this.cursor.getCursorsByLineColumn(start.line, start.column) ||
            this.cursor.getCursorsByLineColumn(end.line, end.column);
        let range = {
            start: Object.assign({}, start),
            end: Object.assign({}, end),
            active: !!active
        };
        this.clearRange();
        this.ranges.empty();
        this.activedRanges.empty();
        this.ranges.insert(range);
        active && this.activedRanges.insert(range);
        this.renderSelectedBg();
        return range;
    }
    setActive(cursorPos) {
        let range = this.getRangeByCursorPos(cursorPos);
        this.activedRanges.forEach((item) => {
            item.active = false;
        });
        this.activedRanges.empty();
        if (range) {
            range.active = true;
            this.activedRanges.insert(range);
        }
        this.renderSelectedBg();
    }
    updateRange(target, range) {
        let start = range.start;
        let end = range.end;
        let same = Util.comparePos(start, end);
        if (same > 0) {
            let tmp = start;
            start = end;
            end = tmp;
        } else if (!same) {
            return false;
        }
        this.ranges.delete(target);
        target.start.line = start.line;
        target.start.column = start.column;
        target.end.line = end.line;
        target.end.column = end.column;
        this.ranges.insert(target);
        this.renderSelectedBg();
    }
    createRange(start, end) {
        let same = Util.comparePos(start, end);
        if (same > 0) {
            let tmp = start;
            start = end;
            end = tmp;
        }
        if (same === 0) {
            return null;
        }
        return {
            start: start,
            end: end
        }
    }
    // 清除选中背景
    clearRange() {
        this.ranges.empty();
        this.activedRanges.empty();
        this.renderSelectedBg();
    }
    clearActive() {
        this.activedRanges.forEach((item) => {
            item.active = false;
        });
        this.activedRanges.empty();
        this.renderSelectedBg();
    }
}