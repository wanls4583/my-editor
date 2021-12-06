import {
    rules,
    pairRules
} from '../javascript/rules';

import Util from '../../common/util';
import PairWorker from './worker';

class Highlight {
    constructor(editor) {
        this.editor = editor;
        this.worker = Util.createWorker(PairWorker);
        this.worker.onmessage = (e) => {
            let result = e.data;
            result.map((item) => {
                let lineObj = this.editor.htmls[item.index];
                lineObj.tokens = lineObj.done ? lineObj.tokens : item.tokens;
                lineObj.pairTokens = item.pairTokens;
            });
            console.log(result);
        }
    }

    run() {
        this.nowLine = this.editor.startLine - this.editor.maxLine;
        this.nowLine = this.nowLine < 0 ? 1 : this.nowLine;
        this.endLine = this.editor.startLine + this.editor.maxLine;
        this.endLine = this.endLine > this.editor.htmls.length ? this.editor.htmls.length : this.endLine;
        clearTimeout(this.timer);
        this._run();
        this._pairRun();
    }

    _run() {
        let count = 0,
            text = '',
            tokens = null,
            result = null,
            lineObj = null;
        while (count < 500 && this.nowLine <= this.endLine) {
            lineObj = this.editor.htmls[this.nowLine - 1];
            tokens = [];
            if (!lineObj.highlight.tokens) {
                text = lineObj.text;
                text && rules.map((rule) => {
                    while (result = rule.reg.exec(lineObj.text)) {
                        tokens.push({
                            token: rule.token,
                            value: result[0],
                            level: rule.level,
                            start: result.index,
                            end: result.index + result[0].length
                        });
                    }
                    rule.reg.lastIndex = 0;
                });
                lineObj.highlight.tokens = tokens;
            } else {
                tokens = lineObj.highlight.tokens;
            }
            if (tokens.length && !lineObj.highlight.rendered && this.nowLine >= this.editor.startLine && this.nowLine <= this.editor.startLine + this.editor.maxLine) {
                lineObj.html = this.buildHtml(tokens.concat([]), lineObj.text);
                lineObj.highlight.rendered = false;
            }
            count++;
            this.nowLine++;
        }
        if (this.nowLine <= this.endLine) {
            this.timer = setTimeout(() => {
                this._run();
            }, 500);
        }
    }

    _pairRun() {
        var texts = [];
        for (var i = 0; i < this.editor.htmls.length; i++) {
            if (!this.editor.htmls[i].pairTokens) {
                texts.push({
                    index: i,
                    text: this.editor.htmls[i].text
                });
            }
        }
        this.worker.postMessage({
            type: 'run',
            texts: texts,
            rules: rules,
            pairRules: pairRules
        });
    }

    buildHtml(tokens, text) {
        let result = [],
            nowToken = null,
            html = '',
            i = 0,
            preEnd = 0;
        tokens.sort((a, b) => {
            return a.start - b.start;
        });
        while (i < tokens.length) {
            nowToken = tokens[i];
            if (result.length && result[result.length - 1].end > nowToken.start) {
                if (nowToken.level > result[result.length - 1].level) {
                    result.pop();
                    result.push(nowToken);
                }
            } else {
                result.push(nowToken);
            }
            i++;
        }
        result.map((token) => {
            html += Util.htmlTrans(text.substring(preEnd, token.start));
            html += `<span class="${token.token}">${Util.htmlTrans(text.substring(token.start, token.end))}</span>`;
            preEnd = token.end;
        });
        html += Util.htmlTrans(text.slice(preEnd));
        return html;
    }
}

export default Highlight;