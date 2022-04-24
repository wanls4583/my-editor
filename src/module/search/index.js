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
        Util.defineProperties(this, context, ['htmls', 'getRangeText', 'getAllText']);
    }
    search(searchObj) {
        let resultObj = null;
        let now = 0;
        let count = 0;
        let hasCache = this.hasCache();
        let config = null;
        searchObj = searchObj || {};
        if (hasCache) {
            resultObj = this.getFromCache(searchObj.direct, searchObj.increase);
        } else {
            config = (searchObj && searchObj.config) || this.getSearchConfig();
            if (!config || !config.text) {
                return { now: 0, count: 0 };
            }
            resultObj = this._search(config);
        }
        if (resultObj && resultObj.result) {
            if (this.searcher === this || searchObj.increase) {
                if (hasCache) {
                    this.cursor.addCursorPos(resultObj.result.end);
                    this.selecter.addActive(resultObj.result.end);
                } else {
                    //当前光标已处于选中区域边界，则不处理（历史记录后退时可能存在多个选中区域的情况）
                    if (this.selecter.activedRanges.size === 0) {
                        this.cursor.setCursorPos(resultObj.result.end);
                    } else {
                        this.initIndexs();
                    }
                    this.selecter.addRange(resultObj.results);
                }
            } else {
                if (hasCache) {
                    this.selecter.setActive(resultObj.result.end);
                    this.cursor.setCursorPos(resultObj.result.end);
                    this.searcher.clearSearch(); //搜索框确认搜索后，删除按键搜索
                } else {
                    this.selecter.addRange(resultObj.results);
                    this.clearActive();
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
        let source = config.text.replace(/\\|\.|\*|\+|\-|\?|\(|\)|\[|\]|\{|\}|\^|\$|\~|\!|\&|\|/g, '\\$&');
        //完整匹配
        if (this.wordPattern.test(config.text) && config.wholeWord) {
            source = '(?:\\b|(?<=[^0-9a-zA-Z]))' + source + '(?:\\b|(?=[^0-9a-zA-Z]))';
        }
        this.wordPattern.lastIndex = 0;
        reg = new RegExp('[^\n]*?(' + source + ')|[^\n]*?\n', config.ignoreCase ? 'img' : 'mg');
        config = config || {};
        while ((exec = reg.exec(text))) {
            if (!exec[1]) {
                line++;
                column = 0;
            } else {
                start = {
                    line: line,
                    column: column + exec[0].length - exec[1].length,
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
    initIndexs() {
        let ranges = this.selecter.activedRanges.toArray();
        this.cacheData.indexs = {};
        ranges.forEach((range) => {
            for (let i = 0; i < this.cacheData.results.length; i++) {
                let item = this.cacheData.results[i];
                if (Util.comparePos(range.start, item.start) === 0) {
                    this.cacheData.index = i;
                    this.cacheData.indexs[i] = true;
                    break;
                }
            }
        });
    }
    // 重新搜索
    refreshSearch(config) {
        if (!this.hasCache() && !config) {
            return;
        }
        return new Promise((resolve) => {
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
                resolve();
            });
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
        let index = this.cacheData.index;
        this.cacheData.index = results.length - 1;
        for (let i = results.length - 1; i >= 0; i--) {
            let item = results[i];
            let res = Util.comparePos(item.end, cursorPos);
            if (res < 0 || (index === -1 && res === 0)) {
                this.cacheData.index = i;
                break;
            }
        }
    }
    setNextActive(cursorPos) {
        let results = this.cacheData.results;
        let index = this.cacheData.index;
        this.cacheData.index = 0;
        for (let i = 0; i < results.length; i++) {
            let item = results[i];
            let res = Util.comparePos(item.end, cursorPos);
            if (res > 0 || (index === -1 && res === 0)) {
                this.cacheData.index = i;
                break;
            }
        }
    }
    removeNow() {
        this.cacheData.results.splice(this.cacheData.index, 1);
        this.cacheData.index--;
    }
    clone(cacheData) {
        this.cacheData = cacheData;
        if (cacheData) {
            this.selecter.addRange(cacheData.results);
        }
    }
    getCacheData() {
        return this.cacheData;
    }
    getNowRange() {
        return this.cacheData.results[this.cacheData.index];
    }
    getFromCache(direct, increase) {
        let results = this.cacheData.results;
        let result = null;
        let index = 0;
        if (this.fSearcher === this && !increase) {
            // 搜索框移动活动区域
            if (direct === 'up') {
                this.setPrevActive(this.nowCursorPos);
            } else {
                this.setNextActive(this.nowCursorPos);
            }
            index = this.cacheData.index;
            result = this.cacheData.results[index];
            this.cacheData.indexs = { i: true };
        } else {
            //CTRL+D移动活动区域
            let indexs = this.cacheData.indexs;
            let delta = 0;
            if (direct === 'up') {
                delta = -1;
            } else {
                delta = 1;
            }
            index = this.cacheData.index + delta;
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
    // 获取待搜索的文本
    getSearchConfig() {
        let result = null;
        let wholeWord = false;
        let searchText = '';
        let range = this.searcher.selecter.getRangeByCursorPos(this.nowCursorPos);
        if (this.searcher === this && this.selecter.ranges.size > 0) {
            return null;
        }
        if (range) {
            searchText = this.getRangeText(range.start, range.end);
        } else {
            searchText = this.getNowWord().text;
            wholeWord = true;
        }
        if (searchText) {
            result = {
                text: searchText,
                wholeWord: wholeWord,
                ignoreCase: wholeWord,
            };
        }
        return result;
    }
    getNowWord() {
        let text = this.htmls[this.nowCursorPos.line - 1].text;
        let str = '';
        let index = this.nowCursorPos.column;
        let startColumn = index;
        let endColumn = index;
        let res = null;
        while ((res = this.wordPattern.exec(text))) {
            if (res.index <= index && res.index + res[0].length >= index) {
                startColumn = res.index;
                endColumn = res.index + res[0].length;
                str = res[0];
                break;
            } else if (res.index > index) {
                break;
            }
        }
        this.wordPattern.lastIndex = 0;

        return {
            text: str,
            range: {
                start: {
                    line: this.nowCursorPos.line,
                    column: startColumn,
                },
                end: {
                    line: this.nowCursorPos.line,
                    column: endColumn,
                },
            },
        };
    }
}
