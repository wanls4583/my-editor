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
    }
    initProperties(editor, context) {
        Util.defineProperties(this, editor, [
            'renderSelectedBg',
            'cursor',
            'multiCursorPos'
        ]);
        Util.defineProperties(this, context, [
            'htmls',
        ]);
        this.setContextData = (prop, value) => {
            context.setData(prop, value);
        }
    }
    select(direct, wholeWord) {
        this.multiCursorPos.map((cursorPos) => {
            let selectedRange = this.checkCursorSelected(cursorPos);
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
                let _cursorPos = Object.assign({}, cursorPos);
                cursorPos = this.cursor.moveCursor(cursorPos, direct, wholeWord);
                this.addSelectedRange(_cursorPos, cursorPos);
            }
        });
        this.filterSelectedRanges();
        this.renderSelectedBg();
    }
    // 添加选中区域
    addSelectedRange(start, end) {
        let same = Util.comparePos(start, end);
        if (same > 0) {
            let tmp = start;
            start = end;
            end = tmp;
        } else if (!same) {
            return;
        }
        this.selectedRanges.push({
            start: Object.assign({}, start),
            end: Object.assign({}, end)
        });
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
        this.clearRange();
        this.selectedRanges.empty();
        this.selectedRanges.push({
            start: start,
            end: end
        });
    }
    // 检测光标是否在选中区域范围内
    checkCursorSelected(cursorPos) {
        for (let i = 0; i < this.selectedRanges.length; i++) {
            let selectedRange = this.selectedRanges[i];
            if (Util.comparePos(cursorPos, selectedRange.start) >= 0 &&
                Util.comparePos(cursorPos, selectedRange.end) <= 0) {
                return selectedRange;
            }
        }
        return false;
    }
    checkSelectedActive(selectedRange) {
        let cursorPosList = this.cursor.multiCursorPosLineMap.get(selectedRange.start.line) || [];
        let start = selectedRange.start;
        let end = selectedRange.end;
        if (end.line > start.line) {
            for (let i = 0; i < cursorPosList.length; i++) {
                let item = cursorPosList[i];
                if (Util.comparePos(item, selectedRange.start) === 0) {
                    return item;
                }
            }
            cursorPosList = this.cursor.multiCursorPosLineMap.get(selectedRange.end.line) || [];
            for (let i = 0; i < cursorPosList.length; i++) {
                let item = cursorPosList[i];
                if (Util.comparePos(item, selectedRange.end) === 0) {
                    return item;
                }
            }
        } else {
            for (let i = 0; i < cursorPosList.length; i++) {
                let item = cursorPosList[i];
                if (Util.comparePos(item, selectedRange.start) === 0 ||
                    Util.comparePos(item, selectedRange.end) === 0) {
                    return item;
                }
            }
        }
        return false;
    }
    // 清除选中背景
    clearRange(selectedRange) {
        if (selectedRange) {
            if (selectedRange.line && selectedRange.column) {
                selectedRange = this.checkCursorSelected(selectedRange);
            }
            let selectedRanges = this.selectedRanges.filter((item) => {
                if (Util.comparePos(item.start, selectedRange.start) >= 0 &&
                    Util.comparePos(item.end, selectedRange.end) <= 0) {
                    return false;
                }
                return true;
            });
            this.setContextData('selectedRanges', selectedRanges);
        } else {
            this.selectedRanges.empty();
        }
    }
    // 过滤选中区域
    filterSelectedRanges() {
        let direct = this.checkCursorSelected(this.selectedRanges[0].start);
        let delCurposMap = new Map();
        let preRnage = this.selectedRanges[0];
        direct = direct && 'left' || 'right';
        for (let i = 1; i < this.selectedRanges.length; i++) {
            let nextRange = this.selectedRanges[i];
            if (Util.comparePos(preRnage.end, nextRange) >= 0) { //前后选中区域交叉则合并
                preRnage.end = nextRange.end;
                nextRange.del = true;
                if (direct === 'left') {
                    delCurposMap.set(nextRange.start.line + ',' + nextRange.start.column, true);
                } else {
                    delCurposMap.set(nextRange.end.line + ',' + nextRange.end.column, true);
                }
            } else {
                preRnage = nextRange;
            }
        }
        let selectedRanges = this.selectedRanges.slice();
        this.selectedRanges.empty();
        this.selectedRanges.empty().push(...selectedRanges.filter((item) => {
            return !item.del && Util.comparePos(item.start, item.end) < 0;
        }));
        if (delCurposMap.size) {
            let multiCursorPos = this.multiCursorPos.slice();
            this.multiCursorPos.empty().push(...multiCursorPos.filter((item) => {
                if (delCurposMap.has(item.line + ',' + item.column)) {
                    return false;
                }
                return true;
            }));
        }
    }
}