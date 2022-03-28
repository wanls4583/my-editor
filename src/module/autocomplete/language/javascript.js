/*
 * @Author: lisong
 * @Date: 2022-03-17 15:29:26
 * @Description: 
 */
import Util from '@/common/Util';

const variableMap = {
    'entity.name.function.js': true,
    'entity.name.class.js': true,
    'variable.function.js': true,
    'variable.class.js': true,
    'variable.parameter.js': true,
    'variable.language.js': true,
    'variable.other.js': true,
    'support.function.js': true,
    'support.class.js': true,
    'support.constant.js': true,
    'constant.language.js': true,
}

const iconMap = {
    'entity.name.function.js': 'icon-function',
    'entity.name.class.js': 'icon-class',
    'support.function.js': 'icon-function',
    'support.class.js': 'icon-class',
}

class Searcher {
    constructor(editor, context) {
        this.searcherId = null;
        this.initProperties(editor, context);
    }
    initProperties(editor, context) {
        Util.defineProperties(this, editor, ['language', 'tokenizer', 'autocomplete', 'setAutoTip']);
        Util.defineProperties(this, context, ['htmls']);
    }
    reset(word, searcherId) {
        this.startTime = Date.now();
        this.nowIndex = 0;
        this.preResults = [];
        this.word = word;
        this.searcherId = searcherId;
    }
    stop() {
        clearTimeout(this.timer);
    }
    search(option) {
        clearTimeout(this.searchTimer);
        this.reset(option.word, option.searcherId);
        this._search();
    }
    _search() {
        let results = [];
        let count = 0;
        let startTime = Date.now();
        let doneMap = {};
        for (let i = this.nowIndex; i < this.htmls.length; i++) {
            let pass = this.language === 'JavaScript';
            let lineObj = this.htmls[i];
            let states = lineObj.states;
            if (!pass && states) {
                for (let j = 0; j < states.length; j++) {
                    if (this.tokenizer.ruleIdMap[states[j]].name === 'JavaScript') {
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
            tokens.forEach((item) => {
                if (variableMap[item.type]) {
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
            if (this.autocomplete.searcherId === this.searcherId) {
                results = results.concat(this.preResults);
                results = results.sort((a, b) => {
                    return b.score - a.score;
                }).slice(0, 10);
                this.setAutoTip(results);
                this.preResults = results;
            }
        }
    }
}

export default Searcher;