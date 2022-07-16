/*
 * @Author: lisong
 * @Date: 2022-02-12 09:52:06
 * @Description:
 */
import Util from '@/common/util';

export default class {
    constructor(editor, context, selecter) {
        this.editor = editor;
        this.context = context;
        this.selecter = selecter;
        this.wordPattern = Util.getWordPattern(this.editor.language);
        this.wholeWordPattern = new RegExp(`^(${this.wordPattern.source})$`);
        this.wordPattern = new RegExp(this.wordPattern.source, 'g');
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
            resultObj = this.execSearch(config);
        }
        if (resultObj && resultObj.result) {
            if (this.editor.searcher === this || searchObj.increase) {
                if (hasCache) {
                    this.editor.cursor.addCursorPos(resultObj.result.end);
                    this.selecter.addActive(resultObj.result.end);
                } else {
                    //当前光标已处于选中区域边界，则不处理（历史记录后退时可能存在多个选中区域的情况）
                    if (this.selecter.activedRanges.size === 0) {
                        this.editor.cursor.setCursorPos(resultObj.result.end);
                    } else {
                        this.initIndexs();
                    }
                    this.selecter.addRange(resultObj.results);
                }
            } else {
                if (hasCache) {
                    this.selecter.setActive(resultObj.result.end);
                    this.editor.cursor.setCursorPos(resultObj.result.end);
                    this.editor.searcher.clearSearch(); //搜索框确认搜索后，删除按键搜索
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
    execSearch(config) {
        let reg = null;
        let exec = null;
        let start = null;
        let end = null;
        let result = null;
        let results = [];
        let indexMap = new Map();
        let rangePos = null;
        let line = 1;
        let column = 0;
        let index = 0;
        let text = this.context.getAllText();
        let lines = config.text.split(/\n/);
        let source = config.text.replace(/\\|\.|\*|\+|\-|\?|\(|\)|\[|\]|\{|\}|\^|\$|\~|\!|\&|\|/g, '\\$&');
        //完整匹配
        if (this.wholeWordPattern.test(config.text) && config.wholeWord) {
            source = '(?:\\b|(?<=[^0-9a-zA-Z]))' + source + '(?:\\b|(?=[^0-9a-zA-Z]))';
        }
        reg = new RegExp('[^\n]*?(' + source + ')|[^\n]*?\n', config.matchCase ? 'mg' : 'img');
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
                if (!result && Util.comparePos(end, this.editor.nowCursorPos) >= 0) {
                    result = rangePos;
                    index = results.length - 1;
                    indexMap.set(results.length - 1, true);
                }
            }
        }
        if (!results.length) {
            return null;
        }
        this.cacheData = {
            config: config,
            results: results,
            indexMap: indexMap,
            index: index,
        };
        return {
            now: this.cacheData.index + 1,
            result: result || results,
            results: results,
        };
    }
    initIndexs() {
        let ranges = this.selecter.activedRanges.toArray();
        this.cacheData.indexMap.clear();
        ranges.forEach((range) => {
            for (let i = 0; i < this.cacheData.results.length; i++) {
                let item = this.cacheData.results[i];
                if (Util.comparePos(range.start, item.start) === 0) {
                    this.cacheData.index = i;
                    this.cacheData.indexMap.set(i, true);
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
            this.editor.$nextTick(() => {
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
            this.cacheData.indexMap.clear();
            this.selecter.clearActive();
        }
    }
    removeNow() {
        this.cacheData.results.splice(this.cacheData.index, 1);
        this.cacheData.index--;
    }
    // 克隆缓存，当关闭搜索框时候，搜索框的的结果将克隆到searcher
    clone(cacheData) {
        this.cacheData = cacheData;
        if (cacheData) {
            this.selecter.addRange(cacheData.results);
        }
    }
    // 搜索框移动到上一个区域
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
        return this.cacheData.index;
    }
    // 搜索框移动到下一个区域
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
        return this.cacheData.index;
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
        if (this.editor.fSearcher === this && !increase) {
            // 搜索框移动活动区域，可循环移动
            if (direct === 'up') {
                index = this.setPrevActive(this.editor.nowCursorPos);
            } else {
                index = this.setNextActive(this.editor.nowCursorPos);
            }
            result = this.cacheData.results[index];
            this.cacheData.indexMap.clear();
        } else {
            //Ctrl+D/Shfit+D移动活动区域，只看移动一个轮回
            if (this.cacheData.indexMap.size < results.length) {
                if (direct === 'up') {
                    index = this.cacheData.index - 1;
                } else {
                    index = this.cacheData.index + 1;
                }
                index = index === results.length ? 0 : index;
                index = index < 0 ? 0 : index;
                result = results[index];
                this.cacheData.indexMap.set(index, true);
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
        let range = null;
        // 非搜索框模式下，存在多个选区则不进行搜索
        if (this === this.editor.searcher && this.selecter.ranges.size > 1) {
            return null;
        }
        range = this.editor.searcher.selecter.getRangeByCursorPos(this.editor.nowCursorPos);
        if (range) {
            // 待搜索内容为选中的内容
            searchText = this.context.getRangeText(range.start, range.end);
        } else {
            // 待搜索内容为光标处的单词
            searchText = this.getNowWord().text;
            wholeWord = true;
        }
        if (searchText) {
            result = {
                text: searchText,
                wholeWord: wholeWord,
                matchCase: wholeWord,
            };
        }
        return result;
    }
    getNowWord() {
        let str = '';
        let res = null;
        let delta = 0;
        let index = this.editor.nowCursorPos.column;
        let startColumn = index;
        let endColumn = index;
        let text = this.context.htmls[this.editor.nowCursorPos.line - 1].text;
        // 单词头部离当前光标最多50个字符的距离
        if (index > 50) {
            text = text.slice(index - 50);
            index = 50;
            delta = index - 50;
        }
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
                start: { line: this.editor.nowCursorPos.line, column: startColumn + delta, },
                end: { line: this.editor.nowCursorPos.line, column: endColumn + delta, },
            },
        };
    }
}
