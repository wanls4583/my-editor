/*
 * @Author: lisong
 * @Date: 2020-10-31 13:48:50
 * @Description: 工具类
 */
import globalData from '@/data/globalData';
import $ from 'jquery';
import stripJsonComments from 'strip-json-comments';

const require = window.require || window.parent.require || function () {};
const fs = require('fs');

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
        var num = (r && r[0]) || '';
        if (num) {
            num = Number(r[0]);
        }
        return num;
    }
    //生成指定个数的空白符
    static space(tabSize) {
        var val = '';
        for (var tmp = 0; tmp < tabSize; tmp++) {
            val += ' ';
        }
        return val;
    }
    //数组数字排序
    static sortNum(arr) {
        arr.sort(function (arg1, arg2) {
            return Number(arg1) - Number(arg2);
        });
    }
    //获取字符宽度
    static getCharWidth(wrap, template) {
        var str1 = '------------------------------------------------------------------------------------';
        var str2 = '一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一一';
        var id1 = 'char-width-' + Util.getUUID();
        var id2 = 'char-width-' + Util.getUUID();
        var $tempDom1 = $(template.replace('[dom]', `<span id="${id1}">${str1}</span>`));
        var $tempDom2 = $(template.replace('[dom]', `<span id="${id2}">${str2}</span>`));
        $(wrap).append($tempDom1).append($tempDom2);
        var charWidth = $tempDom1[0].scrollWidth / str1.length;
        var charHight = $tempDom1[0].clientHeight;
        var fontSize = window.getComputedStyle ? window.getComputedStyle($tempDom1[0], null).fontSize : $tempDom1[0].currentStyle.fontSize;
        var fullAngleCharWidth = $tempDom2[0].scrollWidth / str2.length;
        $tempDom1.remove();
        $tempDom2.remove();
        return {
            charWidth: charWidth,
            fullAngleCharWidth: fullAngleCharWidth,
            charHight: charHight,
            fontSize: fontSize,
        };
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
        tabNum = (tabNum && tabNum.length) || 0;
        match = (match && match.length) || 0;
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
        var $tempDom = $(`<div class="my-line my-temp-text" style="visibility:hidden">
        <div class="my-code" id="${id}">${_splitStr(str)}</div>
        </div>`);
        $(wrap).append($tempDom);
        var dom = $('#' + id)[0];
        var charWidth = dom.clientWidth;
        $('.my-temp-text').remove();
        // if (Util.getStrExactWidth.count > 5) { //避免频繁删除dom导致浏览器卡顿
        //     $('.my-temp-text').remove();
        // } else {
        //     clearTimeout(Util.getStrExactWidth.timer);
        //     Util.getStrExactWidth.timer = setTimeout(() => {
        //         $('.my-temp-text').remove();
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
    static deepAssign(targetObj, originObj, noDeepKeys) {
        return _assign(targetObj, originObj, noDeepKeys, new Map());

        function _assign(targetObj, originObj, noDeepKeys, assigned) {
            noDeepKeys = noDeepKeys || [];
            for (var key in originObj) {
                var value = originObj[key];
                if (noDeepKeys.indexOf(key) > -1) {
                    targetObj[key] = value;
                    continue;
                }
                if (typeof value === 'object' && !(value instanceof RegExp) && value !== null && (!value.nodeName || !value.nodeType)) {
                    if (assigned.has(value)) {
                        targetObj[key] = assigned.get(value);
                    } else {
                        let tmp = null;
                        if (value instanceof Array) {
                            tmp = targetObj[key] || [];
                            assigned.set(value, tmp);
                            targetObj[key] = _assign(tmp, value, noDeepKeys, new Map(assigned));
                        } else {
                            tmp = targetObj[key] || {};
                            assigned.set(value, tmp);
                            targetObj[key] = _assign(tmp, value, noDeepKeys, new Map(assigned));
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
            str += ((Math.random() * 16) | 0).toString(16);
        }
        return str;
    }
    /**
     * 比较坐标的前后
     * @param {Object} start
     * @param {Object} end
     */
    static comparePos(start, end) {
        if (start.line > end.line || (start.line == end.line && start.column > end.column)) {
            return 1;
        } else if (start.line == end.line && start.column == end.column) {
            return 0;
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
        properties.forEach((property) => {
            result[property] = {
                get: function () {
                    if (typeof context[property] == 'function') {
                        return context[property].bind(context);
                    } else {
                        return context[property];
                    }
                },
            };
        });
        Object.defineProperties(target, result);
    }
    static getLanguageById(languageList, language) {
        for (let i = 0; i < languageList.length; i++) {
            if (languageList[i].language === language) {
                return languageList[i];
            }
        }
    }
    static getLanguageByScopeName(languageList, scopeName) {
        for (let i = 0; i < languageList.length; i++) {
            if (languageList[i].scopeName === scopeName) {
                return languageList[i];
            }
        }
    }
    static getWordPattern(language) {
        let wordPattern = globalData.defaultWordPattern;
        language = Util.getLanguageById(globalData.languageList, language);
        if (language) {
            let _wordPattern = globalData.sourceWordMap[language.scopeName];
            _wordPattern = _wordPattern && _wordPattern.pattern;
            wordPattern = _wordPattern || wordPattern;
        }
        return new RegExp(wordPattern);
    }
    static getIconByPath(iconData, path, type, fileType, opened) {
        let fileName = /[^\\\/]+$/.exec(path);
        let suffix1 = '';
        let suffix2 = '';
        fileName = fileName && fileName[0];
        if (!iconData) {
            return '';
        }
        if (fileName) {
            suffix1 = /(?<=\.)[^\.]+$/.exec(fileName);
            suffix2 = /(?<=\.)[^\.]+\.[^\.]+$/.exec(fileName);
            suffix1 = suffix1 && suffix1[0];
            suffix2 = suffix2 && suffix2[0];
        }
        if (type === 'light' || type === 'contrast light') {
            iconData = iconData.light;
        }
        if (fileType === 'dir') {
            return opened ? iconData.folderExpanded : iconData.folder;
        }
        if (iconData.fileNames && iconData.fileNames[fileName]) {
            return iconData.fileNames[fileName];
        }
        if (iconData.fileExtensions && iconData.fileExtensions[suffix2]) {
            return iconData.fileExtensions[suffix2];
        }
        if (iconData.fileExtensions && iconData.fileExtensions[suffix1]) {
            return iconData.fileExtensions[suffix1];
        }
        return iconData.file;
    }
    static readFile(path) {
        return new Promise((resolve, reject) => {
            fs.readFile(path, { encoding: 'utf8' }, (error, data) => (error ? reject(error) : resolve(data)));
        });
    }
    static writeFile(path, data) {
        return new Promise((resolve, reject) => {
            fs.writeFile(path, data, { encoding: 'utf8' }, (error) => (error ? reject(error) : resolve()));
        });
    }
    static loadJsonFile(fullPath) {
        return Util.readFile(fullPath).then((data) => {
            data = data.toString();
            data = stripJsonComments(data);
            data = data.replaceAll(/\,(?=\s*(?:(?:\r\n|\n|\r))*\s*[\]\}])/g, '');
            data = JSON.parse(data);
            return data;
        });
    }
    /**
     * 模糊匹配【word是否存在于target中】
     * @param {String} word 被搜索的单词
     * @param {String} target 模板单词
     */
    static fuzzyMatch(word, target, fullMatch) {
        let wordMap = {};
        let towMap = {};
        let wordLength = 0;
        let score = 0;
        let preFinedChar = '';
        let preFinedOriginChar = '';
        let preFinded = false;
        let targetMap = {};
        let count = 0;
        let indexs = [];
        let result = null;
        let _target = target.toLowerCase();
        if (word === target) {
            return fullMatch ? { score: 100, indexs: [] } : null;
        }
        _setMap();
        for (let i = 0; i < target.length; i++) {
            let originChar = target[i];
            let char = _target[i];
            if (
                wordMap[char] &&
                //保证前后字符顺序最多只出现一个位置颠倒且颠倒的两个字符必须相邻
                (!preFinedChar || towMap[preFinedChar + char] || (towMap[char + preFinedChar] && preFinded))
            ) {
                if (!targetMap[char] || targetMap[char] < wordMap[char]) {
                    targetMap[char] = targetMap[char] ? targetMap[char] + 1 : 1;
                    indexs.push(i);
                    if (char === '_' || char === '$') {
                        //检测到连接符+10分
                        score += 10;
                    } else if (preFinded) {
                        //检测到连续匹配
                        score += 5;
                        if (towMap[preFinedChar + char]) {
                            //连续匹配且顺序正确
                            score += 1;
                            if (_humpCheck(preFinedOriginChar, originChar) && preFinded) {
                                //检测到驼峰命名+10分
                                score += 5;
                            }
                        }
                    }
                    if (_complete(char)) {
                        return result;
                    }
                    if (!towMap[char + preFinedChar] || towMap[preFinedChar + char]) {
                        preFinedChar = char;
                        preFinedOriginChar = originChar;
                    }
                    preFinded = true;
                } else {
                    //检测到字符不匹配-1分
                    score--;
                    preFinded = char === preFinedChar;
                }
            } else {
                if (!count && score > -9) {
                    //检测到前三个首字符不匹配-3分
                    score -= 3;
                } else {
                    //检测到字符不匹配-1分
                    score--;
                }
                preFinded = char === preFinedChar;
            }
        }

        // 预处理搜素单词
        function _setMap() {
            if (Util.fuzzyMatch.cache && Util.fuzzyMatch.cache.word === word) {
                wordMap = Util.fuzzyMatch.cache.wordMap;
                towMap = Util.fuzzyMatch.cache.towMap;
                wordLength = Util.fuzzyMatch.cache.wordLength;
                return;
            }
            let preChar = '';
            for (let i = 0; i < word.length; i++) {
                let char = word[i].toLowerCase();
                wordMap[char] = wordMap[char] ? wordMap[char] + 1 : 1;
                if (i > 0) {
                    towMap[preChar + char] = true;
                }
                preChar = char;
            }
            wordLength = Object.keys(wordMap).length;
            Util.fuzzyMatch.cache = {
                word: word,
                wordMap: wordMap,
                towMap: towMap,
                wordLength: wordLength,
            };
        }

        // 检查驼峰命名
        function _humpCheck(preChar, char) {
            let preCode = preChar.charCodeAt(0);
            let charCode = char.charCodeAt(0);
            if ((preCode < 97 && charCode >= 97) || (charCode < 97 && preCode >= 97)) {
                return true;
            }
            return false;
        }

        // 检查是否匹配完成
        function _complete(char) {
            if (targetMap[char] === wordMap[char]) {
                if (++count === wordLength) {
                    result = {
                        score: score,
                        indexs: indexs,
                    };
                    return true;
                }
            }
        }
    }
}
Array.prototype.peek = function (index) {
    if (this.length) {
        return this[this.length - (index || 1)];
    }
};
Array.prototype.empty = function () {
    this.length = 0;
    return this;
};
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
};
String.prototype.peek = function (index) {
    if (this.length) {
        return this[this.length - (index || 1)];
    }
};
//全角符号和中文字符
Util.fullAngleReg =
    /[\x00-\x1f\x80-\xa0\xad\u1680\u180E\u2000-\u200f\u2028\u2029\u202F\u205F\u3000\uFEFF\uFFF9-\uFFFC]|[\u1100-\u115F\u11A3-\u11A7\u11FA-\u11FF\u2329-\u232A\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFB\u3000-\u303E\u3041-\u3096\u3099-\u30FF\u3105-\u312D\u3131-\u318E\u3190-\u31BA\u31C0-\u31E3\u31F0-\u321E\u3220-\u3247\u3250-\u32FE\u3300-\u4DBF\u4E00-\uA48C\uA490-\uA4C6\uA960-\uA97C\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFAFF\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE66\uFE68-\uFE6B\uFF01-\uFF60\uFFE0-\uFFE6]|[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
Util.keyCode = {
    DELETE: 46,
    BACKSPACE: 8,
};
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
    INSERT_LINE: 'insertLine',
    DELETE_LINE: 'deleteLine',
    REPLACE: 'replace',
};
Util.constData = {
    LINE_COMMENT: 'line-comment',
    BLOCK_COMMENT: 'block-comment',
    BRACKET: 'bracket',
    TAG: 'tag',
};
export default Util;
