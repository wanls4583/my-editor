/*
 * @Author: lisong
 * @Date: 2022-03-17 15:29:26
 * @Description:
 */
import Util from '@/common/Util';
import HtmlData from '@/data/browsers.html-data';

const tagMap = {};
HtmlData.tags.forEach((item) => {
    tagMap[item.name] = true;
});

const iconMap = {
    'entity.name.function.js': 'icon-function',
    'entity.name.class.js': 'icon-class',
    'support.function.js': 'icon-function',
    'support.class.js': 'icon-class',
    'support.type.property-name.css': 'icon-property',
    'support.type.property-value.css': 'icon-value',
    'entity.other.attribute-name.html': 'icon-property',
    'entity.name.tag.html': 'icon-property',
    'emmet-html': 'icon-property',
};

const regs = {
    word: /^[a-zA-Z][a-zA-Z0-9]*$/,
    emmet: /^[a-zA-Z][a-zA-Z0-9\-]*(?:[\.\#][^\.\#\>\<\+\*\(\)]*)*(?:\*\d+)?(?:[\>\+][a-zA-Z][a-zA-Z0-9\-]*(?:[\.\#][^\.\#\>\<\+\*\(\)]*)*(?:\*\d+)?)*$/,
    paremEmmet: /\([a-zA-Z][a-zA-Z0-9\-]*(?:[\.\#][^\.\#\>\<\+\*\(\)]*)*(?:\*\d+)?(?:[\>\+][a-zA-Z][a-zA-Z0-9\-]*(?:[\.\#][^\.\#\>\<\+\*\(\)]*)*(?:\*\d+)?)*\)/g,
    invalidEmmetParen: /\)\>/,
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
        let word = nowToken && this.htmls[this.nowCursorPos.line - 1].text.slice(nowToken.startIndex, nowToken.endIndex);
        this.reset();
        //当前token为单词
        if (this.wordPattern.test(word) && word) {
            this._searchWord(word);
        } else {
            this.setAutoTip(null);
        }
    }
    _searchWord(word) {
        let line = this.currentLine;
        let startTime = Date.now();
        let processedLines = 0;
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
                    this._addTip({ word: word, value: text });
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
                this._searchWord(word);
            });
        }
    }
    _addTip(option) {
        if (this.doneMap[option.value]) {
            return;
        }
        let result = null;
        if (option.skipMatch) {
            result = {
                indexs: [],
                score: 0,
            };
        } else {
            result = Util.fuzzyMatch(option.word, option.value);
        }
        if (result) {
            let obj = {
                result: option.value,
                word: option.word || '',
                desc: option.desc || '',
                type: option.type,
                icon: iconMap[option.type] || '',
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
}

export default Autocomplete;
