import {
    rules,
    pairRules
} from '../javascript/rules';

import Util from '../../common/util';

class Highlight {
    constructor(editor) {
        this.editor = editor;
    }

    run() {
        this.nowLine = this.editor.startLine - this.editor.maxLine;
        this.nowLine = this.nowLine < 0 ? 1 : this.nowLine;
        this.endLine = this.editor.startLine + this.editor.maxLine;
        this.endLine = this.endLine > this.editor.htmls.length ? this.editor.htmls.length : this.endLine;
        clearTimeout(this.timer);
        this._run();
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
            if (!lineObj.highlight.done) {
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
                lineObj.highlight.done = true;
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

    buildHtml(tokens, text) {
        let result = [],
            nowToken = null,
            html = '',
            i = 0,
            preEnd = 0;
        tokens.sort((a, b) => {
            return b.level == a.level ? a.start - b.start : b.level - a.level
        });
        while (i < tokens.length) {
            nowToken = tokens[i];
            result.push(nowToken);
            // 去除重叠的无效token
            while (i + 1 < tokens.length && nowToken.level >= tokens[i + 1].level && nowToken.end > tokens[i + 1].start) {
                i++;
            }
            i++;
        }
        result.sort((a, b) => {
            return a.start - b.start;
        });
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