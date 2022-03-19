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
        this.wordMap = null;
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
        this.wordMap = {};
        this.word = word;
        this.searcherId = searcherId;
        this.towMap = {};
        for (let i = 0; i < word.length; i++) {
            let cahr = word[i];
            this.wordMap[cahr] = this.wordMap[cahr] ? this.wordMap[cahr] + 1 : 1;
            if (i > 0) {
                this.towMap[word[i - 1] + word[i]] = true;
            }
        }
        this.wordLength = Object.keys(this.wordMap).length;
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
                    if (this.tokenizer.ruleIdMap[states[j]].ruleName === 'js') {
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
                let result = this.match(exec[0]);
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
    match(target) {
        let score = 0;
        let preFinedChar = '';
        let preFinedOriginChar = '';
        let preFinded = false;
        let targetMap = {};
        let count = 0;
        let indexs = [];
        let result = null;
        let _target = target.toLowerCase();
        if (this.word === target) {
            return;
        }
        for (let i = 0; i < target.length; i++) {
            let originChar = target[i];
            let char = _target[i];
            if (this.wordMap[char] &&
                //保证前后字符顺序最多只出现一个位置颠倒且颠倒的两个字符必须相邻
                (
                    !preFinedChar ||
                    this.towMap[preFinedChar + char] ||
                    this.towMap[char + preFinedChar] && preFinded
                )
            ) {
                if (!targetMap[char] || targetMap[char] < this.wordMap[char]) {
                    targetMap[char] = targetMap[char] ? targetMap[char] + 1 : 1;
                    indexs.push(i);
                    if (char === '_' || char === '$') { //检测到连接符+10分
                        score += 10;
                    } else if (preFinded) { //检测到连续匹配
                        score += 5;
                        if (this.towMap[preFinedChar + char]) { //连续匹配且顺序正确
                            score += 1;
                            if (_humpCheck.call(this, preFinedOriginChar, originChar) && preFinded) { //检测到驼峰命名+10分
                                score += 5;
                            }
                        }
                    }
                    if (_complete.call(this, char)) {
                        return result;
                    }
                    if (!this.towMap[char + preFinedChar]) {
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
                if (!count && score > -9) { //检测到前三个首字符不匹配-3分
                    score -= 3;
                } else { //检测到字符不匹配-1分
                    score--;
                }
                preFinded = char === preFinedChar;
            }
        }

        // 检查驼峰命名
        function _humpCheck(preChar, char) {
            let preCode = preChar.charCodeAt(0);
            let charCode = char.charCodeAt(0);
            if (preCode < 97 && charCode >= 97 ||
                charCode < 97 && preCode >= 97) {
                return true;
            }
            return false;
        }

        // 检查是否匹配完成
        function _complete(char) {
            if (targetMap[char] === this.wordMap[char]) {
                if (++count === this.wordLength) {
                    result = {
                        score: score,
                        indexs: indexs
                    };
                    return true;
                }
            }
        }
    }
}

export default Searcher;