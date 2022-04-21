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
        Util.defineProperties(this, editor, ['fSearcher', 'searcher', 'nowCursorPos', 'cursorFocus', 'cursor', '$nextTick', '$refs']);
        Util.defineProperties(this, context, ['htmls', 'getToSearchConfig', 'getAllText']);
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
            config = (searchObj && searchObj.config) || this.getToSearchConfig();
            if (!config || !config.text) {
                return { now: 0, count: 0 };
            }
            resultObj = this._search(config);
        }
        if (resultObj && resultObj.result) {
            if (!hasCache) {
                this.selecter.addRange(resultObj.list);
            }
            if (this.fSearcher === this) {
                if (this.cursorFocus === false) {
                    this.searcher.clearSearch();
                    this.selecter.setActive(resultObj.result.end);
                    this.cursor.setCursorPos(resultObj.result.end);
                } else {
                    this.clearNow();
                }
            } else {
                this.selecter.addActive(resultObj.result.end);
                if (this.selecter.getRangeByCursorPos(this.nowCursorPos)) {
                    this.cursor.removeCursor(resultObj.result.start);
                    this.cursor.addCursorPos(resultObj.result.end);
                } else {
                    this.cursor.setCursorPos(resultObj.result.end);
                }
            }
            now = resultObj.now;
            count = resultObj.list.length;
        }

        return {
            now: now,
            count: count,
        };
    }
    _search(config) {
        let that = this;
        let reg = null;
        let exec = null;
        let start = null;
        let end = null;
        let result = null;
        let resultCaches = [];
        let resultIndexMap = {};
        let rangePos = null;
        let line = 1;
        let column = 0;
        let index = 0;
        let text = this.getAllText();
        let lines = config.text.split(/\n/);
        let source = config.text.replace(/\\|\.|\*|\+|\-|\?|\(|\)|\[|\]|\{|\}|\^|\$|\~|\!/g, '\\$&');
        source = config.wholeWord ? '(?:\\b|(?<=[^0-9a-zA-Z]))' + source + '(?:\\b|(?=[^0-9a-zA-Z]))' : source;
        reg = new RegExp('[^\n]*?(' + source + ')|[^\n]*?\n', config.ignoreCase ? 'img' : 'mg');
        config = config || {};
        while ((exec = reg.exec(text))) {
            if (!exec[1]) {
                line++;
                column = 0;
            } else {
                start = {
                    line: line,
                    column: column + exec[0].length - lines[0].length,
                };
                end = {
                    line: line + lines.length - 1,
                    column: lines.length > 1 ? lines.peek().length : column + exec[0].length,
                };
                line = end.line;
                column = end.column;
                rangePos = {
                    start: start,
                    end: end,
                };
                resultCaches.push(rangePos);
                if (!result && (!that.nowCursorPos || Util.comparePos(end, that.nowCursorPos) >= 0)) {
                    if (!this.selecter.ranges.size || !this.selecter.getRangeByCursorPos(end)) {
                        result = rangePos;
                    }
                    index = resultCaches.length - 1;
                    resultIndexMap[resultCaches.length - 1] = true;
                }
            }
        }
        if (!resultCaches.length) {
            return null;
        }
        if (!result && resultCaches.length) {
            index = 0;
            result = resultCaches[0];
        }
        this.cacheData = {
            config: config,
            resultCaches: resultCaches,
            resultIndexMap: resultIndexMap,
            index: index,
        };
        return {
            now: this.cacheData.index + 1,
            list: resultCaches,
            result: result,
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
                this.search({
                    config: config,
                });
            }
        });
    }
    /**
     * 清除搜索
     * @param {Boolean} retainActive 是否保留活动的选中区域
     */
    clearSearch(retainActive) {
        if (retainActive) {
            this.selecter.clearInactive();
        } else {
            this.selecter.clearRange();
        }
        this.cacheData = null;
    }
    clearNow() {
        if (this.cacheData) {
            this.cacheData.index = -1;
            this.cacheData.resultIndexMap = {};
            this.selecter.clearActive();
        }
    }
    hasCache() {
        return !!this.cacheData;
    }
    now() {
        return this.cacheData.resultCaches[this.cacheData.index];
    }
    next() {
        return this.getFromCache();
    }
    prev() {
        return this.getFromCache('up');
    }
    setNow(cursorPos) {
        let resultCaches = this.cacheData.resultCaches;
        this.cacheData.index = 0;
        this.cacheData.resultIndexMap = {
            0: true,
        };
        for (let i = 0; i < resultCaches.length; i++) {
            let item = resultCaches[i];
            if (Util.comparePos(item.end, cursorPos) >= 0) {
                this.cacheData.index = i;
                this.cacheData.resultIndexMap = {
                    i: true,
                };
                break;
            }
        }
    }
    getFromCache(direct) {
        if (!this.selecter.getRangeByCursorPos(this.nowCursorPos) || this.cacheData.index < 0) {
            this.setNow(this.nowCursorPos);
            if (direct !== 'up') {
                let resultCaches = this.cacheData.resultCaches;
                return {
                    now: this.cacheData.index + 1,
                    list: resultCaches,
                    result: resultCaches[this.cacheData.index],
                };
            }
        }
        let resultCaches = this.cacheData.resultCaches;
        let resultIndexMap = this.cacheData.resultIndexMap;
        let index = this.cacheData.index + (direct === 'up' ? -1 : 1);
        let result = null;
        if (index == resultCaches.length) {
            index = 0;
        } else if (index < 0) {
            index = resultCaches.length - 1;
        }
        if (!resultIndexMap[index] || this.fSearcher === this) {
            result = resultCaches[index];
            this.cacheData.index = index;
            resultIndexMap[index] = true;
        }
        return {
            now: index + 1,
            result: result,
            list: resultCaches,
        };
    }
    getConfig() {
        if (!this.cacheData) {
            return;
        }
        return Object.assign({}, this.cacheData.config);
    }
}
