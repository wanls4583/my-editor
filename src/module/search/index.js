/*
 * @Author: lisong
 * @Date: 2022-02-12 09:52:06
 * @Description: 
 */
import Util from '@/common/Util';

export default class {
    constructor(editor, context) {
        this.initProperties(editor, context);
    }
    initProperties(editor, context) {
        Util.defineProperties(this, editor, ['selecter', 'nowCursorPos', 'cursorFocus']);
        Util.defineProperties(this, context, ['htmls']);
    }
    search(option) {
        let reg = null,
            exec = null,
            preExec = null,
            start = null,
            end = null,
            result = null,
            resultCaches = [],
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
                if (!result && (!that.nowCursorPos || Util.comparePos(end, that.nowCursorPos) >= 0)) {
                    result = rangePos;
                    resultCaches.index = resultCaches.length;
                }
                resultCaches.push(rangePos);
            }
            preExec = exec;
        }
        if (!result && resultCaches.length) {
            resultCaches.index = 0;
            result = resultCaches[0];
        }
        this.cache(option, resultCaches);
        return {
            now: resultCaches.index + 1,
            list: resultCaches,
            result: result
        };
    }
    cache(option, resultCaches) {
        let resultIndexMap = {};
        resultIndexMap[resultCaches.index] = true;
        this.cacheData = {
            option: option,
            resultCaches: resultCaches,
            resultIndexMap: resultIndexMap
        };
    }
    clearCache(now) {
        let index = now - 1;
        if (now !== undefined) {
            let resultCaches = this.cacheData.resultCaches;
            let indexs = Object.keys(this.cacheData.resultIndexMap);
            this.cacheData.resultIndexMap = {};
            resultCaches.splice(index, 1);
            if (resultCaches.index >= index) {
                resultCaches.index--;
            }
            indexs.map((item) => {
                if (item >= index) {
                    item--;
                }
                if (item > -1) {
                    this.cacheData.resultIndexMap[item] = true;
                }
            });
        } else {
            this.cacheData = null;
        }
    }
    checkCache(direct) {
        let resultCaches = this.cacheData.resultCaches;
        let resultIndexMap = this.cacheData.resultIndexMap;
        let index = resultCaches.index + (direct === 'up' ? -1 : 1);
        let result = null;
        if (index == resultCaches.length) {
            index = 0;
        } else if (index < 0) {
            index = resultCaches.length - 1;
        }
        if (!resultIndexMap[index] || !this.cursorFocus) {
            result = resultCaches[index];
            resultCaches.index = index;
            resultIndexMap[index] = true;
        }
        return {
            now: index + 1,
            list: resultCaches,
            result: result
        }
    }
    hasCache() {
        return !!this.cacheData;
    }
    next() {
        return this.checkCache();
    }
    prev() {
        return this.checkCache('up');
    }
    now() {
        let resultCaches = this.cacheData.resultCaches;
        return {
            now: resultCaches.index + 1,
            list: resultCaches,
            result: resultCaches[resultCaches.index]
        }
    }
    hasNow() {
        return this.cacheData && this.cacheData.resultCaches.index > -1;
    }
    clearNow() {
        if (this.cacheData) {
            this.cacheData.resultCaches.index = -1;
            this.cacheData.resultIndexMap = {};
        }
    }
    updateAfterPos(cursorPos, line, column) {
        if (this.cacheData) {
            this.cacheData.resultCaches.map((item) => {
                _updateAfter(item.start);
                _updateAfter(item.end);
            });
        }

        function _updateAfter(item) {
            if (item != cursorPos) {
                if (item.line > cursorPos.line) {
                    item.line += line - cursorPos.line;
                } else if (item.line === cursorPos.line && item.column > cursorPos.column) {
                    item.line += line - cursorPos.line;
                    item.column += column - cursorPos.column;
                }
            }
        }
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
    getConfig() {
        return Object.assign({}, this.cacheData.option);
    }
}