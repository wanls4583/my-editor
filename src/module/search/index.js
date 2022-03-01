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
        Util.defineProperties(this, context, ['htmls', 'getToSearchConfig']);
    }
    search(searchObj) {
        let resultObj = null;
        let now = 0;
        let count = 0;
        let hasCache = this.hasCache();
        let config = null;
        searchObj = searchObj || {};
        if (hasCache) {
            if (searchObj.direct === 'up') {
                resultObj = this.prev();
            } else {
                resultObj = this.next();
            }
        } else {
            config = searchObj && searchObj.config || this.getToSearchConfig();
            if (!config.text) {
                return {
                    now: 0,
                    count: 0
                };
            }
            resultObj = this._search(config);
        }
        if (resultObj && resultObj.result) {
            if (this.fSearcher === this) {
                this.selecter.setActive(resultObj.result.end);
                if (!this.cursorFocus) {
                    this.cursor.setCursorPos(resultObj.result.end);
                }
                console.log(this.cursorFocus);
            } else {
                this.selecter.addActive(resultObj.result.end);
                if (this.selecter.getRangeByCursorPos(this.nowCursorPos)) {
                    this.cursor.addCursorPos(resultObj.result.end);
                } else {
                    this.cursor.setCursorPos(resultObj.result.end);
                }
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
    _search(config) {
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
        let strs = config.text.split(/\n/);
        let regStr = config.text.replace(/\\|\.|\*|\+|\-|\?|\(|\)|\[|\]|{|\}|\^|\$|\~|\!/g, '\\$&');
        regStr = (config.wholeWord ? '(?:\\b|(?=[^0-9a-zA-Z]))' : '') + regStr + (config.wholeWord ? '(?:\\b|(?=[^0-9a-zA-Z]))' : '');
        config = config || {};
        reg = new RegExp('[^\n]*?(' + regStr + ')|[^\n]*?\n', config.ignoreCase ? 'img' : 'mg');
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
        this.cache(config, resultCaches, resultIndexMap);
        return {
            now: resultCaches.index + 1,
            list: resultCaches,
            result: result
        };
    }
    // 重新搜索
    refreshSearch(config) {
        if (!this.hasCache() && !config) {
            return;
        }
        let refreshSearchId = this.refreshSearch.id + 1 || 1;
        this.refreshSearch.id = refreshSearchId;
        this.$nextTick(() => {
            if (this.refreshSearch.id !== refreshSearchId) {
                return;
            }
            if (this.hasCache() || config) {
                config = config || this.cacheData.config;
                this.clearSearch();
                this.$refs.searchDialog.search();
            }
        });
    }
    clearSearch() {
        this.selecter.clearRange();
        this.cacheData = null;
    }
    cache(config, resultCaches, resultIndexMap) {
        this.cacheData = {
            config: config,
            resultCaches: resultCaches,
            resultIndexMap: resultIndexMap
        };
    }
    clearNow() {
        if (this.cacheData) {
            this.cacheData.resultCaches.index = -1;
            this.cacheData.resultIndexMap = {};
            this.selecter.clearActive();
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
        if (!this.selecter.getRangeByCursorPos(this.nowCursorPos) ||
            this.cacheData.resultCaches.index < 0) {
            this.setNow(this.nowCursorPos);
            if (direct !== 'up') {
                return this.now();
            }
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
        return Object.assign({}, this.cacheData.config);
    }
}