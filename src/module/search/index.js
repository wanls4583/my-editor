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
            start = null,
            end = null,
            result = null,
            resultCaches = [],
            firstRnagePos = null,
            rangePos = null;
        let pos = {
            line: 1,
            column: 0,
            index: 0
        }
        let text = context.htmls.map((item) => {
            return item.text
        }).join('\n');
        let originText = text;
        let regStr = str.replace(/\\|\.|\*|\+|\-|\?|\(|\)|\[|\]|{|\}|\^|\$|\~|\!/g, '\\$&');
        regStr = (option.wholeWord ? '\\b' : '') + regStr + (option.wholeWord ? '\\b' : '');
        option = option || {};
        reg = new RegExp(regStr, option.ignoreCase ? 'i' : '');
        while (exec = reg.exec(text)) {
            this.setLineColumn(text.slice(0, exec.index), pos);
            pos.index += exec.index;
            start = Object.assign({}, pos);
            this.setLineColumn(exec[0], pos);
            pos.index += exec[0].length;
            end = Object.assign({}, pos);
            text = originText.slice(pos.index);
            rangePos = {
                start: start,
                end: end
            };
            firstRnagePos = firstRnagePos || rangePos;
            if (!result && Util.comparePos(end, this.nowCursorPos) >= 0 && !this.selecter.checkCursorSelected(start)) {
                result = rangePos;
            }
            resultCaches.push(rangePos);
        }
        if (!result && firstRnagePos && !this.selecter.checkCursorSelected(firstRnagePos.start)) {
            result = firstRnagePos
        }
        this.cache(str, resultCaches, result);
        return {
            list: Util.deepAssign([], resultCaches),
            result: Util.deepAssign({}, result)
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
            list: Util.deepAssign([], resultCaches),
            result: Util.deepAssign({}, result)
        }
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
    setLineColumn(text, pos) {
        let lines = text.match(regs.enter);
        lines = lines && lines.length || 0;
        pos.line += lines;
        if (lines) {
            let exec = regs.column.exec(text);
            pos.column = exec && exec[1].length || 0;
        } else {
            pos.column += text.length;
        }
    }
}