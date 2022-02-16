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
            firstRnagePos = null,
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
                firstRnagePos = firstRnagePos || rangePos;
                if (!result && Util.comparePos(end, that.nowCursorPos) >= 0) {
                    result = rangePos;
                }
                resultCaches.push(rangePos);
            }
            preExec = exec;
        }
        if (!result && firstRnagePos) {
            result = firstRnagePos
        }
        this.cache(str, resultCaches, result);
        return {
            list: resultCaches,
            result: result
        };
    }
    checkCache(str) {
        if (!this.cacheData || this.cacheData.str !== str) {
            return;
        }
        let resultCaches = this.cacheData.list;
        let result = null;
        for (let i = 0; i < resultCaches.length; i++) {
            let rangePos = resultCaches[i];
            if (Util.comparePos(rangePos.end, this.cacheData.result.end) > 0) {
                result = rangePos;
                break;
            }
        }
        if (!result) {
            result = resultCaches[0];
        }
        this.cacheData.result = result;
        return {
            list: resultCaches,
            result: result
        }
    }
    hasCache() {
        return !!this.cacheData;
    }
    cache(str, list, result) {
        this.cacheData = {
            str: str,
            list: list,
            result: result,
        };
    }
    clearCache() {
        this.cacheData = null;
    }
}