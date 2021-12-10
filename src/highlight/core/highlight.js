import rules from '../javascript/rules';
// import rules from '../html/rules';
import Util from '../../common/util';
import PairWorker from './worker';

class Highlight {
    constructor(editor) {
        this.editor = editor;
        this.worker = Util.createWorker(PairWorker);
        this.rules = rules;
        this.nowPairLine = 1;
        this.ruleUuid = 0;
        this.ruleUuidMap = {};
        this.singleRules = [];
        this.copyRules = []; // 传入worker的数据不能克隆函数
        this.initRules();
        this.worker.onmessage = (e) => {
            this.startHighlightPairToken(e);
        }
    }

    initRules() {
        this.rules.map((item) => {
            item.uuid = this.ruleUuid++;
            this.ruleUuidMap[item.uuid] = item;
            item.children && item.map((_item) => {
                _item.uuid = this.ruleUuid++;
                _item.parentUuid = item.uuid;
                if (_item.regex && !_item.startRegex) {
                    this.singleRules.push(_item);
                }
            });
            if (item.regex && !item.startRegex) {
                this.singleRules.push(item);
            }
            item = Object.assign({}, item);
            delete item.check;
            typeof item.token == 'function' && delete item.token;
            this.copyRules.push(item);
        });
        this.copyRules.map((item) => {
            if (item.children) {
                let children = [];
                item.children.map((_item) => {
                    _item = Object.assign({}, _item);
                    delete _item.check;
                    typeof _item.token == 'function' && delete _item.token;
                    children.push(_item);
                });
                item.children = children;
            }
        });
    }

    addTask() {
        this.nowLine = this.editor.startLine;
        this.endLine = this.editor.startLine + this.editor.maxVisibleLines;
        this.endLine = this.endLine > this.editor.htmls.length ? this.editor.htmls.length : this.endLine;
        this.highlightToken();
    }

    /**
     * 添加多行匹配任务
     * @param {Number} line 开始行
     * @param {Number} length 数量
     */
    addPairTask(line, length) {
        let texts = this.editor.htmls.slice(line - 1, line - 1 + length);
        this.nowPairLine = this.nowPairLine > line ? line : this.nowPairLine;
        texts = texts.map((item) => {
            return {
                uuid: item.uuid,
                text: item.text
            }
        });
        // 先主动处理部分数据，防止高亮部分闪烁
        this.startHighlightPairToken({
            data: PairWorker({
                texts: texts.slice(0, this.editor.maxVisibleLines),
                rules: this.copyRules
            }),
            max: this.editor.maxVisibleLines,
            once: texts.length > this.editor.maxVisibleLines
        });
        if (texts.length > this.editor.maxVisibleLines) {
            let startTime = Date.now();
            let data = {
                type: 'run',
                texts: texts.slice(this.editor.maxVisibleLines),
                rules: this.copyRules
            };
            // 余下的交由子线程处理
            this.worker.postMessage(data);
            // console.log(`copy worker data cost:${Date.now() - startTime}ms`);
        }
    }

    /**
     * 删除多行匹配任务
     * @param {Number} line 开始行
     * @param {Number} length 数量
     */
    removePairTask(line, length) {
        this.nowPairLine = this.nowPairLine > line ? line : this.nowPairLine;
        this.worker.postMessage({
            type: 'remove',
            uuid: this.editor.htmls[line - 1].uuid,
            length: length
        });
    }

