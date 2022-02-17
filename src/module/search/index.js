/*
 * @Author: lisong
 * @Date: 2022-02-12 09:52:06
 * @Description: 
 */
import Util from '@/common/Util';
let regs = {
    enter: /\n/g,
    column: /\n([^\n]+)$/,
}

export default class {
    constructor(editor, context) {
        this.initProperties(editor, context);
    }
    initProperties(editor, context) {
        Util.defineProperties(this, editor, ['selecter', 'nowCursorPos']);
        Util.defineProperties(this, context, ['htmls']);
    }
    search(str, option) {
        let resultObj = this.checkCache(str);
        if (resultObj) {
            return resultObj;
        }
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
        let text = context.htmls.map((item) => {
            return item.text
        }).join('\n');
        let strs = str.split(/\n/);
        let regStr = str.replace(/\\|\.|\*|\+|\-|\?|\(|\)|\[|\]|{|\}|\^|\$|\~|\!/g, '\\$&');
        regStr = (option.wholeWord ? '\\b' : '') + regStr + (option.wholeWord ? '\\b' : '');
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
                if (!result && Util.comparePos(end, that.nowCursorPos) >= 0) {
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
        this.cache(str, resultCaches);
        return {
            list: resultCaches,
            result: result
        };
    }
    checkCache(str) {
        if (!this.cacheData || this.cacheData.str !== str) {
            return null;
        }
        let resultCaches = this.cacheData.resultCaches;
        let resultIndexMap = this.cacheData.resultIndexMap;
        let index = resultCaches.index + 1;
        let result = null;
        if (index == resultCaches.length) {
            index = 0;
        }
        // 已经全部遍历完
        if (!resultIndexMap[index]) {
            result = resultCaches[index];
            resultCaches.index = index;
            resultIndexMap[index] = true;
        }
        return {
            list: resultCaches,
            result: result
        }
    }
    hasCache() {
        return !!this.cacheData;
    }
    cache(str, resultCaches) {
        let resultIndexMap = {};
        resultIndexMap[resultCaches.index] = true;
        this.cacheData = {
            str: str,
            resultCaches: resultCaches,
            resultIndexMap: resultIndexMap
        };
    }
    clearCache() {
        this.cacheData = null;
    }
}