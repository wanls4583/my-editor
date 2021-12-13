import rules from '../javascript/rules';
// import rules from '../html/rules';
import Util from '../../common/util';
import PairWorker from './worker';

class Highlight {
    constructor(editor) {
        this.editor = editor;
        this.worker = Util.createWorker(PairWorker);
        this.rulesObj = rules;
        this.nowPairLine = 1;
        this.ruleUuid = 1;
        this.ruleUuidMap = {};
        this.ruleNameMap = {};
        this.startNameMap = {};
        this.singleRules = [];
        this.copyRules = []; // 传入worker的数据不能克隆函数
        this.initRules();
        this.worker.onmessage = (e) => {
            this.startHighlightPairToken(e);
        }
    }

    initRules() {
        let pairLevel = this.rulesObj.pairLevel || 1;
        this.rulesObj.rules.map((item) => {
            this.setRuleUuid(item, pairLevel);
        });
    }

    setRuleUuid(item, pairLevel, parentUuid) {
        // 每个规则生成一个唯一标识
        item.uuid = this.ruleUuid++;
        item.parentUuid = parentUuid;
        this.ruleUuidMap[item.uuid] = item;
        if (typeof item.name == 'string') {
            this.ruleNameMap[item.name] = item;
        }
        if (typeof item.start == 'string') {
            this.startNameMap[item.start] = item;
        }
        if (item.regex && !item.start) {
            this.singleRules.push(item);
        } else { //多行匹配的优先级需要一致
            item.level = item.level || pairLevel;
        };
        if (item.childRule && item.childRule.rules) {
            item.childRule.rules.map((_item) => {
                this.setRuleUuid(_item, item.childRule.pairLevel, item.uuid);
            });
        }
        item = Object.assign({}, item);
        delete item.check;
        typeof item.token == 'function' && delete item.token;
        if (!parentUuid) {
            this.copyRules.push(item);
        }
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
            tokens[Util.constData.DEFAULT] = [];
            if (!lineObj.highlight.tokens) {
                text = lineObj.text;
                text && this.singleRules.map((rule) => {
                    while (result = rule.regex.exec(lineObj.text)) {
                        let key = rule.parentUuid || Util.constData.DEFAULT;
                        tokens[key] = tokens[key] || [];
                        tokens[key].push({
                            uuid: rule.uuid,
                            value: result[0],
                            level: rule.level,
                            start: result.index,
                            end: result.index + result[0].length
                        });
                        if (!result[0].length || !rule.regex.global) {
                            break;
                        }
                    }
                    rule.regex.lastIndex = 0;
                });
                lineObj.highlight.tokens = tokens;
                Object.values(tokens).map((tokens) => {
                    tokens.sort((a, b) => {
                        if (a.start - b.start == 0) {
                            return b.level - a.level;
                        }
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
        this.parentTokens = [];
        this.preEndToken = null;
        this.nowPairLine = this.getStartPairLine();
        this.highlightPairToken();
    }

    /**
     * 高亮多行匹配
     * @param {Object} option [once:只执行一次parsePair,max:最大执行次数] 
     */
    highlightPairToken() {
        let startTime = Date.now();
        let count = 0;
        let max = 5000;
        let length = this.editor.htmls.length;
        while (count < max && this.nowPairLine <= length) {
            let lineObj = this.editor.htmls[this.nowPairLine - 1];
            let pairTokens = lineObj.highlight.pairTokens;
            let excludeTokens = lineObj.highlight.excludeTokens; // 和多行匹配相同优先级不同类型的单行tokens
            lineObj.highlight.validPairTokens = [];
            // 记录父节点，用于渲染相应的单行tokens
            lineObj.parentRuleUuid = this.parentTokens.length && this.parentTokens.peek().uuid || null;
            // 已有开始节点，则该行可能被其包裹
            lineObj.ruleUuid = this.startToken && this.startToken.uuid || '';
            this.buildHtml(this.nowPairLine);
            if (!pairTokens) {
                this.nowPairLine++;
                count++;
                continue;
            }
            pairTokens = pairTokens.concat([]);
            while (pairTokens.length) {
                let endToken = null;
                // 获取开始节点
                if (!this.startToken) {
                    this.startToken = this.getNextStartToken(excludeTokens, pairTokens);
                    if (this.startToken) {
                        if (this.parentTokens.length && this.parentTokens.peek().uuid == this.startToken.uuid) { // 找到的是父节点的结束节点
                            endToken = this.startToken;
                            this.startToken = this.parentTokens.pop();
                        } else {
                            let rule = this.ruleUuidMap[this.startToken.uuid];
                            this.preEndToken = null;
                            this.startToken.line = this.nowPairLine;
                            this.startToken._start = this.startToken.start;
                            this.startToken._end = this.ifHasChildRule(rule.uuid) ? this.startToken.end : Number.MAX_VALUE;
                            this.startToken.parentTokens = this.parentTokens.concat([]);
                            lineObj.highlight.validPairTokens.push(this.startToken);
                            lineObj.ruleUuid = '';
                            this.buildHtml(this.nowPairLine);
                            // 该节点是否有子节点
                            if (this.ifHasChildRule(rule.uuid)) {
                                this.parentTokens.push(this.startToken);
                                this.startToken = null;
                                continue;
                            }
                        }
                    }
                }
                if (!pairTokens.length && !endToken) {
                    break;
                }
                endToken = endToken || pairTokens.shift();
                if (this.parentTokens.length) {
                    let parentToken = this.parentTokens.peek();
                    // 父节点的优先级要大于子节点，且endtoken能和父节点匹配，当前的开始节点结束匹配
                    if (parentToken.level > this.startToken.level &&
                        this.ifPair(parentToken, endToken, parentToken.line, this.nowPairLine)) {
                        if (this.startToken.line == this.nowPairLine) {
                            this.startToken._end = endToken.start;
                        }
                        this.startToken = this.parentTokens.pop();
                    }
                }
                if (this.ifPair(this.startToken, endToken, this.startToken.line, this.nowPairLine)) {
                    let rule = this.ruleUuidMap[endToken.uuid];
                    endToken.line = this.nowPairLine;
                    endToken._start = this.ifHasChildRule(rule.uuid) ? endToken.start : 0;
                    endToken._end = endToken.end;
                    endToken.startToken = this.startToken;
                    endToken.parentTokens = this.startToken.parentTokens;
                    lineObj.ruleUuid = '';
                    lineObj.highlight.validPairTokens.push(endToken);
                    // 开始和结束节点在同一行
                    if (this.startToken.line == this.nowPairLine && !this.ifHasChildRule(rule.uuid)) {
                        this.startToken._end = endToken._end;
                        endToken._start = this.startToken._start;
                    }
                    this.startToken.endToken = endToken;
                    // 渲染开始行
                    this.buildHtml(this.startToken.line);
                    // 渲染结束行
                    this.startToken.line != endToken.line && this.buildHtml(endToken.line);
                    this.startToken = null;
                    this.preEndToken = endToken;
                    // 多行匹配后面紧跟的字节点<script type="text/javascript">子节点</script>
                    if (rule.name && this.startNameMap[rule.name]) {
                        rule = this.startNameMap[rule.name];
                        this.parentTokens.push({
                            uuid: rule.uuid,
                            value: '',
                            level: rule.level,
                            line: this.nowPairLine,
                            start: endToken.end,
                            end: endToken.end,
                            type: Util.constData.PAIR_START
                        });
                    }
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
            this.editor.startToEndToken = this.startToken;
        }
    }

    // 开始节点和结束节点是否匹配
    ifPair(startToken, endToken, startLine, endLine) {
        if (
            endToken.uuid == startToken.uuid &&
            endToken.type + startToken.type === 0 &&
            // 排除/*/这种情况
            !(startLine == endLine && endToken.start < startToken.end)
        ) {
            return true;
        }
    }

    // 是否含有子规则
    ifHasChildRule(ruleUuid) {
        let rule = this.ruleUuidMap[ruleUuid];
        if (rule.childRule && rule.childRule.rules && rule.childRule.rules.length) {
            return true;
        }
        return false;
    }

    // 获取下一个开始节点
    getNextStartToken(excludeTokens, pairTokens) {
        while (pairTokens.length) {
            let pairToken = pairTokens.shift(),
                rule = this.ruleUuidMap[pairToken.uuid],
                pass = true;
            if (this.parentTokens.length) {
                let parentToken = this.parentTokens.peek();
                // 父节点匹配到结束节点，当前子节点结束匹配
                if (this.ifPair(parentToken, pairToken, parentToken.line, this.nowPairLine)) {
                    return pairToken;
                }
                if (this.ruleUuidMap[pairToken.uuid].parentUuid != parentToken.uuid ||
                    parentToken.line == this.nowPairLine && parentToken.end > pairToken.start) {
                    continue;
                }
            } else if (rule.parentUuid) { // 属于子节点
                continue;
            }
            if (pairToken.type == Util.constData.PAIR_END) {
                continue;
            }
            // 需要防止/*test*/*这种情况
            if (
                this.preEndToken &&
                this.preEndToken.line == this.nowPairLine &&
                this.preEndToken.end > pairToken.start
            ) {
                continue;
            }
            let nowExcludeTokens = [];
            if (this.parentTokens.length) {
                nowExcludeTokens = excludeTokens[this.parentTokens.peek().uuid] || [];
            } else {
                nowExcludeTokens = excludeTokens[Util.constData.DEFAULT];
            }
            if (this.preEndToken && this.preEndToken.line == this.nowPairLine) {
                nowExcludeTokens = nowExcludeTokens.filter((item) => {
                    return item.start >= this.preEndToken.end;
                });
            }
            // 是否与单行匹配冲突
            for (let i = 0; i < nowExcludeTokens.length; i++) {
                let token = nowExcludeTokens[i];
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

    // 寻找前面最接近的已处理过的开始行
    getStartPairLine() {
        if (this.nowPairLine > 1) {
            for (let i = this.nowPairLine - 1; i >= 1; i--) {
                let highlight = this.editor.htmls[i - 1].highlight;
                if (highlight.validPairTokens.length) {
                    let pairToken = highlight.validPairTokens[highlight.validPairTokens.length - 1];
                    let rule = this.ruleUuidMap[pairToken.uuid];
                    this.parentTokens = (pairToken.parentTokens || []).concat([]);
                    if (!pairToken.startToken && pairToken.type != Util.constData.PAIR_END) {
                        this.startToken = pairToken;
                        // 该节点是否有子节点
                        if (this.ifHasChildRule(this.startToken.uuid)) {
                            this.parentTokens.push(this.startToken);
                            this.startToken = null;
                        }
                    } else {
                        // 结束节点是另一个子节点的开端
                        if (rule.name && this.startNameMap[rule.name]) {
                            rule = this.startNameMap[rule.name];
                            this.parentTokens.push({
                                uuid: rule.uuid,
                                value: '',
                                level: rule.level,
                                line: pairToken.line,
                                start: pairToken.end,
                                end: pairToken.end,
                                type: Util.constData.PAIR_START
                            });
                        }
                    }
                    this.nowPairLine = i + 1;
                    break;
                }
            }
        }
        return this.nowPairLine;
    }

    // 获取单行可能有效的token，用于buidhtml
    getSingleLineToken(validPairTokens, tokens) {
        let resultTokens = [];
        let defaultTokens = tokens[Util.constData.DEFAULT];
        let pairToken = null;
        let nowTokens = [];
        let rule = null;
        validPairTokens = validPairTokens.concat([]);
        if (validPairTokens.length) {
            pairToken = validPairTokens[0];
            rule = this.ruleUuidMap[pairToken.uuid];
            if (!pairToken.startToken) { // 第一个节点为开始节点
                nowTokens = rule.parentUuid ? (tokens[rule.parentUuid] || []) : defaultTokens;
            } else if (this.ifHasChildRule(rule.uuid)) {
                nowTokens = tokens[rule.uuid] || [];
            }
            resultTokens = nowTokens.filter((item) => {
                return item.end <= pairToken.start;
            });
        } else {
            return defaultTokens;
        }
        while (validPairTokens.length) {
            pairToken = validPairTokens.shift();
            if (!pairToken.startToken) { // 开始节点
                nowTokens = tokens[pairToken.uuid] || [];
                if (nowTokens.length) {
                    if (validPairTokens.length) { // 下一个节点可能是结束节点，也可能是当前节点的子节点
                        resultTokens = resultTokens.concat(nowTokens.filter((item) => {
                            return item.start >= pairToken.end && item.end <= validPairTokens[0].start;
                        }));
                    } else { // 没有结束节点
                        resultTokens = resultTokens.concat(nowTokens.filter((item) => {
                            return item.start >= pairToken.end;
                        }));
                    }
                }
            } else { // 结束节点
                rule = this.ruleUuidMap[pairToken.uuid];
                nowTokens = rule.parentUuid ? (tokens[rule.parentUuid] || []) : defaultTokens;
                if (nowTokens.length) {
                    if (validPairTokens.length) {
                        resultTokens = resultTokens.concat(nowTokens.filter((item) => {
                            return item.start >= pairToken.end && item.end <= validPairTokens[0].start;
                        }));
                    } else {
                        resultTokens = resultTokens.concat(nowTokens.filter((item) => {
                            return item.start >= pairToken.end;
                        }));
                    }
                }
            }
        }
        return resultTokens;
    }

    buildHtml(line) {
        let lineObj = this.editor.htmls[line - 1];
        let tokens = lineObj.highlight.tokens;
        let result = [];
        let text = lineObj.text;
        let html = '';
        let preEnd = 0;
        if (!tokens && !lineObj.ruleUuid ||
            line < this.editor.startLine ||
            line > this.editor.startLine + this.editor.maxVisibleLines) {
            // token或validPairTokens有变化，下次滚动到该行时需要重新渲染
            this.editor.htmls[line - 1].highlight.rendered = false;
            return;
        }
        // 被多行匹配包裹
        if (lineObj.ruleUuid) {
            let token = this.ruleUuidMap[lineObj.ruleUuid].token;
            if (typeof token === 'function') {
                html = token(null, lineObj.text);
            }
            html = html || `<span class="${token}">${Util.htmlTrans(lineObj.text)}</span>`;
        } else {
            let validPairTokens = lineObj.highlight.validPairTokens;
            // 需要处理多行匹配的首尾节点
            if (validPairTokens && validPairTokens.length) {
                validPairTokens = validPairTokens.map((item) => {
                    item = Object.assign({}, item);
                    item.start = item._start;
                    item.end = item._end;
                    return item;
                });
                tokens = this.getSingleLineToken(validPairTokens, tokens).concat(validPairTokens.map((item) => {
                    item = Object.assign({}, item);
                    item.level = Infinity;
                    return item;
                }));
                tokens.sort((a, b) => {
                    if (a.start - b.start == 0) {
                        return b.level - a.level;
                    }
                    return a.start - b.start;
                });
            } else if (lineObj.parentRuleUuid) {
                tokens = tokens[lineObj.parentRuleUuid] || [];
            } else {
                tokens = tokens[Util.constData.DEFAULT];
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