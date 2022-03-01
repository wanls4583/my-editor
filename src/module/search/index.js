/*
 * @Author: lisong
 * @Date: 2022-02-12 09:52:06
 * @Description: 
 */
import Util from '@/common/Util';

export default class {
    constructor(editor, context, selecter) {
        this.selecter = selecter;
        this.initProperties(editor, context);
    }
    initProperties(editor, context) {
        Util.defineProperties(this, editor, [
            'nowCursorPos',
            'cursorFocus',
            'fSearcher',
            'cursor',
            '$nextTick',
            '$refs',
        ]);
        Util.defineProperties(this, context, ['htmls', 'getToSearchObj']);
    }
    search(searchObj, direct) {
        let resultObj = null;
        let now = 0;
        let count = 0;
        let hasCache = this.hasCache();
        if (hasCache) {
            resultObj = direct === 'up' ? this.prev() : this.next();
        } else {
            searchObj = searchObj || this.getToSearchObj();
            if (!searchObj.text) {
                return {
                    now: 0,
                    count: 0
                };
            }
            resultObj = this._search(searchObj);
        }
        if (resultObj && resultObj.result) {
            if (this.fSearcher === this) {
                this.selecter.setActive(resultObj.result.end);
            } else {
                this.selecter.addActive(resultObj.result.end);
            }
            if (this.cursorFocus && this.selecter.getRangeByCursorPos(this.nowCursorPos)) {
                this.cursor.addCursorPos(resultObj.result.end);
            } else {
                this.cursor.setCursorPos(resultObj.result.end);
            }
            if (!hasCache) {
                this.selecter.addSelectedRange(resultObj.list);
            }
            now = resultObj.now;
            count = resultObj.list.length;
        }

        return {
            now: now,
            count: count
        }
    }
    _search(option) {
        let reg = null,
            exec = null,
            preExec = null,
            start = null,
            end = null,
            result = null,
            resultCaches = [],
            resultIndexMap = {},
            rangePos = null,
            that = this,
            line = 1,
            column = 0
        let text = this.htmls.map((item) => {
            return item.text
        }).join('\n');
        let strs = option.text.split(/\n/);
        let regStr = option.text.replace(/\\|\.|\*|\+|\-|\?|\(|\)|\[|\]|{|\}|\^|\$|\~|\!/g, '\\$&');
        regStr = (option.wholeWord ? '(?:\\b|(?=[^0-9a-zA-Z]))' : '') + regStr + (option.wholeWord ? '(?:\\b|(?=[^0-9a-zA-Z]))' : '');
        option = option || {};
        reg = new RegExp('[^\n]*?(' + regStr + ')|[^\n]*?\n', option.ignoreCase ? 'img' : 'mg');
        while (exec = reg.exec(text)) {
            if (!exec[1]) {
                line++;
                column = 0;
            } else {
                if (preExec && preExec[1] && preExec.index + preExec[0].length !== exec.index) {
                    line++;
                    column = 0;
                }
                start = {
                    line: line,
                    column: column + exec[0].length - strs[0].length
                }
                end = {
                    line: line + strs.length - 1,
                    column: strs.length > 1 ? strs.peek().length : column + exec[0].length
                }
                column = end.column;
                rangePos = {
                    start: start,
                    end: end
                };
                resultCaches.push(rangePos);
                if (!result && (!that.nowCursorPos || Util.comparePos(end, that.nowCursorPos) >= 0)) {
                    if (!this.selecter.selectedRanges.length || !this.selecter.getRangeByCursorPos(end)) {
                        result = rangePos;
                    }
                    resultCaches.index = resultCaches.length - 1;
                    resultIndexMap[resultCaches.length - 1] = true;
                }
            }
            preExec = exec;
        }
        if (!resultCaches.length) {
            return null;
        }
        if (!result && resultCaches.length) {
            resultCaches.index = 0;
            result = resultCaches[0];
        }
        this.cache(option, resultCaches, resultIndexMap);
        return {
            now: resultCaches.index + 1,
            list: resultCaches,
            result: result
        };
    }
    // 重新搜索
    refreshSearch(option) {
        if (!this.hasCache() && !option) {
            return;
        }
        let refreshSearchId = this.refreshSearch.id + 1 || 1;
        this.refreshSearch.id = refreshSearchId;
        this.$nextTick(() => {
            if (this.refreshSearch.id !== refreshSearchId) {
                return;
            }
            if (this.hasCache() || option) {
                option = option || this.cacheData.option;
                this.clearSearch();
                this.$refs.searchDialog.search();
            }
        });
    }
    clearSearch() {
        this.selecter.clearRange();
        this.cacheData = null;
    }
    cache(option, resultCaches, resultIndexMap) {
        this.cacheData = {
            option: option,
            resultCaches: resultCaches,
            resultIndexMap: resultIndexMap
        };
    }
    clearNow() {
        if (this.cacheData) {
            this.cacheData.resultCaches.index = -1;
            this.cacheData.resultIndexMap = {};
        }
    }
    hasCache() {
        return !!this.cacheData;
    }
    now() {
        let resultCaches = this.cacheData.resultCaches;
        return {
            now: resultCaches.index + 1,
            list: resultCaches,
            result: resultCaches[resultCaches.index]
        }
    }
    next() {
        return this.getFromCache();
    }
    prev() {
        return this.getFromCache('up');
    }
    setNow(cursorPos) {
        let resultCaches = this.cacheData.resultCaches;
        this.cacheData.resultCaches.index = 0;
        this.cacheData.resultIndexMap = {
            0: true
        };
        for (let i = 0; i < resultCaches.length; i++) {
            let item = resultCaches[i];
            if (Util.comparePos(item.end, cursorPos) >= 0) {
                this.cacheData.resultCaches.index = i;
                this.cacheData.resultIndexMap = {
                    i: true
                };
                break;
            }
        }
    }
    getFromCache(direct) {
        if (this.cacheData.resultCaches.index < 0) {
            this.setNow(this.nowCursorPos);
            return this.now();
        }
        let resultCaches = this.cacheData.resultCaches;
        let resultIndexMap = this.cacheData.resultIndexMap;
        let index = resultCaches.index + (direct === 'up' ? -1 : 1);
        let result = null;
        if (index == resultCaches.length) {
            index = 0;
        } else if (index < 0) {
            index = resultCaches.length - 1;
        }
        if (!resultIndexMap[index] || this.fSearcher === this) {
            result = resultCaches[index];
            resultCaches.index = index;
            resultIndexMap[index] = true;
        }
        return {
            now: index + 1,
            result: result,
            list: resultCaches
        }
    }
    getConfig() {
        if (!this.cacheData) {
            return;
        }
        return Object.assign({}, this.cacheData.option);
    }
}