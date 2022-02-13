/*
 * @Author: lisong
 * @Date: 2022-02-13 10:41:16
 * @Description: 
 */
import Util from '@/common/Util';

export default class {
    constructor(editor, context) {
        this.initProperties(editor, context);
    }
    initProperties(editor, context) {
        Util.defineProperties(this, editor, [
            'selectedRanges',
            'renderSelectedBg',
            'moveCursor',
            'multiCursorPos'
        ]);
        Util.defineProperties(this, context, ['htmls']);
    }
    select(direct, wholeWord) {
        this.multiCursorPos.map((cursorPos) => {
            let selectedRange = this.checkCursorSelected(cursorPos);
            if (selectedRange) {
                this.moveCursor(cursorPos, direct, wholeWord);
                if (Util.comparePos(cursorPos, selectedRange.start) < 0 ||
                    Util.comparePos(cursorPos, selectedRange.end) < 0 && direct === 'right') {
                    selectedRange.start.line = cursorPos.line;
                    selectedRange.start.column = cursorPos.column;
                } else {
                    selectedRange.end.line = cursorPos.line;
                    selectedRange.end.column = cursorPos.column;
                }
            } else {
                let _cursorPos = this.moveCursor(cursorPos, direct, wholeWord, true);
                if (Util.comparePos(_cursorPos, cursorPos) < 0) {
                    this.addSelectedRange(_cursorPos, cursorPos);
                } else {
                    this.addSelectedRange(cursorPos, _cursorPos);
                }
                this.moveCursor(cursorPos, direct, wholeWord);
            }
        });
        this.filterSelectedRanges();
        this.renderSelectedBg();
    }
    // 添加选中区域
    addSelectedRange(start, end) {
        let active = false;
        let same = Util.comparePos(start, end);
        if (same > 0) {
            let tmp = start;
            start = end;
            end = tmp;
        } else if (!same) {
            return;
        }
        if (this.selectedRanges.filter((item) => {
                if (Util.comparePos(start, item.start) == 0 && Util.comparePos(end, item.end) == 0) {
                    return true;
                }
                return false;
            }).length > 0) {
            return;
        }
        active = this.checkSelectedCursor({
            start: start,
            end: end
        });
        this.selectedRanges.push({
            active: active,
            start: Object.assign({}, start),
            end: Object.assign({}, end)
        });
        this.filterSelectedRanges();
    }
    checkActive(cursorPos) {
        let selectedRange = this.checkCursorSelected(cursorPos);
        if (selectedRange) {
            selectedRange.active = true;
        }
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
    // 检测区域范围是否包含光标
    checkSelectedCursor(rangePos) {
        if (rangePos.start.line !== rangePos.end.line) {
            return true;
        }
        for (let i = 0; i < this.multiCursorPos.length; i++) {
            let cursorPos = this.multiCursorPos[i];
            if (Util.comparePos(cursorPos, rangePos.start) >= 0 &&
                Util.comparePos(cursorPos, rangePos.end) <= 0) {
                return cursorPos;
            }
        }
        return false;
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