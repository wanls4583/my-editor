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
        this.parsePairLine = 1;
        this.pairTokensMap = {};
        this.pairRules = []; // 传入worker的数据不能克隆函数
        this.pairRules.map((item) => {
            delete item.check;
        });
        pairRules.map((item) => {
            this.pairTokensMap[item.token] = item;
            item = Object.assign({}, item);
            delete item.check;
            this.pairRules.push(item);
        });
        this.worker.onmessage = (e) => {
            let result = e.data;
            result.map((item) => {
                let lineObj = this.editor.uuidMap.get(item.uuid);
                if (lineObj) {
                    lineObj.highlight.tokens = lineObj.highlight.tokens || item.tokens;
                    lineObj.highlight.pairTokens = lineObj.highlight.pairTokens || item.pairTokens;
                }
            });
            this.startToken = null; // 原始开始节点
            this._startToken = null; // 处理过的开始节点
            this.startLine = -1; // 开始节点的行号
            // 寻找开始节点
            if (this.parsePairLine > 1) {
                for (let i = this.parsePairLine - 1; i >= 1; i--) {
                    let highlight = this.editor.htmls[i - 1].highlight;
                    // 前面最接近的已处理过的开始节点
                    if (highlight.validPairTokens.length) {
                        let startToken = highlight.validPairTokens[highlight.validPairTokens.length - 1];
                        if (!startToken.startToken) {
                            this._startToken = startToken;
                            this.startLine = startToken.line;
                            let pairTokens = highlight.pairTokens;
                            // 寻找对应的原始节点
                            for (i = 0; i < pairTokens.length; i++) {
                                if (pairTokens[i].start == startToken.start && pairTokens[i].token == startToken.token) {
                                    this.startToken = pairTokens[i];
                                    break;
                                }
                            }
                        }
                        break;
                    }
                }
            }
            this.parsePair();
        }
    }

    run() {
        this.nowLine = this.editor.startLine - this.editor.maxLine;
        this.nowLine = this.nowLine <= 0 ? 1 : this.nowLine;
        this.endLine = this.editor.startLine + this.editor.maxLine;
        this.endLine = this.endLine > this.editor.htmls.length ? this.editor.htmls.length : this.endLine;
        clearTimeout(this.parse.timer);
        this.parse();
    }

    pairRun(line, length) {
        this.parsePairLine = this.parsePairLine > line ? line : this.parsePairLine;
        let texts = this.editor.htmls.slice(line - 1, line - 1 + length);
        texts = texts.map((item) => {
            return {
                uuid: item.uuid,
                text: item.text
            }
        });
        this.worker.postMessage({
            type: 'run',
            texts: texts,
            rules: rules,
            pairRules: this.pairRules
        });
    }

    removePairRun(line, length) {
        this.parsePairLine = this.parsePairLine > line ? line : this.parsePairLine;
        this.worker.postMessage({
            type: 'remove',
            uuid: this.editor.htmls[line - 1].uuid,
            length: length
        });
    }

    parse() {
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
                tokens.sort((a, b) => {
                    return a.start - b.start;
                });
            } else {
                tokens = lineObj.highlight.tokens;
            }
            if (tokens.length && !lineObj.highlight.rendered && this.nowLine >= this.editor.startLine && this.nowLine <= this.editor.startLine + this.editor.maxLine) {
                lineObj.html = this.buildHtml(this.nowLine);
                lineObj.highlight.rendered = true;
            }
            count++;
            this.nowLine++;
        }
        if (this.nowLine <= this.endLine) {
            this.parse.timer = setTimeout(() => {
                this.parse();
            }, 500);
        }
    }

    parsePair() {
        let lineObj = null;
        let count = 0;
        let length = this.editor.htmls.length;
        let that = this;
        while (count < 10000 && this.parsePairLine <= length) {
            lineObj = this.editor.htmls[this.parsePairLine - 1];
            if (!lineObj.highlight.pairTokens) {
                break;
            }
            let pairTokens = lineObj.highlight.pairTokens.concat([]);
            // 不同类型的和多行匹配相同优先级的单行tokens
            let tokens = lineObj.highlight.tokens.filter((item) => {
                return item.level === pairRules[0].level && !this.pairTokensMap[item.token];
            });
            lineObj.highlight.validPairTokens = [];
            // 获取开始节点
            if (!this.startToken) {
                this.startToken = _getNextStartToken(tokens, pairTokens);
                this.startLine = this.parsePairLine;
                if (this.startToken) {
                    this._startToken = Object.assign({}, this.startToken);
                    this._startToken.line = this.startLine;
                    this._startToken.end = Number.MAX_VALUE;
                    lineObj.highlight.validPairTokens.push(this._startToken);
                    _renderHtml(this.startLine);
                }
            }
            while (pairTokens.length) {
                let endToken = pairTokens.shift();
                if (endToken.token == this.startToken.token && endToken.type + this.startToken.type === 0) {
                    if (this.parsePairLine == this.startLine) { // 同一行的不需处理
                        this.editor.htmls[this.startLine - 1].highlight.validPairTokens.pop();
                    } else if ( // 有检测函数的需要运行检测函数
                        !this.pairTokensMap[endToken.token].check ||
                        this.pairTokensMap[endToken.token].check(
                            Object.assign({}, this.startToken),
                            Object.assign({}, endToken),
                            this.editor.htmls.slice(this.startLine - 1, this.parsePairLine).map((item) => {
                                return item.text;
                            })
                        )
                    ) {
                        for (let line = this.startLine + 1; line < this.parsePairLine; line++) {
                            let tmp = this.editor.htmls[line - 1];
                            tmp.token = this.startToken.token;
                            tmp.html = tmp.text;
                            _renderHtml(line);
                        }
                        endToken = Object.assign({}, endToken);
                        endToken.line = this.parsePairLine;
                        endToken.start = 0;
                        endToken.startToken = this._startToken;
                        lineObj.highlight.validPairTokens.push(endToken);
                        this._startToken.endToken = endToken;
                        if (
                            this.editor.startToEndToken &&
                            (
                                this.editor.startToEndToken.line < this.parsePairLine ||
                                this.editor.startToEndToken.startToEndToken < endToken.end
                            )
                        ) {
                            this.editor.startToEndToken = null;
                        }
                        // 渲染开始行
                        _renderHtml(this.startLine);
                        // 渲染结束行
                        _renderHtml(this.parsePairLine);
                    }
                    // 获取下一个开始节点
                    this.startToken = _getNextStartToken(tokens, pairTokens);
                    this._startToken = null;
                    this.startLine = this.parsePairLine;
                    if (this.startToken) {
                        this._startToken = Object.assign({}, this.startToken);
                        this._startToken.line = this.startLine;
                        this._startToken.end = Number.MAX_VALUE;
                        lineObj.highlight.validPairTokens.push(this._startToken);
                        _renderHtml(this.startLine);
                    }
                }
            }
            this.parsePairLine++;
            count++;
        }
        if (this.parsePairLine < length) {
            clearTimeout(this.parsePair.timer);
            this.parsePair.timer = setTimeout(() => {
                this.parsePair();
            }, 100);
            if (this.parsePairLine > this.editor.startLine) {
                this.editor.startToEndToken = this._startToken;
            }
        } else {
            this.editor.startToEndToken = this._startToken;
        }

        function _getNextStartToken(tokens, pairTokens) {
            if (!pairTokens.length) {
                return null;
            }
            var pairToken = pairTokens.shift();
            if (pairToken.type == Util.constData.PAIR_END) {
                return _getNextStartToken(tokens, pairTokens);
            }
            for (let i = 0; i < tokens; i++) {
                if (tokens[i].start < pairToken.start && tokens[i].end > pairToken.start) {
                    return _getNextStartToken(tokens, pairTokens);
                }
            }
            return pairToken;
        }

        function _renderHtml(line) {
            if (line >= that.editor.startLine && line <= that.editor.startLine + that.editor.maxLine) {
                that.buildHtml(line);
            }
        }
    }

    buildHtml(line) {
        let lineObj = this.editor.htmls[line - 1];
        let text = lineObj.text;
        let tokens = lineObj.highlight.tokens;
        let result = [];
        let html = '';
        let preEnd = 0;
        // 被多行匹配包裹
        if (lineObj.token) {
            html = `<span class="${lineObj.token}">${lineObj.text}</span>`;
        } else {

            // 需要处理多行匹配的首尾节点
            if (lineObj.highlight.validPairTokens) {
                tokens = tokens.concat(lineObj.highlight.validPairTokens);
                tokens.sort((a, b) => {
                    return a.start - b.start;
                });
            }
            let nowToken = null;
            let i = 0;
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
        }
        lineObj.html = html;
        lineObj.highlight.rendered = true;
        lineObj = this.editor.renderedUuidMap.get(lineObj.uuid);
        lineObj && (lineObj.html = html);
        return html;
    }
}

export default Highlight;