/*
 * @Author: lisong
 * @Date: 2022-03-17 15:29:26
 * @Description:
 */
import { extract } from 'emmet';
import Util from '@/common/Util';
import globalData from '@/data/globalData';

const require = window.require || window.parent.require || function () {};
const path = require('path');

const regs = {
    stringToken: /(?:\.|^)(?:string|regexp)(?:\.|$)/,
    cssValueToken: /property\-list|property\-value|separator/,
    cssPropertyToken: /property-name/,
    cssSelectorToken: /selector/,
    cssAttributeToken: /attribute\-selector/,
    cssClassToken: /attribute-name\.class/,
    cssPseudoToken: /pseudo\-element/,
    tagToken: /entity.name.tag/,
};

class Autocomplete {
    constructor(editor, context) {
        this.initProperties(editor, context);
        this.doneMap = {};
        this.results = [];
        this.wordPattern = Util.getWordPattern(this.language);
        this.wordPattern = new RegExp(`^(${this.wordPattern.source})$`);
    }
    initProperties(editor, context) {
        Util.defineProperties(this, editor, ['language', 'cursor', 'nowCursorPos', 'tokenizer', 'setAutoTip']);
        Util.defineProperties(this, context, ['htmls']);
    }
    reset() {
        this.currentLine = 1;
        this.results = [];
        this.doneMap = {};
    }
    stop() {
        cancelIdleCallback(this.searchTimer);
    }
    search() {
        this.stop();
        this.searchTimer = requestIdleCallback(() => {
            this._search();
        });
    }
    _search() {
        let lineObj = this.htmls[this.nowCursorPos.line - 1];
        let tokenIndex = this.getTokenIndex(this.nowCursorPos);
        let nowToken = tokenIndex > -1 ? lineObj.tokens[tokenIndex] : null;
        let word = nowToken && lineObj.text.slice(nowToken.startIndex, this.nowCursorPos.column);
        this.reset();
        this.setAutoTip(null);
        if (!word) {
            return;
        }
        if (this._isTextToken(nowToken)) {
            let scope = nowToken.scopes.peek();
            if (scope.startsWith('text.')) {
                //emmet表达式
                this._searchEmmet(word);
            } else if (scope.startsWith('entity.name.tag')) {
                //标签名
                this._searchTag(word);
            }
        } else if (this._isCssToken(nowToken)) {
            if (this._isCssPropertyToken(nowToken)) {
                //css属性名
                this._searchCssProperty(word);
            } else if (this._isCssValueToken(nowToken)) {
                //css属性值
                let property = '';
                for (let i = tokenIndex - 1; i >= 0; i--) {
                    let token = lineObj.tokens[i];
                    if (this._isCssPropertyToken(token)) {
                        property = lineObj.text.slice(token.startIndex, token.endIndex);
                        break;
                    }
                    if (!this._isCssValueToken(token)) {
                        break;
                    }
                }
                if (property) {
                    this._searchCssValue(word, property);
                }
            } else if (this._isCssSelectorToken(nowToken)) {
                if (this._isTagToken(nowToken)) {
                    this._searchCssTag(word);
                } else if (word.indexOf(':') > -1) {
                    this._searchCssPseudo(word);
                }
                this._searchSelector(word, nowToken);
            }
        } else if (this._isSourceToken(nowToken)) {
            if (this.wordPattern.test(word)) {
                this._searchWord(word);
            }
        }
    }
    _searchWord(word) {
        this._searchDocument((lineObj) => {
            lineObj.tokens.forEach((token) => {
                let text = lineObj.text.slice(token.startIndex, token.endIndex);
                if (this.wordPattern.test(text)) {
                    // 跳过标签和字符串
                    if (this._isTextToken(token) || this._isStringToken(token)) {
                        return;
                    }
                    this._addTip({ word: word, value: text, type: 'word' });
                }
            });
        });
    }
    _searchSelector(word, nowToken) {
        if (this._isCssClassToken(nowToken) && word !== '.') {
            word = '.' + word;
        }
        this._searchDocument((lineObj) => {
            lineObj.tokens.forEach((token) => {
                if (this._isCssSelectorToken(token)) {
                    let text = lineObj.text.slice(token.startIndex, token.endIndex);
                    if (this._isCssClassToken(token)) {
                        text = '.' + text;
                    }
                    if (word === '.') {
                        if (this._isCssClassToken(token) && text !== '..') {
                            this._addTip({ word: word, value: text, type: 'css-selector', skipMatch: true });
                        }
                    } else if (this._isCssClassToken(nowToken)) {
                        if (this._isCssClassToken(token)) {
                            this._addTip({ word: word, value: text, type: 'css-selector' });
                        }
                    } else {
                        this._addTip({ word: word, value: text, type: 'css-selector' });
                    }
                }
            });
        }, true);
    }
    _searchDocument(callback, showAll) {
        let line = this.currentLine;
        let startTime = Date.now();
        let processedLines = 0;
        while (line <= this.htmls.length) {
            let lineObj = this.htmls[line - 1];
            line++;
            if (!lineObj.tokens) {
                continue;
            }
            callback(lineObj);
            processedLines++;
            // 避免卡顿
            if (processedLines % 5 == 0 && Date.now() - startTime >= 20) {
                break;
            }
        }
        this.currentLine = line;
        this._showTip(showAll);
        if (line <= this.htmls.length) {
            this.searchTimer = requestIdleCallback(() => {
                this._searchWord(callback);
            });
        }
    }
    _searchTag(word) {
        const htmlData = this.getHtmlData();
        htmlData.tags.forEach((item) => {
            this._addTip({ word: word, value: item.name, type: 'html-tag' });
        });
        if (!this.results.length) {
            this._addTip({ word: word, value: word, type: 'html-tag', skipMatch: true });
        }
        this._showTip();
    }
    _searchCssTag(word) {
        const htmlData = this.getHtmlData();
        htmlData.tags.forEach((item) => {
            this._addTip({ word: word, value: item.name, type: 'css-tag' });
        });
    }
    _searchCssPseudo(word) {
        const cssData = this.getCssData();
        const pseudo = word.split(':').peek().trim();
        cssData.pseudoClasses.forEach((item) => {
            if (pseudo) {
                this._addTip({ word: word, value: item.name, type: 'css-pseudo' });
            } else {
                this._addTip({ word: word, value: item.name, type: 'css-pseudo', skipMatch: true });
            }
        });
        cssData.pseudoElements.forEach((item) => {
            if (pseudo) {
                this._addTip({ word: word, value: item.name, type: 'css-pseudo' });
            } else {
                this._addTip({ word: word, value: item.name, type: 'css-pseudo', skipMatch: true });
            }
        });
    }
    _searchEmmet(word) {
        const emmetObj = extract(word);
        if (emmetObj && emmetObj.abbreviation) {
            let abbreviation = emmetObj.abbreviation;
            let lastChar = abbreviation[abbreviation.length - 1];
            if (lastChar === '+' || lastChar === '/') {
                return;
            }
            this._addTip({ word: abbreviation, value: abbreviation, type: 'emmet-html', skipMatch: true });
            this._showTip();
        }
    }
    _searchCssProperty(word) {
        const cssData = this.getCssData();
        cssData.properties.forEach((item) => {
            this._addTip({ word: word, value: item.name, type: 'css-property', after: ': ' });
        });
        if (!this.results.length) {
            const emmetObj = extract(word);
            if (emmetObj && emmetObj.abbreviation) {
                let abbreviation = emmetObj.abbreviation;
                let lastChar = abbreviation[abbreviation.length - 1];
                if (lastChar === '+' || lastChar === '/') {
                    return;
                }
                this._addTip({ word: abbreviation, value: abbreviation, type: 'emmet-css', skipMatch: true });
            }
        }
        this._showTip();
    }
    _searchCssValue(word, property) {
        const cssData = this.getCssData();
        let values = cssData.propertyMap[property];
        values = values && values.values;
        if (values) {
            let _word = word.trim();
            if (_word === ':' || _word === '') {
                values.forEach((item) => {
                    this._addTip({ word: word, value: item.name, type: 'css-value', after: ';', skipMatch: true });
                });
            } else {
                values.forEach((item) => {
                    this._addTip({ word: word, value: item.name, type: 'css-value', after: ';' });
                });
            }
            this._showTip(true);
        }
    }
    _setTokenType(token) {
        token.isSourceToken = false;
        token.isCssToken = false;
        token.isTextToken = false;
        token.isStringToken = false;
        token.scope = token.scope || token.scopes.join(',');
        for (let i = token.scopes.length - 1; i >= 0; i--) {
            let scope = token.scopes[i];
            if (scope.startsWith('source.')) {
                token.isSourceToken = true;
                if (scope.startsWith('source.css')) {
                    token.isCssToken = true;
                }
                break;
            } else if (scope.startsWith('text.')) {
                token.isTextToken = true;
                break;
            }
        }
        token.isStringToken = regs.stringToken.test(token.scope);
        token.isTagToken = regs.tagToken.test(token.scope);
        if (token.isCssToken) {
            token.isCssValueToken = regs.cssValueToken.test(token.scope);
            token.isCssPropertyToken = regs.cssPropertyToken.test(token.scope);
            token.isCssSelectorToken = regs.cssSelectorToken.test(token.scope);
            token.isCssClassToken = regs.cssClassToken.test(token.scope);
            token.isCssAttributeToken = regs.cssAttributeToken.test(token.scope);
            token.isCssPseudoToken = regs.cssPseudoToken.test(token.scope);
        }
    }
    _isTextToken(token) {
        if (token.isTextToken === undefined) {
            this._setTokenType(token);
        }
        return token.isTextToken;
    }
    _isSourceToken(token) {
        if (token.isSourceToken === undefined) {
            this._setTokenType(token);
        }
        return token.isSourceToken;
    }
    _isCssToken(token) {
        if (token.isCssToken === undefined) {
            this._setTokenType(token);
        }
        return token.isCssToken;
    }
    _isCssPropertyToken(token) {
        if (token.isCssPropertyToken === undefined) {
            this._setTokenType(token);
        }
        return token.isCssPropertyToken;
    }
    _isCssValueToken(token) {
        if (token.isCssValueToken === undefined) {
            this._setTokenType(token);
        }
        return token.isCssValueToken;
    }
    _isCssSelectorToken(token) {
        if (token.isCssSelectorToken === undefined) {
            this._setTokenType(token);
        }
        return token.isCssSelectorToken;
    }
    _isCssClassToken(token) {
        if (token.isCssClassToken === undefined) {
            this._setTokenType(token);
        }
        return token.isCssClassToken;
    }
    _isCssAttributeToken(token) {
        if (token.isCssAttributeToken === undefined) {
            this._setTokenType(token);
        }
        return token.isCssAttributeToken;
    }
    _isCssPseudoToken(token) {
        if (token.isCssPseudoToken === undefined) {
            this._setTokenType(token);
        }
        return token.isCssPseudoToken;
    }
    _isStringToken(token) {
        if (token.isStringToken === undefined) {
            this._setTokenType(token);
        }
        return token.isStringToken;
    }
    _isTagToken(token) {
        if (token.isTagToken === undefined) {
            this._setTokenType(token);
        }
        return token.isTagToken;
    }
    _addTip(option) {
        let result = null;
        if (this.doneMap[option.value] && !option.skipDone) {
            return;
        }
        if (option.skipMatch) {
            result = {
                indexs: [],
                score: 0,
            };
        } else {
            result = Util.fuzzyMatch(option.word.trim(), option.value, option.fullMatch);
        }
        if (result) {
            let obj = {
                result: option.value,
                word: option.word || '',
                desc: option.desc || '',
                type: option.type || '',
                before: option.before || '',
                after: option.after || '',
                icon: this.getIcon(option.scope),
                indexs: result.indexs,
                score: result.score,
            };
            this.results.push(obj);
            this.doneMap[option.value] = obj;
        } else {
            this.doneMap[option.value] = true;
        }
    }
    _showTip(all) {
        let results = null;
        let limit = all ? 200 : 10;
        this.results.sort((a, b) => {
            return b.score - a.score;
        });
        results = this.results.slice(0, limit);
        this.setAutoTip(results);
    }
    checkEmmetValid(text) {
        let _text = '';
        if (regs.invalidEmmetParen.exec(text)) {
            return false;
        }
        while (text !== (_text = text.replace(regs.paremEmmet, 'a'))) {
            text = _text;
        }
        return !!regs.emmet.exec(text);
    }
    getTokenIndex(cursorPos) {
        let tokens = this.htmls[cursorPos.line - 1].tokens;
        if (tokens) {
            for (let i = 0; i < tokens.length; i++) {
                if (tokens[i].startIndex < cursorPos.column && tokens[i].endIndex >= cursorPos.column) {
                    return i;
                }
            }
        }
        return -1;
    }
    getHtmlData() {
        if (this.htmlData) {
            return this.htmlData;
        } else {
            const htmlData = require(path.join(globalData.dirname, '/data/browsers.html-data'));
            this.htmlData = htmlData;
            return this.htmlData;
        }
    }
    getCssData() {
        if (this.cssData) {
            return this.cssData;
        } else {
            const cssData = require(path.join(globalData.dirname, '/data/browsers.css-data'));
            this.cssData = cssData;
            cssData.propertyMap = {};
            cssData.properties.forEach((item) => {
                cssData.propertyMap[item.name] = item;
            });
            return this.cssData;
        }
    }
    getIcon(scope) {
        return '';
    }
}

export default Autocomplete;
