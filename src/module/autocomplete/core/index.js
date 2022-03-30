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
    clearSearch() {
        this.stop();
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
        for (let i = this.nowIndex; i < this.htmls.length; i++) {
            let lineObj = this.htmls[i];
            if (lineObj.text.length < 10000) { //大于10000个字符，跳过该行
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
            tokens.forEach((item) => {
                let rule = this.tokenizer.ruleIdMap[item.ruleId];
                if (rule && rule.auto === nowRule.auto) {
                    if (doneMap[item.value]) {
                        if (typeof doneMap[item.value] === 'object') {
                            doneMap[item.value].icon = doneMap[item.value].icon || iconMap[item.type];
                        }
                    } else {
                        let result = Util.fuzzyMatch(nowToken.value, item.value);
                        if (result) {
                            let obj = {
                                result: item.value,
                                word: nowToken.value,
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

        function _send() {
            if (searcherId === this.searcherId) {
                results = results.concat(this.preResults);
                results = results.sort((a, b) => {
                    return b.score - a.score;
                }).slice(0, 10);
                this.setAutoTip(results);
                this.preResults = results;
            }
        }
    }
    getNowToken() {
        let preToken = null;
        let preRule = null;
        let multiCursorPos = this.cursor.multiCursorPos.toArray();
        for (let i = 0; i < multiCursorPos.length; i++) {
            let cursorPos = multiCursorPos[i];
            let token = _getToken.call(this, cursorPos);
            let rule = token && token.ruleId && this.tokenizer.ruleIdMap[token.ruleId];
            if (!token || !rule || !rule.auto ||
                // preRule && (preRule.auto !== rule.auto || preRule.ruleId !== rule.ruleId) ||
                preToken && (token.value !== preToken.value || token.type !== preToken.type)) {
                return null;
            }
            preToken = token;
            preRule = rule;
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