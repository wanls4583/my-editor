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
        this.wordPattern = Util.getWordPattern(this.language);
    }
    initProperties(editor, context) {
        Util.defineProperties(this, editor, ['language', 'fSearcher', 'searcher', 'nowCursorPos', 'cursor', '$nextTick', '$refs']);
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
            // 搜索框第一次搜索时不选中活动区域，避免第一次删除非搜索框选中区域
            if (this.fSearcher === this && this.selecter.activedRanges.size === 0) {
                resultObj = {
                    now: this.cacheData.index + 1,
                    result: this.cacheData.results[this.cacheData.index],
                    results: this.cacheData.results,
                };
            } else {
                resultObj = this.getFromCache(searchObj.direct);
            }
        } else {
            config = (searchObj && searchObj.config) || this.getToSearchConfig();
            if (!config || !config.text) {
                return { now: 0, count: 0 };
            }
            resultObj = this._search(config);
        }
        if (resultObj && resultObj.result) {
            if (hasCache) {
                if (this.fSearcher === this) {
                    this.selecter.setActive(resultObj.result.end);
                    this.cursor.setCursorPos(resultObj.result.end);
                    this.searcher.clearSearch(); //搜索框确认搜索时，删除非搜索框的选中区域
                } else {
                    this.selecter.addActive(resultObj.result.end);
                    this.cursor.addCursorPos(resultObj.result.end);
                }
            } else {
                this.selecter.addRange(resultObj.results);
                if (this.searcher === this) {
                    this.selecter.addActive(resultObj.result.end);
                    this.cursor.setCursorPos(resultObj.result.end);
                } else {
                    // 搜索框第一次搜索时不选中活动区域，避免第一次删除非搜索框选中区域
                    this.selecter.clearActive();
                }
            }
            now = resultObj.now;
            count = resultObj.results.length;
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
        let results = [];
        let indexs = {};
        let rangePos = null;
        let line = 1;
        let column = 0;
        let index = 0;
        let text = this.getAllText();
        let lines = config.text.split(/\n/);
        let source = config.text.replace(/\\|\.|\*|\+|\-|\?|\(|\)|\[|\]|\{|\}|\^|\$|\~|\!/g, '\\$&');
        //完整匹配
        if (this.wordPattern.test(config.text) && config.wholeWord) {
            source = config.wholeWord ? '(?:\\b|(?<=[^0-9a-zA-Z]))' + source + '(?:\\b|(?=[^0-9a-zA-Z]))' : source;
        }
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
                results.push(rangePos);
                if (!result && Util.comparePos(end, that.nowCursorPos) >= 0) {
                    result = rangePos;
                    index = results.length - 1;
                    indexs[results.length - 1] = true;
                }
            }
        }
        if (!results.length) {
            return null;
        }
        if (!result && results.length) {
            index = 0;
            result = results[0];
        }
        this.cacheData = {
            config: config,
            results: results,
            indexs: indexs,
            index: index,
        };
        return {
            now: this.cacheData.index + 1,
            results: results,
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
    hasCache() {
        return !!this.cacheData;
    }
    /**
     * 清除搜索
     * @param {Boolean} retainActive 是否保留活动的选中区域
     */
    clearSearch(retainActive) {
        if (retainActive) {
            this.selecter.clearInactiveRange();
        } else {
            this.selecter.clearRange();
        }
        this.cacheData = null;
    }
    clearActive() {
        if (this.cacheData) {
            this.cacheData.index = -1;
            this.cacheData.indexs = {};
            this.selecter.clearActive();
        }
    }
    setPrevActive(cursorPos) {
        let results = this.cacheData.results;
        this.cacheData.index = results.length - 1;
        for (let i = results.length - 1; i >= 0; i--) {
            let item = results[i];
            if (Util.comparePos(item.end, cursorPos) < 0) {
                this.cacheData.index = i;
                break;
            }
        }
    }
    setNextActive(cursorPos) {
        let results = this.cacheData.results;
        this.cacheData.index = 0;
        for (let i = 0; i < results.length; i++) {
            let item = results[i];
            if (Util.comparePos(item.end, cursorPos) > 0) {
                this.cacheData.index = i;
                break;
            }
        }
    }
    getNowRange() {
        return this.cacheData.results[this.cacheData.index];
    }
    getFromCache(direct) {
        let results = this.cacheData.results;
        let result = null;
        let index = 0;
        if (this.fSearcher === this) {
            // 搜索框移动活动区域
            if (direct === 'up') {
                this.setPrevActive(this.nowCursorPos);
            } else {
                this.setNextActive(this.nowCursorPos);
            }
            result = results[this.cacheData.index];
        } else {
            //CTRL+D移动活动区域
            let indexs = this.cacheData.indexs;
            index = this.cacheData.index + (direct === 'up' ? -1 : 1);
            if (index == results.length) {
                index = 0;
            } else if (index < 0) {
                index = results.length - 1;
            }
            // 已经没有非活动区域
            if (!indexs[index]) {
                result = results[index];
                indexs[index] = true;
                this.cacheData.index = index;
            } else {
                index = this.cacheData.index;
            }
        }

        return {
            now: index + 1,
            result: result,
            results: results,
        };
    }
    getConfig() {
        if (!this.cacheData) {
            return;
        }
        return Object.assign({}, this.cacheData.config);
    }
}
