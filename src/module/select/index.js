/*
 * @Author: lisong
 * @Date: 2022-02-13 10:41:16
 * @Description:
 */
import Util from '@/common/util';
import Btree from '@/common/btree';

const comparator = function (a, b) {
    let res = Util.comparePos(a.start, b.start);
    if (res === 0) {
        return Util.comparePos(a.end, b.end);
    }
    return res;
};

export default class {
    constructor(editor, context) {
        this.editor = editor;
        this.context = context;
        this.ranges = new Btree(comparator);
        this.activedRanges = new Btree(comparator);
    }
    destroy() {
        this.editor = null;
        this.context = null;
        this.ranges.empty();
        this.activedRanges.empty();
    }
    getRange(range) {
        let it = this.ranges.search(range);
        return it && it.next();
    }
    getRangeByLine(line) {
        let results = [];
        let it = this.ranges.search(
            { line: line, column: 0 },
            (value, item) => {
                return Util.comparePos(value, item.end);
            },
            true
        );
        if (it) {
            let value = it.next();
            while (value) {
                if (value.start.line === line || value.end.line === line) {
                    results.push(value);
                } else if (value.start.line > line) {
                    break;
                }
                value = it.next();
            }
        }
        return results;
    }
    // 检测光标是否在选中区域范围的边界
    getRangeByCursorPos(cursorPos) {
        let result = this.ranges.search(cursorPos, (value, item) => {
            if (Util.comparePos(value, item.start) === 0 || Util.comparePos(value, item.end) === 0) {
                return 0;
            }
            return Util.comparePos(value, item.start);
        });
        return result && result.next();
    }
    // 检查光标是否在选中范围内
    getRangeWithCursorPos(cursorPos) {
        let it = this.ranges.search(
            cursorPos,
            (value, item) => {
                return Util.comparePos(value, item.start);
            },
            true
        );
        if (it) {
            let value = it.prev();
            if (value && Util.comparePos(value.end, cursorPos) >= 0) {
                return value;
            }
            it.reset();
            value = it.next();
            if (value && Util.comparePos(value.start, cursorPos) == 0) {
                return value;
            }
        }
        return false;
    }
    // 检查光标是否在选中范围内
    getActiveRangeWithCursorPos(cursorPos) {
        let it = this.activedRanges.search(
            cursorPos,
            (value, item) => {
                return Util.comparePos(value, item.start);
            },
            true
        );
        if (it) {
            let value = it.prev();
            if (value && Util.comparePos(value.end, cursorPos) >= 0) {
                return value;
            }
            it.reset();
            value = it.next();
            if (value && Util.comparePos(value.start, cursorPos) == 0) {
                return value;
            }
        }
        return false;
    }
    select(direct, wholeWord) {
        this.editor.cursor.multiCursorPos.forEach((cursorPos) => {
            let range = this.getRangeByCursorPos(cursorPos);
            if (range) {
                let start = range.start;
                let end = range.end;
                this.editor.cursor.moveCursor(cursorPos, direct, wholeWord);
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
                    end: end,
                });
            } else {
                let start = Object.assign({}, cursorPos);
                let end = this.editor.cursor.moveCursor(cursorPos, direct, wholeWord);
                range = this.createRange(start, end);
                if (range) {
                    this.addRange({
                        start: start,
                        end: end,
                    });
                }
            }
        });
        this.editor.renderSelectedBgAsync();
    }
    selectAll() {
        let end = {
            line: this.context.htmls.length,
            column: this.context.htmls.peek().text.length,
        };
        this.editor.setData('forceCursorView', false);
        this.editor.cursor.setCursorPos(end);
        this.setRange(
            {
                line: 1,
                column: 0,
            },
            end
        );
        this.editor.renderSelectedBgAsync();
    }
    selectAllOccurence() {
        this.editor.cursor.clearCursorPos();
        this.ranges.forEach((item) => {
            this.editor.cursor.addCursorPos(item.end);
            if (!item.active) {
                item.active = true;
                this.activedRanges.insert(item);
            }
        });
        this.editor.renderSelectedBgAsync();
    }
    addActive(cursorPos) {
        let range = this.getRangeByCursorPos(cursorPos);
        if (range && !range.active) {
            range.active = true;
            this.activedRanges.insert(range);
        }
        this.editor.renderSelectedBgAsync();
    }
    // 添加选中区域
    addRange(ranges) {
        let results = [];
        let list = ranges instanceof Array ? ranges : [ranges];
        list.forEach((range) => {
            let start = range.start;
            let end = range.end;
            let same = Util.comparePos(start, end);
            let active = false;
            if (same > 0) {
                let tmp = start;
                start = end;
                end = tmp;
            } else if (!same) {
                return;
            }
            if (range.active !== undefined) {
                active = range.active
            } else {
                active = this.editor.cursor.getCursorsByLineColumn(start.line, start.column)
                    || this.editor.cursor.getCursorsByLineColumn(end.line, end.column);
            }
            range = {
                start: {
                    line: start.line,
                    column: start.column,
                },
                end: {
                    line: end.line,
                    column: end.column,
                },
                active: !!active,
            };
            let _range = this.getRange(range);
            if (_range) {
                if (!_range.active) {
                    _range.active = active;
                    this.activedRanges.insert(_range);
                }
                results.push(_range);
            } else {
                this.ranges.insert(range);
                active && this.activedRanges.insert(range);
                results.push(range);
                this.filterRange(range);
            }
        });
        this.editor.renderSelectedBgAsync();
        return ranges instanceof Array ? results : results[0];
    }
    removeRange(range) {
        range = this.ranges.delete(range);
        if (range) {
            if (range.active) {
                this.activedRanges.delete(range);
            }
            this.editor.cursor.removeCursor(range.start);
            this.editor.cursor.removeCursor(range.end);
            this.editor.renderSelectedBgAsync();
        }
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
        let active = this.editor.cursor.getCursorsByLineColumn(start.line, start.column) || this.editor.cursor.getCursorsByLineColumn(end.line, end.column);
        let range = {
            start: Object.assign({}, start),
            end: Object.assign({}, end),
            active: !!active,
        };
        this.clearRange();
        this.ranges.insert(range);
        active && this.activedRanges.insert(range);
        this.editor.renderSelectedBgAsync();
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
        this.editor.renderSelectedBgAsync();
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
        this.activedRanges.delete(target);
        target.start.line = start.line;
        target.start.column = start.column;
        target.end.line = end.line;
        target.end.column = end.column;
        //清除渲染缓存
        target.start.startRenderObj = null;
        target.end.endRenderObj = null;
        this.ranges.insert(target);
        target.active && this.activedRanges.insert(target);
        this.filterRange(target);
        this.editor.renderSelectedBgAsync();
    }
    filterRange(range) {
        let it = this.ranges.search(range);
        let dels = [];
        let value = it.prev();
        if (value && Util.comparePos(value.end, range.start) > 0) {
            //删除前件
            dels.push(value);
        }
        it.reset();
        it.next();
        value = it.next();
        if (value && Util.comparePos(range.end, value.start) > 0) {
            dels.push(value);
        }
        dels.forEach((item) => {
            this.ranges.delete(item);
            this.activedRanges.delete(item);
            this.editor.cursor.removeCursor(item.start);
            this.editor.cursor.removeCursor(item.end);
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
            end: end,
        };
    }
    // 清除选中背景
    clearRange() {
        this.ranges.empty();
        this.activedRanges.empty();
        this.editor.renderSelectedBgAsync();
    }
    clearActive() {
        this.activedRanges.forEach((item) => {
            item.active = false;
        });
        this.activedRanges.empty();
        this.editor.renderSelectedBgAsync();
    }
    clearInactiveRange() {
        if (!this.activedRanges.size) {
            this.clearRange();
        } else {
            this.ranges.forEach((item) => {
                if (!item.active) {
                    this.ranges.delete(item);
                }
            });
            this.editor.renderSelectedBgAsync();
        }
    }
    clone(range, properties) {
        properties = properties || [];
        let result = {
            start: Object.assign({}, range.start),
            end: Object.assign({}, range.end),
        };
        properties.forEach((key) => {
            result[key] = range[key];
        });
        return result;
    }
}
