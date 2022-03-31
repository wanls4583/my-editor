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
}

const regs = {
    word: /^[a-zA-Z][a-zA-Z0-9]*$/,
    emmetChar: /\w/,
    emmetWord: /[^\s]+$/,
    emmet: /^[a-zA-Z][a-zA-Z0-9\-]*(?:[\.\#][^\.\#\>\<\+\*\(\)]*)*(?:\*\d+)?(?:[\>\+][a-zA-Z][a-zA-Z0-9\-]*(?:[\.\#][^\.\#\>\<\+\*\(\)]*)*(?:\*\d+)?)*$/,
    paremEmmet: /\([a-zA-Z][a-zA-Z0-9\-]*(?:[\.\#][^\.\#\>\<\+\*\(\)]*)*(?:\*\d+)?(?:[\>\+][a-zA-Z][a-zA-Z0-9\-]*(?:[\.\#][^\.\#\>\<\+\*\(\)]*)*(?:\*\d+)?)*\)/g,
    invalidEmmetParen: /\)\>/,
}

class Autocomplete {
    constructor(editor, context) {
        this.searcherId = 0;
        this.initProperties(editor, context);
    }
    initProperties(editor, context) {
        Util.defineProperties(this, editor, ['language', 'cursor', 'tokenizer', 'setAutoTip']);
        Util.defineProperties(this, context, ['htmls']);
    }
    reset() {
        this.startTime = Date.now();
        this.nowIndex = 0;
        this.preResults = [];
        this.searcherId++;
    }
    stop() {
        clearTimeout(this.timer);
    }
    search() {
        this.stop();
        this.reset();
        this.searchTimer = setTimeout(() => {
            this._search(this.searcherId);
        });
    }
    _search(searcherId) {
        let results = [];
        let count = 0;
        let startTime = Date.now();
        let doneMap = {};
        let nowRule = null;
        this.cursorPos = this.cursor.multiCursorPos.toArray()[0];
        let nowToken = this.getAutoToken();
        this.setAutoTip(null);
        if (!nowToken) {
            nowRule = this.tokenizer.ruleIdMap[1];
            nowToken = this.getToken(this.cursorPos);
            if (nowToken && !nowToken.ruleId) {
                if (nowRule.autoChild) {
                    _findInList.call(this, nowRule.autoChild);
                } else if (this.language === 'HTML') { //emmet语法
                    let emmetExpr = this.getEmmetExpr(nowToken);
                    if (emmetExpr) {
                        _addTip({
                            word: emmetExpr.word,
                            value: emmetExpr.word,
                            type: 'emmet-html',
                            skipMatch: true,
                            lookahead: emmetExpr.lookahead
                        });
                        _showTip.call(this);
                    }
                }
            }
            return;
        }
        nowRule = this.tokenizer.ruleIdMap[nowToken.ruleId];
        if (!nowRule) {
            let parentRule = this.tokenizer.ruleIdMap[nowToken.state];
            _findInList.call(this, parentRule.autoChild);
            return;
        }
        if (nowRule.auto instanceof Array) {
            _findInList.call(this, nowRule.auto);
            return;
        }
        if (nowRule.autoByPre) {
            let list = this.getPreAutoList(nowToken) || {};
            list && _findInList.call(this, list);
            return;
        }
        if (nowRule.autoHintPre) {
            let list = this.getPreAutoList(nowToken) || {};
            list.forEach((item) => {
                _addTip({
                    value: item.value,
                    type: item.type,
                    skipMatch: true
                });
            });
            _showTip.call(this, true);
            return;
        }
        _findInToken.call(this);

        function _findInList(list) {
            for (let i = this.nowIndex; i < list.length; i++) {
                let item = list[i];
                _addTip({
                    word: nowToken.value.slice(0, this.cursorPos.column - nowToken.column),
                    value: item.value,
                    type: item.type
                });
                if (++count % 100 == 0 && Date.now() - startTime > 20) {
                    this.searchTimer = setTimeout(() => {
                        this.nowIndex = i + 1;
                        _findInList.call(this, list);
                    });
                    break;
                }
            }
            _showTip.call(this);
        }

        function _findInToken() {
            for (let i = this.nowIndex; i < this.htmls.length; i++) {
                let lineObj = this.htmls[i];
                let tokens = lineObj.tokens || [];
                if (lineObj.text.length > 10000) { //大于10000个字符，跳过该行
                    continue;
                }
                tokens.forEach((item) => {
                    let rule = this.tokenizer.ruleIdMap[item.ruleId];
                    if (rule && rule.auto === nowRule.auto) {
                        _addTip({
                            word: nowToken.value.slice(0, this.cursorPos.column - nowToken.column),
                            value: item.value,
                            type: item.type
                        });
                    }
                });
                if (++count % 100 == 0 && Date.now() - startTime > 20) {
                    this.searchTimer = setTimeout(() => {
                        this.nowIndex = i + 1;
                        _findInToken.call(this);
                    });
                    break;
                }
            }
            _showTip.call(this);
        }

        function _addTip(option) {
            if (doneMap[option.value]) {
                if (typeof doneMap[option.value] === 'object') {
                    doneMap[option.value].icon = doneMap[option.value].icon || iconMap[option.type];
                }
            } else {
                let result = null;
                if (option.skipMatch) {
                    result = {
                        indexs: [],
                        score: 0
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
                        lookahead: option.lookahead
                    };
                    results.push(obj);
                    doneMap[option.value] = obj;
                } else {
                    doneMap[option.value] = true;
                }
            }
        }

        function _showTip(all) {
            if (searcherId === this.searcherId) {
                results = results.concat(this.preResults);
                if (!all) {
                    results = results.sort((a, b) => {
                        return b.score - a.score;
                    }).slice(0, 10);
                }
                this.setAutoTip(results);
                this.preResults = results;
            }
        }
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
    getPreAutoList(token) {
        let tokens = this.htmls[this.cursorPos.line - 1].tokens;
        let rule = this.tokenizer.ruleIdMap[token.ruleId];
        if (tokens) {
            for (let i = tokens.length - 1; i >= 0; i--) {
                let _token = tokens[i];
                let _rule = this.tokenizer.ruleIdMap[_token.ruleId];
                if (_rule && _rule.autoByMap && (_rule.autoName === rule.autoByPre || _rule.autoName === rule.autoHintPre)) {
                    return _rule.autoByMap[_token.value];
                }
            }
        }
        return null;
    }
    getAutoToken() {
        let token = this.getToken(this.cursorPos);
        let rule = token && token.ruleId && this.tokenizer.ruleIdMap[token.ruleId];
        let auto = rule && (rule.auto || rule.autoByPre || rule.autoHintPre);
        if (!rule && token && token.state) {
            rule = this.tokenizer.ruleIdMap[token.state];
            auto = rule.autoChild;
        }
        if (!token || !auto) {
            return null;
        }
        return token;
    }
    getToken(cursorPos) {
        let tokens = this.htmls[cursorPos.line - 1].tokens;
        let token = null;
        if (tokens) {
            for (let i = 0; i < tokens.length; i++) {
                if (tokens[i].column < cursorPos.column &&
                    tokens[i].column + tokens[i].value.length >= cursorPos.column) {
                    token = tokens[i];
                    break;
                }
            }
        }
        return token;
    }
    getEmmetExpr(token) {
        let line = this.cursorPos.line;
        let column = this.cursorPos.column;
        let text = this.htmls[line - 1].text;
        if (text[column - 1] === ')' || (!column || text[column - 1].match(/\w/)) &&
            (column === text.length || !text[column].match(regs.emmetChar))) { //当前光标位置必须处于单词边界
            let word = text.slice(token.column, column).match(regs.emmetWord);
            let lookahead = 0;
            while (word && !this.checkEmmetValid(word[0]) && text[column] === ')') {
                column++;
                lookahead++;
                word = text.slice(token.column, column).match(regs.emmetWord);
            }
            if (word && this.checkEmmetValid(word[0])) {
                word = word[0];
                if (regs.word.test(word)) { //单个单词，判断是否为html标签名
                    if (!tagMap[word]) {
                        return null;
                    }
                }
                return {
                    word: word,
                    lookahead: lookahead
                };
            }
        }
        return null;
    }
}

export default Autocomplete;