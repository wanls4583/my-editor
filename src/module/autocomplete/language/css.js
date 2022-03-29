/*
 * @Author: lisong
 * @Date: 2022-03-17 15:29:26
 * @Description: 
 */
import Util from '@/common/Util';
import CssData from '@/data/browsers.css-data.js';

const wordReg = /[^\s\;\,\:\{\}\+\*\~]+$/;

const selectorMap = {
    'entity.name.tag.css': true,
    'entity.other.attribute-name.id.css': true,
    'entity.other.attribute-name.class.css': true,
    'entity.other.attribute-name.pseudo-element.css': true,
}

const iconMap = {}

class Searcher {
    constructor(editor, context) {
        this.searcherId = null;
        this.initProperties(editor, context);
        this.initCssData();
    }
    initProperties(editor, context) {
        Util.defineProperties(this, editor, ['language', 'cursor', 'tokenizer', 'autocomplete', 'setAutoTip']);
        Util.defineProperties(this, context, ['htmls']);
    }
    initCssData() {
        this.properties = [];
        this.propertyMap = {};
        CssData.properties.forEach((item) => {
            this.properties.push(item.name);
            this.propertyMap[item.name] = item;
        });
    }
    reset(searcherId) {
        this.startTime = Date.now();
        this.nowIndex = 0;
        this.preResults = [];
        this.word = this.getNowWord();
        this.searcherId = searcherId;
    }
    stop() {
        clearTimeout(this.timer);
    }
    search(option) {
        clearTimeout(this.searchTimer);
        this.reset(option.searcherId);
        this._search();
    }
    _search() {
        let results = [];
        let count = 0;
        let startTime = Date.now();
        let doneMap = {};
        let nowToken = _getType.call(this);
        if (nowToken.type === 'value') {
            _findValue.call(this);
            _send.call(this);
            return;
        }
        if (!this.word) { //单词为空直接返回
            return;
        }
        if (nowToken.type === 'property') {
            _findProperty.call(this);
            _send.call(this);
            return;
        }
        for (let i = this.nowIndex; i < this.htmls.length; i++) {
            let pass = this.language === 'CSS';
            let lineObj = this.htmls[i];
            let states = lineObj.states;
            if (!pass && states) {
                for (let j = 0; j < states.length; j++) {
                    if (this.tokenizer.tokenizer.ruleIdMap[sate][states[j]].name === 'CSS') {
                        pass = true;
                        break;
                    }
                }
            }
            if (pass && lineObj.text.length < 10000) { //大于10000个字符，跳过该行
                _run.call(this, lineObj.tokens || []);
            }
            if (++count % 100 == 0 && Date.now() - startTime > 20) {
                this.searchTimer = setTimeout(() => {
                    this.nowIndex = i + 1;
                    this._search();
                });
                break;
            }
        }
        _send.call(this);

        function _run(tokens) {
            _findSelector.call(this, tokens);
        }

        function _findSelector(tokens) {
            tokens.forEach((item) => {
                if (selectorMap[item.type]) {
                    if (doneMap[item.value]) {
                        if (typeof doneMap[item.value] === 'object') {
                            doneMap[item.value].icon = doneMap[item.value].icon || iconMap[item.type];
                        }
                    } else {
                        let value = item.value.replace(/\s/g, '');
                        let result = Util.fuzzyMatch(this.word, value);
                        if (result) {
                            let obj = {
                                result: value,
                                word: this.word,
                                type: item.type,
                                icon: iconMap[item.type] || '',
                                indexs: result.indexs,
                                score: result.score
                            };
                            results.push(obj);
                            doneMap[item.value] = obj;
                        } else {
                            doneMap[item.value] = true;
                        }
                    }
                }
            });
        }

        function _findProperty() {
            this.properties.forEach((item) => {
                let result = Util.fuzzyMatch(this.word, item);
                if (result) {
                    let obj = {
                        result: item,
                        word: this.word,
                        type: 'property-name.css',
                        icon: 'icon-property',
                        indexs: result.indexs,
                        score: result.score
                    };
                    results.push(obj);
                }
            });
        }

        function _findValue() {
            let property = nowToken.property;
            if (this.propertyMap[property] && this.propertyMap[property].values) {
                if (this.word) {
                    this.propertyMap[property].values.forEach((item) => {
                        let result = Util.fuzzyMatch(this.word, item.name);
                        if (result) {
                            let obj = {
                                result: item.name,
                                word: this.word,
                                type: 'property-value.css',
                                icon: 'icon-value',
                                indexs: result.indexs,
                                score: result.score
                            };
                            results.push(obj);
                        }
                    });
                } else { //单词为空，列出所有可选值
                    this.propertyMap[property].values.forEach((item) => {
                        results.push({
                            result: item.name,
                            word: '',
                            type: 'property-value.css',
                            icon: 'icon-value',
                            indexs: [],
                            score: 0
                        });
                    });
                }
            }
        }

        function _send() {
            if (this.autocomplete.searcherId === this.searcherId) {
                results = results.concat(this.preResults);
                results = results.sort((a, b) => {
                    return b.score - a.score;
                }).slice(0, 10);
                this.setAutoTip(results);
                this.preResults = results;
            }
        }

        function _getType() {
            let line = this.cursorPos.line;
            while (line >= 1) {
                let tokens = this.htmls[line - 1].tokens;
                if (tokens) {
                    for (let i = tokens.length - 1; i >= 0; i--) {
                        if (line < this.cursorPos.line || tokens[i].column < this.cursorPos.column) {
                            if (tokens[i].type === 'punctuation.separator.key-value.css') {
                                if (line < this.cursorPos.line) {
                                    return {
                                        type: 'property'
                                    };
                                } else {
                                    let property = '';
                                    if (i > 0) {
                                        property = tokens[i - 1].value;
                                    } else {
                                        while (line >= 1) {
                                            tokens = this.htmls[line - 1].tokens;
                                            if (tokens && tokens.length) {
                                                property = tokens.peek().value;
                                            }
                                        }
                                    }
                                    return {
                                        type: 'value',
                                        property: property
                                    };
                                }
                            } else if (tokens[i].type === 'punctuation.braces.open.css' ||
                                tokens[i].type === 'punctuation.terminator.rule.css') {
                                return {
                                    type: 'property'
                                };
                            } else if (tokens[i].type === 'punctuation.braces.close.css') {
                                return {
                                    type: 'selector'
                                };
                            }
                        }
                    }
                }
                line--;
            }
            return 'selector';
        }
    }
    getNowWord() {
        let preWord = '';
        let multiCursorPos = this.cursor.multiCursorPos.toArray();
        this.cursorPos = multiCursorPos[0];
        for (let i = 0; i < multiCursorPos.length; i++) {
            let word = _getWord.call(this, multiCursorPos[i]);
            if (!word || preWord && word !== preWord) {
                this.word = '';
                this.setAutoTip(null);
                return;
            }
            preWord = word;
        }
        return preWord;

        function _getWord(cursorPos) {
            let text = this.htmls[cursorPos.line - 1].text;
            text = text.slice(0, cursorPos.column);
            text = wordReg.exec(text);
            text = text && text[0];
            return text;
        }
    }
}

export default Searcher;