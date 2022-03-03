/*
 * @Author: lisong
 * @Date: 2022-02-13 10:41:16
 * @Description: 
 */
import Util from '@/common/Util';

export default class {
    constructor(editor, context) {
        this.initProperties(editor, context);
        this.ranges = [];
        this.activedRanges = [];
        this.selectedRangeMap = new Map();
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
        let key = cursorPos.line + ',' + cursorPos.column;
        return this.selectedRangeMap.get(key) || false;
    }
    getRangeIndex(range, ranges) {
        ranges = ranges || this.ranges;
        let left = 0;
        let right = ranges.length - 1;
        while (left <= right) {
            let mid = Math.floor((left + right) / 2);
            let res = Util.comparePos(range.start, ranges[mid].start);
            if (res === 0) {
                return Util.comparePos(range.end, ranges[mid].end) == 0 ? mid : -1;
            } else if (res > 0) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        return -1;
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
        this.activedRanges.map((item) => {
            this.cursor.addCursorPos(item.end);
            item.active = true;
        });
        this.renderSelectedBg();
    }
    addRangeMap(range) {
        let startkey = range.start.line + ',' + range.start.column;
        let endkey = range.end.line + ',' + range.end.column;
        this.selectedRangeMap.set(startkey, range);
        this.selectedRangeMap.set(endkey, range);
    }
    deleteRangeMap(range) {
        let startkey = range.start.line + ',' + range.start.column;
        let endkey = range.end.line + ',' + range.end.column;
        this.selectedRangeMap.delete(startkey);
        this.selectedRangeMap.delete(endkey);
    }
    addActive(cursorPos) {
        let range = this.getRangeByCursorPos(cursorPos);
        if (range && !range.active) {
            range.active = true;
            this.activedRanges.push(range);
        }
        this.renderSelectedBg();
    }
    // 添加选中区域
    addRange(ranges) {
        let that = this;
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
            _orderInsert(range, this.ranges);
            active && _orderInsert(range, this.activedRanges);
            this.addRangeMap(range);
            results.push(range);
        });
        this.renderSelectedBg();
        return ranges instanceof Array ? results : results[0];

        function _orderInsert(item, ranges) {
            let left = 0;
            let right = ranges.length - 1;
            let delLength = 0;
            let delCursors = [];
            if (right < 0) {
                ranges.push(item);
                return;
            }
            while (left < right) {
                let mid = Math.floor((left + right) / 2);
                if (Util.comparePos(item.start, ranges[mid].start) > 0) {
                    left = mid + 1;
                } else {
                    right = mid;
                }
            }
            if (Util.comparePos(item.start, ranges[right].start) > 0) {
                right++;
            }
            let index = right;
            // 删除后面可能交叉的区域
            while (ranges[index] && Util.comparePos(item.end, ranges[index].start) > 0) {
                delCursors.push(ranges[index].start);
                delCursors.push(ranges[index].end);
                delLength++;
                index++;
            }
            // 删除前面可能交叉的一个区域
            if (ranges[right - 1] && Util.comparePos(item.start, ranges[right - 1].end) < 0) {
                delCursors.push(ranges[right - 1].start);
                delCursors.push(ranges[right - 1].end);
                delLength++;
                right--;
            }
            ranges.splice(right, delLength, item);
            delCursors.length && that.cursor.clearCursorPos(delCursors);
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
        this.ranges.push(range);
        active && this.activedRanges.push(range);
        this.addRangeMap(range);
        this.renderSelectedBg();
        return range;
    }
    setActive(cursorPos) {
        let range = this.getRangeByCursorPos(cursorPos);
        this.activedRanges.map((item) => {
            item.active = false;
        });
        this.activedRanges.empty();
        if (range) {
            range.active = true;
            this.activedRanges.push(range);
        }
        this.renderSelectedBg();
    }
    updateRange(target, range) {
        let start = range.start;
        let end = range.end;
        let same = Util.comparePos(start, end);
        let index1 = this.getRangeIndex(target);
        let index2 = this.getRangeIndex(target, this.activedRanges);
        if (same > 0) {
            let tmp = start;
            start = end;
            end = tmp;
        }
        this.deleteRangeMap(target);
        index1 > -1 && this.ranges.splice(index1, 1);
        index2 > -1 && this.activedRanges.splice(index1, 1);
        target.start = start;
        target.end = end;
        if (Util.comparePos(start, end) !== 0) {
            target = this.addRange(target);
            this.addRangeMap(target);
            this.renderSelectedBg();
            return target;
        }
        return false;
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
        this.selectedRangeMap.clear();
        this.renderSelectedBg();
    }
    clearActive() {
        this.activedRanges.map((item) => {
            item.active = false;
        });
        this.activedRanges.empty();
        this.renderSelectedBg();
    }
}