    /**
     * 高亮单行匹配
     */
    highlightToken() {
        let startTime = Date.now();
        let text = '',
            tokens = null,
            result = null,
            lineObj = null;
        while (this.nowLine <= this.endLine) {
            lineObj = this.editor.htmls[this.nowLine - 1];
            tokens = {};
            if (!lineObj.highlight.tokens) {
                text = lineObj.text;
                text && this.singleRules.map((rule) => {
                    while (result = rule.regex.exec(lineObj.text)) {
                        let key = rule.parentUuid || 'default';
                        tokens[key] = tokens[key] || [];
                        tokens[key].push({
                            uuid: rule.uuid,
                            value: result[0],
                            level: rule.level,
                            start: result.index,
                            end: result.index + result[0].length
                        });
                    }
                    rule.regex.lastIndex = 0;
                });
                lineObj.highlight.tokens = tokens;
                Object.values(tokens).map((tokens) => {
                    tokens.sort((a, b) => {
                        return a.start - b.start;
                    });
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
        // console.log(`highlightToken cost:${Date.now() - startTime}ms`);
    }

    // 子线程处理完部分数据，可以开始高亮多行匹配
    startHighlightPairToken(e) {
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
        this._preEndToken = null;
        this.nowPairLine = this.getStartPairLine();
        this.highlightPairToken();
    }

    /**
     * 高亮多行匹配
     * @param {Object} option [once:只执行一次parsePair,max:最大执行次数] 
     */
    highlightPairToken() {
        let startTime = Date.now();
        let lineObj = null,
            count = 0,
            max = 5000,
            length = this.editor.htmls.length;
        while (count < max && this.nowPairLine <= length) {
            lineObj = this.editor.htmls[this.nowPairLine - 1];
            lineObj.highlight.validPairTokens = [];
            if (!lineObj.highlight.pairTokens) {
                break;
            }
            let pairTokens = lineObj.highlight.pairTokens.concat([]);
            // 不同类型的和多行匹配相同优先级的单行tokens
            let excludeTokens = lineObj.highlight.excludeTokens;
            // 已有开始节点，则该行可能被其包裹，或者为结束行
            if (this.startToken) {
                if (this.ifPackageBySartToken(this._startToken, this.nowPairLine)) {
                    lineObj.ruleUuid = this.startToken.uuid;
                    this.buildHtml(this.nowPairLine);
                } else {
                    this.startToken = null;
                    this._startToken = null;
                }
            }
            // 前面没有开始节点，则去除该行的旧token
            if (lineObj.ruleUuid && !this.startToken) {
                lineObj.ruleUuid = '';
                this.buildHtml(this.nowPairLine);
            }
            lineObj.parentRuleUuid = this.parentToken && this.parentToken.uuid;
            while (pairTokens.length) {
                let endToken = null;
                // 获取开始节点
                if (!this.startToken) {
                    this.startToken = this.getNextStartToken(excludeTokens, pairTokens);
                    if (this.startToken) {
                        if (this.parentToken && this.parentToken.uuid == this.startToken.uuid) { // 找到的是父节点的结束节点
                            endToken = this.startToken;
                            this.startToken = this.parentToken;
                            this._startToken = this._parentToken;
                        } else {
                            let rule = this.ruleUuidMap[this.startToken.uuid];
                            this._preEndToken = null;
                            this._startToken = Object.assign({}, this.startToken);
                            this._startToken.line = this.nowPairLine;
                            this._startToken.end = rule.children && rule.children.length ? this._startToken.end : Number.MAX_VALUE;
                            this._startToken.originToken = this.startToken;
                            lineObj.highlight.validPairTokens.push(this._startToken);
                            lineObj.ruleUuid = '';
                            this.buildHtml(this.nowPairLine);
                            // 该节点是否有子节点
                            if (!this.parentToken && rule.children && rule.children.length) {
                                this.parentToken = this.startToken;
                                this._parentToken = this._startToken;
                                this.startToken = null;
                                this._startToken = null;
                                continue;
                            }
                        }
                    }
                }
                if (!pairTokens.length) {
                    break;
                }
                endToken = endToken || pairTokens.shift();
                if (this.ifPair(this.startToken, endToken, this._startToken.line, this.nowPairLine)) {
                    let rule = this.ruleUuidMap[endToken.uuid];
                    let _endToken = Object.assign({}, endToken);
                    _endToken.line = this.nowPairLine;
                    _endToken.start = rule.children && rule.children.length ? 0 : _endToken.start;
                    _endToken.originToken = endToken;
                    _endToken.startToken = this._startToken;
                    lineObj.ruleUuid = '';
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
                    this._preEndToken = _endToken;
                }
            }
            this.nowPairLine++;
            count++;
        }
        // console.log(`highlightPairToken cost:${Date.now() - startTime}ms`);//6ms
        if (this.nowPairLine < length) {
            cancelAnimationFrame(this.highlightPairToken.timer);
            this.highlightPairToken.timer = requestAnimationFrame(() => {
                this.highlightPairToken();
            });
        }
        if (this.nowPairLine > this.editor.startLine) {
            this.editor.startToEndToken = this.startToken && this._startToken;
        }
    }

    // 开始节点和结束节点是否匹配
    ifPair(startToken, endToken, startLine, endLine) {
        if (
            endToken.uuid == startToken.uuid &&
            endToken.type + startToken.type === 0 &&
            // 排除/*/这种情况
            !(startLine == endLine && endToken.start < this.startToken.end)
        ) {
            return true;
        }
    }

    // 获取下一个开始节点
    getNextStartToken(excludeTokens, pairTokens) {
        while (pairTokens.length) {
            let pairToken = pairTokens.shift(),
                _excludeTokens = excludeTokens[pairToken.parentUuid || 'default'] || [],
                pass = true;
            // 父节点匹配到结束节点，当前子节点结束匹配
            if (this.parentToken && this.ifPair(this.parentToken, pairToken, this._preEndToken.line, this.nowPairLine)) {
                return pairToken;
            }
            if (pairToken.type == Util.constData.PAIR_END) {
                continue;
            }
            // 需要防止/*test*/*这种情况
            if (
                this._preEndToken &&
                this._preEndToken.line == this.nowPairLine &&
                this._preEndToken.end > pairToken.start
            ) {
                continue;
            }
            // 是否与单行匹配冲突
            for (let i = 0; i < _excludeTokens.length; i++) {
                let token = _excludeTokens[i];
                if (token.start < pairToken.start && token.end > pairToken.start) {
                    pass = false;
                    break;
                }
            }
            if (pass) {
                return pairToken;
            }
        }
    }

    // 检查开始节点是否能影响到中间区域，列如'test\后面必须要有\才能影响到下一行也是字符串
    ifPackageBySartToken(_startToken, nowPairLine) {
        // 开始节点和结束节点同一行或规则里没有自定义检测函数
        if (_startToken.line == nowPairLine || !this.ruleUuidMap[_startToken.uuid].check) {
            return true;
        }
        let nowLine = this.editor.htmls[nowPairLine - 1].text;
        let preLine = this.editor.htmls[nowPairLine - 2];
        preLine = preLine && preLine.text;
        // 自定义检测函数
        return this.ruleUuidMap[_startToken.uuid].check(preLine, nowLine);
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
        tokens = tokens[lineObj.parentRuleUuid ? lineObj.parentRuleUuid : 'default'] || [];
        // 被多行匹配包裹
        if (lineObj.ruleUuid) {
            let token = this.ruleUuidMap[lineObj.ruleUuid].token;
            html = typeof token === 'function' ? token(null, lineObj.text) : `<span class="${token}">${Util.htmlTrans(lineObj.text)}</span>`;
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
                let str = text.substring(token.start, token.end);
                let tokenStr = this.ruleUuidMap[token.uuid].token;
                html += Util.htmlTrans(text.substring(preEnd, token.start));
                html += typeof tokenStr === 'function' ? tokenStr(Object.assign({}, token), str) : `<span class="${tokenStr}">${Util.htmlTrans(str)}</span>`;
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