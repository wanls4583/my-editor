/*
 * @Author: lisong
 * @Date: 2022-03-17 15:20:06
 * @Description: 
 */
import Util from '@/common/Util';
import jsSearcher from '../language/javascript';
const regs = {
    word: /(?:^|\b)[$_a-zA-Z][$_a-zA-Z0-9]*$/
}

export default class {
    constructor(editor, context) {
        this.searcherId = 1;
        this.results = [];
        this.initProperties(editor, context);
        this.initLanguage(editor.language);
    }
    initProperties(editor, context) {
        Util.defineProperties(this, context, ['htmls', 'getAllText']);
        Util.defineProperties(this, editor, ['cursor']);
    }
    initLanguage(language) {
        let that = this;
        if (this.language === language) {
            return;
        }
        this.language = language;
        this.worker && this.worker.terminate();
        this.worker = null;
        // switch (language) {
        //     case 'JavaScript':
        //         this.worker = this.createWorker(jsSearcher);
        //         break;
        // }
        this.worker = this.createWorker(jsSearcher);
        if (!this.worker) {
            return;
        }
        this.worker.onmessage = function (e) {
            let searcherId = e.data.searcherId;
            let results = e.data.results;
            if (that.searcherId != searcherId) {
                return;
            }
            if (results) {
                this.results = this.results.concat(results);
                this.results = this.results.sort((a, b) => {
                    return b.score - a.score;
                }).slice(0, 10);
            }
            console.log(results);
        }
        this.search();
    }
    createWorker(mod) {
        var funStr = mod.toString().replace(/^[^\)]+?\)/, '');
        var str =
            `function fun()${funStr}
            let searcher = fun();
            self.onmessage = function(e) {
                searcher.search(e.data);
            }`;
        return Util.createWorker(str);
    }
    search() {
        if (!this.worker) {
            return;
        }
        this.clearSearch();
        clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => {
            _search.call(this);
        }, 300);

        function _search() {
            let multiCursorPos = this.cursor.multiCursorPos.toArray();
            let preWord = '';
            for (let i = 0; i < multiCursorPos.length; i++) {
                let word = this.getNowWord(multiCursorPos[i]);
                if (!word || preWord && word !== preWord) {
                    return;
                }
                preWord = word;
            }
            let text = this.getAllText();
            this.searcherId++;
            this.worker.postMessage({
                word: preWord,
                text: text,
                searcherId: this.searcherId
            });
        }
    }
    clearSearch() {
        this.searcherId++;
        this.results = [];
        this.worker && this.worker.postMessage({
            cmd: 'stop'
        });
    }
    getNowWord(cursorPos) {
        let text = this.htmls[cursorPos.line - 1].text;
        text = text.slice(0, cursorPos.column);
        text = regs.word.exec(text);
        text = text && text[0];
        return text;
    }
}