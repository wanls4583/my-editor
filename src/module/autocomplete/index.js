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
        let nowToken = this.getToken(this.nowCursorPos);
        let word = nowToken && this.htmls[this.nowCursorPos.line - 1].text.slice(nowToken.startIndex, this.nowCursorPos.column);
        this.reset();
        this.setAutoTip(null);
        if (!word) {
            return;
        }
        if (this._isTextToken(nowToken)) {
            let scope = nowToken.scopes.peek();
            if (scope.startsWith('text.')) {
                //emmet表达式
                this._searchEmmet(word, nowToken);
            } else if (scope.startsWith('entity.name.tag')) {
                //标签名
                this._searchTag(word, nowToken);
            }
        } else if (this._isSourceToken(nowToken)) {
            if (this.wordPattern.test(word)) {
                this._searchWord(word, nowToken);
            }
        }
    }
    _searchWord(word, nowToken) {
        let line = this.currentLine;
        let startTime = Date.now();
        let processedLines = 0;
        let scope = nowToken.scopes.peek();
        while (line <= this.htmls.length) {
            let lineObj = this.htmls[line - 1];
            let tokens = lineObj.tokens;
            line++;
            if (!tokens) {
                continue;
            }
            tokens.forEach((token) => {
                let text = lineObj.text.slice(token.startIndex, token.endIndex);
                if (this.wordPattern.test(text)) {
                    // 跳过标签和字符串
                    if (this._isTextToken(token) || this._isStringToken(token)) {
                        return;
                    }
                    this._addTip({ word: word, value: text, scope: scope });
                }
            });
            processedLines++;
            // 避免卡顿
            if (processedLines % 5 == 0 && Date.now() - startTime >= 20) {
                break;
            }
        }
        this.currentLine = line;
        this._showTip();
        if (line <= this.htmls.length) {
            this.searchTimer = requestIdleCallback(() => {
                this._searchWord(word, nowToken);
            });
        }
    }
    _searchTag(word, nowToken) {
        const htmlData = this.getHtmlData();
        const scope = nowToken.scopes.peek();
        htmlData.tags.forEach((item) => {
            this._addTip({ word: word, value: item.name, scope: scope });
        });
        if (!this.results.length) {
            this._addTip({ word: word, value: word, scope: scope, skipMatch: true });
        }
        this._showTip();
    }
    _searchEmmet(word, nowToken) {
        const emmetObj = extract(word);
        const scope = nowToken.scopes.peek();
        if (emmetObj && emmetObj.abbreviation) {
            let abbreviation = emmetObj.abbreviation;
            let lastChar = abbreviation[abbreviation.length-1];
            if(lastChar === '+' || lastChar === '/') {
                return;
            }
            this._addTip({ word: abbreviation, value: abbreviation, scope: scope, skipMatch: true });
            this._showTip();
        }
    }
    _setTokenType(token) {
        for (let i = token.scopes.length - 1; i >= 0; i--) {
            if (token.scopes[i].startsWith('source.')) {
                token.isSourceToken = true;
                break;
            } else if (token.scopes[i].startsWith('text.')) {
                token.isTextToken = true;
                break;
            } else if (!token.isStringToken && regs.stringToken.test(token.scopes[i])) {
                token.isStringToken = true;
            }
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
    _isStringToken(token) {
        if (token.isStringToken === undefined) {
            this._setTokenType(token);
        }
        return token.isStringToken;
    }
    _addTip(option) {
        let result = null;
        if (option.skipMatch) {
            result = {
                indexs: [],
                score: 100,
            };
        } else {
            if (this.doneMap[option.value]) {
                return;
            }
            result = Util.fuzzyMatch(option.word, option.value);
        }
        if (result) {
            let obj = {
                result: option.value,
                word: option.word || '',
                desc: option.desc || '',
                scope: option.scope,
                icon: this.getIcon(option.scope),
                indexs: result.indexs,
                score: result.score,
                lookahead: option.lookahead,
            };
            this.results.push(obj);
            this.doneMap[option.value] = obj;
        } else {
            this.doneMap[option.value] = true;
        }
    }
    _showTip(all) {
        let results = null;
        this.results.sort((a, b) => {
            return b.score - a.score;
        });
        results = all ? this.results : this.results.slice(0, 10);
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
    getToken(cursorPos) {
        let tokens = this.htmls[cursorPos.line - 1].tokens;
        let token = null;
        if (tokens) {
            for (let i = 0; i < tokens.length; i++) {
                if (tokens[i].startIndex < cursorPos.column && tokens[i].endIndex >= cursorPos.column) {
                    token = tokens[i];
                    break;
                }
            }
        }
        return token;
    }
    getEmmetExpr(token) {
        let line = this.nowCursorPos.line;
        let column = this.nowCursorPos.column;
        let text = this.htmls[line - 1].text;
        return null;
    }
    getHtmlData() {
        if (this.htmlData) {
            return this.htmlData;
        } else {
            const htmlData = require(path.join(globalData.dirname, '/data/browsers.html-data'));
            const tagMap = {};
            htmlData.tags.forEach((item) => {
                tagMap[item.name] = true;
            });
            htmlData.tagMap = tagMap;
            this.htmlData = htmlData;
            return this.htmlData;
        }
    }
    getIcon(scope) {
        return '';
    }
}

export default Autocomplete;
