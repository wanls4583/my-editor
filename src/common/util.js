/*
 * @Author: lisong
 * @Date: 2020-10-31 13:48:50
 * @Description: 工具类
 */
import $ from 'jquery';

class Util {
    static readClipboard() {
        if (window.clipboardData) {
            return new Promise((resolve) => {
                resolve(clipboardData.getData('Text'));
            });
        } else if (navigator.clipboard) {
            return navigator.clipboard.readText();
        }
    }
    static writeClipboard(text) {
        if (window.clipboardData) {
            clipboardData.setData('Text', text);
        } else if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
        }
    }
    //获取数字
    static getNum(value) {
        value = String(value);
        value = value.replace(/[^0123456789\.]/g, '');
        var regex = /^\d+(\.\d*)?$/;
        var r = regex.exec(value);
        var num = r && r[0] || '';
        if (num) {
            num = Number(r[0]);
        }
        return num;
    }
    //生成指定个数的空白符
    static space(tabSize) {
        var val = '';
        for (var tmp = 0; tmp < tabSize; tmp++) {
            val += ' '
        };
        return val;
    }
    //数组数字排序
    static sortNum(arr) {
        arr.sort(function (arg1, arg2) {
            return Number(arg1) - Number(arg2);
        })
    }
    //获取字符宽度
    static getCharWidth(wrap) {
        var str1 = '------------------------------------------------------------------------------------';
        var str2 = '一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一';
        var id1 = 'char-width-' + Util.getUUID();
        var id2 = 'char-width-' + Util.getUUID();
        var $tempDom = $(`<div class="my-editor-line">
        <div class="my-editor-code"><span id="${id1}">${str1}</span><span id="${id2}">${str2}</span></div>
        </div>`);
        $(wrap).append($tempDom)
        var dom = $('#' + id1)[0];
        var charWidth = dom.scrollWidth / str1.length;
        var charHight = dom.clientHeight;
        var fontSize = window.getComputedStyle ? window.getComputedStyle(dom, null).fontSize : dom.currentStyle.fontSize;
        var fullAngleCharWidth = $('#' + id2)[0].scrollWidth / str2.length;
        $tempDom.remove();
        return {
            charWidth: charWidth,
            fullAngleCharWidth: fullAngleCharWidth,
            charHight: charHight,
            fontSize: fontSize
        }
    }
    /**
     * 获取文本在浏览器中的真实宽度
     * @param  {string} str       文本
     * @param  {number} charW     半角符号/文字宽度
     * @param  {number} fullCharW 全角符号/文字宽度
     * @param  {number} tabSize   tab符所占宽度
     * @param  {number} start     文本开始索引
     * @param  {number} end       文本结束索引
     * @return {number}           文本真实宽度
     */
    static getStrWidth(str, charW, fullCharW, tabSize, start, end) {
        tabSize = tabSize || 4;
        if (typeof start != 'undefined') {
            str = str.substr(start);
        }
        if (typeof end != 'undefined') {
            str = str.substring(0, end - start);
        }
        var match = str.match(this.fullAngleReg);
        var width = str.length * charW;
        var tabNum = str.match(/\t/g);
        tabNum = tabNum && tabNum.length || 0;
        match = match && match.length || 0;
        if (match) {
            match = match - tabNum;
            width = match * fullCharW + (str.length - match) * charW;
            width += tabNum * charW * (tabSize - 1);
        }
        return width;
    }
    /**
     * 获取文本在浏览器中的真实宽度
     * @param  {string} str       文本
     * @param  {DOM} wrap     容器
     */
    static getStrExactWidth(str, tabSize, wrap) {
        Util.getStrExactWidth.count = Util.getStrExactWidth.count || 0;
        Util.getStrExactWidth.count++;
        if (!str) {
            return 0;
        }
        var id = 'str-width-' + Util.getUUID();
        var $tempDom = $(`<div class="my-editor-line my-editor-temp-text" style="visibility:hidden">
        <div class="my-editor-code" id="${id}">${_splitStr(str)}</div>
        </div>`);
        $(wrap).append($tempDom)
        var dom = $('#' + id)[0];
        var charWidth = dom.clientWidth;
        $('.my-editor-temp-text').remove();
        // if (Util.getStrExactWidth.count > 5) { //避免频繁删除dom导致浏览器卡顿
        //     $('.my-editor-temp-text').remove();
        // } else {
        //     clearTimeout(Util.getStrExactWidth.timer);
        //     Util.getStrExactWidth.timer = setTimeout(() => {
        //         $('.my-editor-temp-text').remove();
        //     }, 500);
        // }
        return charWidth;

        function _splitStr(str) {
            let count = Math.floor(str.length / 100);
            let result = [];
            for (let i = 0; i < count; i++) {
                let column = i * 100;
                result.push(Util.htmlTrans(str.slice(column, column + 100)));
            }
            count = count * 100;
            if (count < str.length) {
                result.push(Util.htmlTrans(str.slice(count)));
            }
            return `<span>${result.join('</span><span>').replace(/\t/g, Util.space(tabSize || 4))}</span>`;
        }
    }
    //<,>转义
    static htmlTrans(cont) {
        cont = cont.replace(/\&\#/g, '&amp;#');
        return cont.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    // 深度克隆
    static deepAssign(targetObj, originObj, excludeKeys) {
        return _assign(targetObj, originObj, excludeKeys, new Map());

        function _assign(targetObj, originObj, excludeKeys, assigned) {
            excludeKeys = excludeKeys || [];
            for (var key in originObj) {
                var value = originObj[key];
                if (excludeKeys.indexOf(key) > -1) {
                    continue;
                }
                if (typeof value === 'object' && !(value instanceof RegExp) && value !== null &&
                    (!value.nodeName || !value.nodeType)) {
                    if (assigned.has(value)) {
                        targetObj[key] = assigned.get(value);
                    } else {
                        let tmp = null;
                        if (value instanceof Array) {
                            tmp = targetObj[key] || [];
                            assigned.set(value, tmp);
                            targetObj[key] = _assign(tmp, value, excludeKeys, new Map(assigned));
                        } else {
                            tmp = targetObj[key] || {};
                            assigned.set(value, tmp);
                            targetObj[key] = _assign(tmp, value, excludeKeys, new Map(assigned));
                        }
                    }
                } else {
                    targetObj[key] = value;
                }
            }
            return targetObj;
        }
    }
    static getUUID(len) {
        len = len || 16;
        var str = '';
        for (var i = 0; i < len; i++) {
            str += (Math.random() * 16 | 0).toString(16);
        }
        return str;
    }
    /**
     * 比较坐标的前后
     * @param {Object} start 
     * @param {Object} end 
     */
    static comparePos(start, end) {
        if (start.line > end.line || start.line == end.line && start.column > end.column) {
            return 1;
        } else if (start.line == end.line && start.column == end.column) {
            return 0
        } else {
            return -1;
        }
    }
    static createWorker(funStr) {
        var blob = new Blob([funStr]);
        var url = window.URL.createObjectURL(blob);
        var worker = new Worker(url);
        return worker;
    }
    static defineProperties(target, context, properties) {
        let result = {};
        properties.map((property) => {
            result[property] = {
                get: function () {
                    if (typeof context[property] == 'function') {
                        return context[property].bind(context);
                    } else {
                        return context[property];
                    }
                }
            }
        });
        Object.defineProperties(target, result);
    }
}
Array.prototype.peek = function (index) {
    if (this.length) {
        return this[this.length - (index || 1)];
    }
}
Array.prototype.empty = function () {
    this.length = 0;
    return this;
}
Array.prototype.insert = function (item, sort) {
    if (sort && this.length) {
        let left = 0,
            right = this.length - 1;
        while (left < right) {
            let mid = Math.floor((left + right) / 2);
            if (sort(item, this[mid]) > 0) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }
        if (sort(item, this[left]) < 0) {
            left--;
        }
        this.splice(left + 1, 0, item);
    } else {
        this.push(item);
    }
}
String.prototype.peek = function (index) {
    if (this.length) {
        return this[this.length - (index || 1)];
    }
}
//全角符号和中文字符
Util.fullAngleReg = /[\x00-\x1f\x80-\xa0\xad\u1680\u180E\u2000-\u200f\u2028\u2029\u202F\u205F\u3000\uFEFF\uFFF9-\uFFFC]|[\u1100-\u115F\u11A3-\u11A7\u11FA-\u11FF\u2329-\u232A\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFB\u3000-\u303E\u3041-\u3096\u3099-\u30FF\u3105-\u312D\u3131-\u318E\u3190-\u31BA\u31C0-\u31E3\u31F0-\u321E\u3220-\u3247\u3250-\u32FE\u3300-\u4DBF\u4E00-\uA48C\uA490-\uA4C6\uA960-\uA97C\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFAFF\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE66\uFE68-\uFE6B\uFF01-\uFF60\uFFE0-\uFFE6]|[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
Util.keyCode = {
    DELETE: 46,
    BACKSPACE: 8
}
Util.command = {
    DELETE: 'delete',
    INSERT: 'insert',
    MOVEUP: 'moveLineUp',
    MOVEDOWN: 'moveLineDown',
    COPY_UP: 'copyLineUp',
    COPY_DOWN: 'copyLineDown',
    DELETE_COPY_UP: 'deleteCopyLineUp',
    DELETE_COPY_DOWN: 'deleteCopyLineDown',
    REPLACE: 'replace',
}
Util.constData = {
    PAIR_START: -1,
    PAIR_START_END: 0,
    PAIR_END: 1,
    FOLD_OPEN: 1,
    FOLD_CLOSE: -1,
    DEFAULT: 'default'
}
export default Util;