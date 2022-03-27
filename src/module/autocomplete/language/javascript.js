/*
 * @Author: lisong
 * @Date: 2022-03-17 15:29:26
 * @Description: 
 */
import Util from '@/common/Util';

const regs = {
    word: /(?:^|\b)[$_a-zA-Z][$_a-zA-Z0-9]*(?:$|\b)/mg
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
        let exec = null;
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
                _run.call(this, lineObj.text);
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

        function _run(text) {
            while (exec = regs.word.exec(text)) {
                let result = Util.fuzzyMatch(this.word, exec[0]);
                if (!doneMap[exec[0]]) {
                    if (result) {
                        results.push({
                            result: exec[0],
                            indexs: result.indexs,
                            score: result.score
                        });
                    }
                    doneMap[exec[0]] = true;
                }
            }
            regs.word.lastIndex = 0;
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