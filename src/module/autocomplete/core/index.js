/*
 * @Author: lisong
 * @Date: 2022-03-17 15:29:26
 * @Description: 
 */
import Util from '@/common/Util';

const iconMap = {
    'entity.name.function.js': 'icon-function',
    'entity.name.class.js': 'icon-class',
    'support.function.js': 'icon-function',
    'support.class.js': 'icon-class',
    'support.type.property-name.css': 'icon-property',
    'support.type.property-value.css': 'icon-value',
    'entity.other.attribute-name.html': 'icon-property',
    'entity.name.tag.html': 'icon-property',
}

class Autocomplete {
    constructor(editor, context) {
        this.searcherId = 0;
        this.initProperties(editor, context);
    }
    initProperties(editor, context) {
        Util.defineProperties(this, editor, ['language', 'cursor', 'tokenizer', 'autocomplete', 'setAutoTip']);
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
        let nowToken = this.getNowToken();
        let nowRule = null;
        if (!nowToken) {
            this.setAutoTip(null);
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
                _addTip('', item.value, item.type, true);
            });
            _showTip.call(this, true);
            return;
        }
        _findInToken.call(this);

        function _findInList(list) {
            for (let i = this.nowIndex; i < list.length; i++) {
                let item = list[i];
                _addTip(nowToken.value, item.value, item.type);
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
                        _addTip(nowToken.value, item.value, item.type);
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

        function _addTip(word, value, type, skip, lookahead) {
            if (doneMap[value]) {
                if (typeof doneMap[value] === 'object') {
                    doneMap[value].icon = doneMap[value].icon || iconMap[type];
                }
            } else {
                let result = null;
                if (skip) {
                    result = {
                        indexs: [],
                        score: 0
                    };
                } else {
                    result = Util.fuzzyMatch(word, value);
                }
                if (result) {
                    let obj = {
                        result: value,
                        word: word,
                        type: type,
                        icon: iconMap[type] || '',
                        indexs: result.indexs,
                        score: result.score,
                        lookahead: lookahead
                    };
                    results.push(obj);
                    doneMap[value] = obj;
                } else {
                    doneMap[value] = true;
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
    getPreAutoList(token) {
        let multiCursorPos = this.cursor.multiCursorPos.toArray();
        let tokens = this.htmls[multiCursorPos[0].line - 1].tokens;
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
    getNowToken() {
        let preToken = null;
        let multiCursorPos = this.cursor.multiCursorPos.toArray();
        for (let i = 0; i < multiCursorPos.length; i++) {
            let hasAuto = false;
            let cursorPos = multiCursorPos[i];
            let token = _getToken.call(this, cursorPos);
            let rule = token && token.ruleId && this.tokenizer.ruleIdMap[token.ruleId];
            let auto = rule && (rule.auto || rule.autoByPre || rule.autoHintPre);
            if (!rule && token && token.state) {
                rule = this.tokenizer.ruleIdMap[token.state];
                auto = rule.autoChild;
            }
            if (token && auto && (!preToken || (token.value === preToken.value && token.type === preToken.type))) {
                hasAuto = true;
            }
            if (!hasAuto) {
                return null;
            }
            preToken = token;
        }
        return preToken;

        function _getToken(cursorPos) {
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
    }
}

export default Autocomplete;