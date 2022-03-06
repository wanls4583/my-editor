/*
 * @Author: lisong
 * @Date: 2022-02-13 10:41:16
 * @Description: 
 */
import Util from '@/common/Util';
import Btree from '@/common/Btree';

const comparator = function (a, b) {
    let res = Util.comparePos(a.start, b.start);
    if (res === 0) {
        return Util.comparePos(a.end, b.end);
    }
    return res;
}

export default class {
    constructor(editor, context) {
        this.initProperties(editor, context);
        this.ranges = new Btree(comparator);
        this.activedRanges = new Btree(comparator);
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
            if (Util.comparePos(value, item.start) === 0 ||
                Util.comparePos(value, item.end) === 0) {
                return 0;
            }
            return Util.comparePos(value, item.start);
        });
        return result && result.next();
    }
    select(direct, wholeWord) {
        this.cursor.multiCursorPos.forEach((cursorPos) => {
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
        this.ranges.forEach((item) => {
            this.cursor.addCursorPos(item.end);
            if (!item.active) {
                item.active = true;
                this.activedRanges.insert(item);
            }
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
            this.filterRange(range);
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
        this.filterRange(target);
        this.renderSelectedBg();
    }
    filterRange(range) {
        let it = this.ranges.search(range);
        let dels = [];
        let value = it.prev();
        if (value && Util.comparePos(value.end, range.start) > 0) { //删除前件
            dels.push(value);
        }
        it.reset();
        it.next();
        while (value = it.next()) {
            if (Util.comparePos(range.end, value.start) > 0) {
                dels.push(value);
            } else {
                break;
            }
        }
        dels.map((item) => {
            this.ranges.delete(item);
            this.activedRanges.delete(item);
            this.cursor.clearCursorPos(item.start);
            this.cursor.clearCursorPos(item.end);
        });
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
    clearInactive() {
        if (!this.activedRanges.size) {
            this.clearRange();
        } else {
            this.ranges.toArray().map((item) => {
                if (!item.active) {
                    this.ranges.delete(item);
                }
            });
            this.renderSelectedBg();
        }
    }
}