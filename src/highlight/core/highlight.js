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
        this.nowPairLine = 1;
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
            this.startParsePair(e);
        }
    }

    // 子线程处理完部分数据，可以开始分析多行匹配
    startParsePair(e) {
        let result = e.data;
        result.map((item) => {
            let lineObj = this.editor.uuidMap.get(item.uuid);
            if (lineObj) {
                lineObj.highlight.excludeTokens = item.excludeTokens;
                lineObj.highlight.pairTokens = lineObj.highlight.pairTokens || item.pairTokens;
            }
        });
        this.startToken = null; // 原始开始节点
        this._startToken = null; // 处理过的开始节点
        this.nowPairLine = this.getStartPairLine();
        this.parsePair();
    }

    run() {
        this.nowLine = this.editor.startLine;
        this.endLine = this.editor.startLine + this.editor.maxVisibleLines;
        this.endLine = this.endLine > this.editor.htmls.length ? this.editor.htmls.length : this.endLine;
        clearTimeout(this.parse.timer);
        this.parse();
    }

    pairRun(line, length) {
        this.nowPairLine = this.nowPairLine > line ? line : this.nowPairLine;
        let texts = this.editor.htmls.slice(line - 1, line - 1 + length);
        texts = texts.map((item) => {
            return {
                uuid: item.uuid,
                text: item.text
            }
        });
        // 先主动处理部分数据，防止高亮部分闪烁
        this.startParsePair({
            data: PairWorker({
                texts: texts.slice(0, this.maxVisibleLines),
                rules: rules,
                pairRules: this.pairRules
            })
        });
        // 余下的交由子线程处理
        texts.length > this.maxVisibleLines && this.worker.postMessage({
            type: 'run',
            texts: texts.slice(this.maxVisibleLines),
            rules: rules,
            pairRules: this.pairRules
        });
    }

    removePairRun(line, length) {
        this.nowPairLine = this.nowPairLine > line ? line : this.nowPairLine;
        this.worker.postMessage({
            type: 'remove',
            uuid: this.editor.htmls[line - 1].uuid,
            length: length
        });
    }

    parse() {
        let text = '',
            tokens = null,
            result = null,
            lineObj = null;
        while (this.nowLine <= this.endLine) {
            lineObj = this.editor.htmls[this.nowLine - 1];
            tokens = [];
            if (!lineObj.highlight.tokens) {
                text = lineObj.text;
                text && rules.map((rule) => {
                    while (result = rule.regex.exec(lineObj.text)) {
                        tokens.push({
                            token: rule.token,
                            value: result[0],
                            level: rule.level,
                            start: result.index,
                            end: result.index + result[0].length
                        });
                    }
                    rule.regex.lastIndex = 0;
                });
                lineObj.highlight.tokens = tokens;
                tokens.sort((a, b) => {
                    return a.start - b.start;
                });
            } else {
                tokens = lineObj.highlight.tokens;
            }
            // 这里不需要加tokens.length的判断条件，可能只是validPairTokens有变化，需要更新
            if (!lineObj.highlight.rendered) {
                this.buildHtml(this.nowLine);
            }
            this.nowLine++;
        }
    }

    parsePair() {
        let that = this,
            lineObj = null,
            count = 0,
            length = this.editor.htmls.length;
        while (count < 10000 && this.nowPairLine <= length) {
            lineObj = this.editor.htmls[this.nowPairLine - 1];
            lineObj.highlight.validPairTokens = [];
            if (!lineObj.highlight.pairTokens) {
                break;
            }
            let pairTokens = lineObj.highlight.pairTokens.concat([]);
            // 不同类型的和多行匹配相同优先级的单行tokens
            let excludeTokens = lineObj.highlight.excludeTokens.filter((item) => {
                return item.level === pairRules[0].level && !this.pairTokensMap[item.token];
            });
            // 已有开始节点，则该行可能被其包裹，或者为结束行
            if (this.startToken) {
                if (_checkStartToken(this._startToken, this.nowPairLine)) {
                    lineObj.token = this.startToken.token;
                    this.buildHtml(this.nowPairLine);
                } else {
                    this.startToken = null;
                    this._startToken = null;
                }
            }
            // 前面没有开始节点，则去除该行的旧token
            if (lineObj.token && !this.startToken) {
                lineObj.token = '';
                this.buildHtml(this.nowPairLine);
            }
            while (pairTokens.length) {
                let endToken = null;
                // 获取开始节点
                if (!this.startToken) {
                    this.startToken = _getNextStartToken(excludeTokens, pairTokens);
                    if (this.startToken &&
                        // 需要防止/*test*/*这种情况
                        !(
                            this.preEndToken &&
                            this.preEndToken.line == this.nowPairLine &&
                            this.preEndToken.end > this.startToken.start
                        )
                    ) {
                        this._startToken = Object.assign({}, this.startToken);
                        this._startToken.line = this.nowPairLine;
                        this._startToken.end = Number.MAX_VALUE;
                        this._startToken.originToken = this.startToken;
                        lineObj.highlight.validPairTokens.push(this._startToken);
                        lineObj.token = '';
                        this.buildHtml(this.nowPairLine);
                    }
                }
                if (!pairTokens.length) {
                    break;
                }
                endToken = pairTokens.shift();
                // 匹配成功
                if (
                    endToken.token == this.startToken.token &&
                    endToken.type + this.startToken.type === 0 &&
                    // 排除/*/这种情况
                    !(this.nowPairLine == this._startToken.line && endToken.start < this.startToken.end)
                ) {
                    let _endToken = Object.assign({}, endToken);
                    _endToken.line = this.nowPairLine;
                    _endToken.start = 0;
                    _endToken.originToken = endToken;
                    _endToken.startToken = this._startToken;
                    lineObj.token = '';
                    lineObj.highlight.validPairTokens.push(_endToken);
                    // 开始和结束节点在同一行
                    if (this._startToken.line == this.nowPairLine) {
                        this._startToken.end = _endToken.end;
                        _endToken.start = this._startToken.start;
                    }
                    this._startToken.endToken = _endToken;
                    // 渲染开始行
                    this.buildHtml(this._startToken.line);
                    // 渲染结束行
                    this._startToken.line != this.nowPairLine && this.buildHtml(this.nowPairLine);
                    this.startToken = null;
                    this._startToken = null;
                    this.preEndToken = endToken;
                }
            }
            this.nowPairLine++;
            count++;
        }
        if (this.nowPairLine < length) {
            clearTimeout(this.parsePair.timer);
            this.parsePair.timer = setTimeout(() => {
                this.parsePair();
            }, 100);
            if (this.nowPairLine > this.editor.startLine) {
                this.editor.startToEndToken = this.startToken && this._startToken;
            }
        } else {
            this.editor.startToEndToken = this.startToken && this._startToken;
        }

        function _getNextStartToken(excludeTokens, pairTokens) {
            if (!pairTokens.length) {
                return null;
            }
            var pairToken = pairTokens.shift();
            if (pairToken.type == Util.constData.PAIR_END) {
                return _getNextStartToken(excludeTokens, pairTokens);
            }
            for (let i = 0; i < excludeTokens.length; i++) {
                if (excludeTokens[i].start < pairToken.start && excludeTokens[i].end > pairToken.start) {
                    return _getNextStartToken(excludeTokens, pairTokens);
                }
            }
            return pairToken;
        }

        function _checkStartToken(_startToken, nowPairLine) {
            // 开始节点和结束节点同一行或规则里没有自定义检测函数
            if (_startToken.line == nowPairLine || !that.pairTokensMap[_startToken.token].check) {
                return true;
            }
            let nowLine = that.editor.htmls[nowPairLine - 1].text;
            let preLine = that.editor.htmls[nowPairLine - 2];
            preLine = preLine && preLine.text;
            // 自定义检测函数
            return that.pairTokensMap[_startToken.token].check(preLine, nowLine);
        }
    }

    // 寻找前面最接近的已处理过的开始行
    getStartPairLine() {
        if (this.nowPairLine > 1) {
            for (let i = this.nowPairLine - 1; i >= 1; i--) {
                let highlight = this.editor.htmls[i - 1].highlight;
                if (highlight.validPairTokens.length) {
                    let _startToken = highlight.validPairTokens[highlight.validPairTokens.length - 1];
                    if (!_startToken.startToken && _startToken.type != Util.constData.PAIR_END) {
                        this._startToken = _startToken;
                        this.startToken = this._startToken.originToken;
                    }
                    this.nowPairLine = i + 1;
                    break;
                }
            }
        }
        return this.nowPairLine;
    }

    buildHtml(line) {
        let lineObj = this.editor.htmls[line - 1],
            tokens = lineObj.highlight.tokens,
            result = [],
            text = lineObj.text,
            html = '',
            preEnd = 0;
        if (!tokens || line < this.editor.startLine || line > this.editor.startLine + this.editor.maxVisibleLines) {
            // token或validPairTokens有变化，下次滚动到该行时需要重新渲染
            this.editor.htmls[line - 1].highlight.rendered = false;
            return;
        }
        // 被多行匹配包裹
        if (lineObj.token) {
            html = `<span class="${lineObj.token}">${Util.htmlTrans(lineObj.text)}</span>`;
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