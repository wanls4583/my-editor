/*
 * @Author: lisong
 * @Date: 2022-02-13 10:41:16
 * @Description: 
 */
import Util from '@/common/Util';

export default class {
    constructor(editor, context) {
        this.initProperties(editor, context);
        this.selectedRanges = [];
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
    select(direct, wholeWord) {
        this.cursor.multiCursorPos.map((cursorPos) => {
            let selectedRange = this.getRangeByCursorPos(cursorPos);
            if (selectedRange) {
                this.cursor.moveCursor(cursorPos, direct, wholeWord);
                if (Util.comparePos(cursorPos, selectedRange.start) < 0 ||
                    Util.comparePos(cursorPos, selectedRange.end) <= 0 && direct === 'right') {
                    selectedRange.start.line = cursorPos.line;
                    selectedRange.start.column = cursorPos.column;
                } else {
                    selectedRange.end.line = cursorPos.line;
                    selectedRange.end.column = cursorPos.column;
                }
            } else {
                let start = Object.assign({}, cursorPos);
                let end = this.cursor.moveCursor(cursorPos, direct, wholeWord);
                selectedRange = this.createRange(start, end);
                if (selectedRange) {
                    this.addSelectedRange({
                        start: start,
                        end: end
                    });
                }
            }
        });
        this.filterSelectedRanges();
    }
    selectAll() {
        let end = {
            line: this.htmls.length,
            column: this.htmls.peek().text.length
        };
        this.setEditorData('forceCursorView', false);
        this.cursor.setCursorPos(end);
        this.setSelectedRange({
            line: 1,
            column: 0
        }, end);
        this.renderSelectedBg();
    }
    selectAllOccurence() {
        this.cursor.clearCursorPos();
        this.activedRanges = this.selectedRanges.slice();
        this.activedRanges.map((item) => {
            this.cursor.addCursorPos(item.end);
            item.active = true;
        });
        this.renderSelectedBg();
    }
    addRangeMap(selectedRange) {
        let startkey = selectedRange.start.line + ',' + selectedRange.start.column;
        let endkey = selectedRange.end.line + ',' + selectedRange.end.column;
        this.selectedRangeMap.set(startkey, selectedRange);
        this.selectedRangeMap.set(endkey, selectedRange);
    }
    deleteRangeMap(selectedRange) {
        let startkey = selectedRange.start.line + ',' + selectedRange.start.column;
        let endkey = selectedRange.end.line + ',' + selectedRange.end.column;
        this.selectedRangeMap.delete(startkey);
        this.selectedRangeMap.delete(endkey);
    }
    addActive(cursorPos) {
        let selectedRange = this.getRangeByCursorPos(cursorPos);
        if (selectedRange && !selectedRange.active) {
            selectedRange.active = true;
            this.activedRanges.push(selectedRange);
        }
        this.renderSelectedBg();
    }
    // 添加选中区域
    addSelectedRange(ranges) {
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
            if (this.getRangeByCursorPos(start)) {
                return;
            }
            let active = this.cursor.getCursorsByLineColumn(start.line, start.column) ||
                this.cursor.getCursorsByLineColumn(end.line, end.column);
            let selectedRange = {
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
            this.selectedRanges.push(selectedRange);
            active && this.activedRanges.push(selectedRange);
            this.addRangeMap(selectedRange);
            results.push(selectedRange);
        });
        this.filterSelectedRanges();
        return ranges instanceof Array ? results : results[0];
    }
    /**
     * 设置选中区域
     * @param {Object} start
     * @param {Object} end
     */
    setSelectedRange(start, end) {
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
        let selectedRange = {
            start: Object.assign({}, start),
            end: Object.assign({}, end),
            active: !!active
        };
        this.clearRange();
        this.selectedRanges.empty();
        this.activedRanges.empty();
        this.selectedRanges.push(selectedRange);
        active && this.activedRanges.push(selectedRange);
        this.addRangeMap(selectedRange);
        this.renderSelectedBg();
        return selectedRange;
    }
    setActive(cursorPos) {
        let selectedRange = this.getRangeByCursorPos(cursorPos);
        this.activedRanges.map((item) => {
            item.active = false;
        });
        this.activedRanges.empty();
        if (selectedRange) {
            selectedRange.active = true;
            this.activedRanges.push(selectedRange);
        }
        this.renderSelectedBg();
    }
    updateRange(target, selectedRange) {
        let start = selectedRange.start;
        let end = selectedRange.end;
        let same = Util.comparePos(start, end);
        if (same > 0) {
            let tmp = start;
            start = end;
            end = tmp;
        } else if (!same) {
            return;
        }
        this.deleteRangeMap(target);
        target.start.line = start.line;
        target.start.column = start.column;
        target.end.line = end.line;
        target.end.column = end.column;
        this.addRangeMap(target);
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
        this.selectedRanges.empty();
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
    // 过滤选中区域
    filterSelectedRanges() {
        if (!this.selectedRanges.length) {
            return;
        }
        let direct = this.getRangeByCursorPos(this.selectedRanges[0].start);
        let delCurpos = [];
        // 先排序
        let selectedRanges = this.selectedRanges.slice().sort((a, b) => {
            if (a.start.line === b.start.line) {
                return a.start.column - b.start.column;
            }
            return a.start.line - b.start.line;
        });
        let preRange = selectedRanges[0];
        direct = direct && 'left' || 'right';
        for (let i = 1; i < selectedRanges.length; i++) {
            let nextRange = selectedRanges[i];
            if (Util.comparePos(preRange.end, nextRange.start) >= 0) { //前后选中区域交叉则合并
                let startKey = nextRange.start.line + ',' + nextRange.start.column;
                let endKey = nextRange.end.line + ',' + nextRange.end.column;
                preRange.end = nextRange.end;
                nextRange.del = true;
                this.selectedRangeMap.delete(startKey);
                this.selectedRangeMap.delete(endKey);
                if (direct === 'left') {
                    delCurpos.push(nextRange.start);
                } else {
                    delCurpos.push(nextRange.end);
                }
            } else {
                preRange = nextRange;
            }
        }
        delCurpos.length && this.cursor.clearCursorPos(delCurpos);
        this.selectedRanges = this.selectedRanges.filter((item) => {
            return !item.del;
        });
        this.activedRanges = this.activedRanges.filter((item) => {
            return !item.del;
        });
        console.log(this.selectedRanges.length)
        this.renderSelectedBg();
    }
}