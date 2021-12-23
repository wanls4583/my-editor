/*
 * @Author: lisong
 * @Date: 2021-12-15 11:39:41
 * @Description: 
 */
import rules from '@/highlight/javascript/rules';
// import rules from '@/highlight/html/rules';
import Util from '@/common/util';
export default class {
    constructor(editor, context) {
        this.editor = editor;
        this.context = context;
        this.rules = rules;
        this.currentLine = 1;
        this.initProperties(editor);
        this.initRules();
    }
    initProperties(editor) {
        let properties = ['startLine', 'maxVisibleLines', 'maxLine', 'renderedIdMap'];
        let result = {};
        properties.map((property) => {
            result[property] = {
                get: function () {
                    return editor[property];
                }
            }
        });
        Object.defineProperties(this, result);
    }
    initRules() {
        let pairLevel = this.rules.pairLevel || 1;
        this.ruleId = 1;
        this.ruleUidMap = {};
        this.rules.rules.map((item) => {
            this.setRuleUuid(item, pairLevel);
        });
        this.rules = this.rules.rules;
        this.rules.sort((a, b) => {
            return b.level - a.level;
        });
        this.setCombRegex(this.rules, []);
    }
    setRuleUuid(item, pairLevel, parentUuid) {
        // 每个规则生成一个唯一标识
        item.ruleId = this.ruleId++;
        item.parentUuid = parentUuid;
        this.ruleUidMap[item.ruleId] = item;
        item.level = item.level || 0;
        if (item.start && item.next) {
            item.level = item.level || pairLevel;
        }
        if (item.childRule && item.childRule.rules) {
            item.childRule.rules.map((_item) => {
                this.setRuleUuid(_item, item.childRule.pairLevel || 1, item.ruleId);
            });
            item.childRule = item.childRule.rules;
            item.childRule.sort((a, b) => {
                return b.level - a.level;
            });
        }
    }
    // 组合同一层级的正则表达式
    setCombRegex(rules, parentRules) {
        let source = [];
        rules.map((item) => {
            if (item.childRule) {
                this.setCombRegex(item.childRule, [item].concat(parentRules));
            }
            if (item.regex) {
                source.push(`?<_${item.ruleId}>${item.regex.source}`);
            } else if (item.start instanceof RegExp) {
                source.push(`?<_${item.ruleId}>${item.start.source}`);
                item.nextRegex = new RegExp(`(?<_${item.ruleId}>${item.next.source})`, 'g');
            }
        });
        parentRules.map((parentRule) => {
            source.unshift(`?<_${parentRule.ruleId}>${parentRule.next.source}`);
        });
        rules.regex = new RegExp(`(${source.join(')|(')})`, 'g');
    }
    onInsertContent(line) {
        if (line <= this.currentLine) {
            this.tokenizeLines(line);
        }
    }
    onDeleteContent(line) {
        if (line <= this.currentLine) {
            this.tokenizeLines(line);
        }
    }
    onScroll() {
        this.tokenizeVisibleLins();
    }
    tokenizeVisibleLins() {
        let startLine = this.startLine;
        let endLine = this.startLine + this.maxVisibleLines;
        let currentLine = this.currentLine;
        endLine = endLine > this.maxLine ? this.maxLine : endLine;
        while (startLine <= endLine && this.context.htmls[startLine - 1].tokens) {
            startLine++;
        }
        this.tokenizeLines(startLine, endLine);
        this.currentLine = currentLine;
    }
    tokenizeLines(startLine, endLine) {
        let processedLines = 0;
        let processedTime = Date.now();
        endLine = endLine || this.maxLine;
        while (startLine <= endLine) {
            let lineObj = this.context.htmls[startLine - 1];
            if (!lineObj.tokens) {
                let data = this.tokenizeLine(startLine);
                lineObj.tokens = data.tokens;
                lineObj.html = data.tokens.map((item) => {
                    let rule = this.ruleUidMap[item.ruleId];
                    if (rule && typeof rule.value === 'function') {
                        return rule.value(item.value);
                    } else {
                        return `<span class="${item.type}">${Util.htmlTrans(item.value)}</span>`;
                    }
                }).join('');
                if (this.renderedIdMap.has(lineObj.lineId)) {
                    this.renderedIdMap.get(lineObj.lineId).html = lineObj.html;
                }
                if (lineObj.states + '' != data.states + '') {
                    lineObj.states = data.states;
                    lineObj = this.context.htmls[startLine];
                    if (lineObj) {
                        lineObj.tokens = null;
                    }
                }
                processedLines++;
                // 避免卡顿
                if (processedLines % 10 == 0 && Date.now() - processedTime >= 20) {
                    startLine++;
                    break;
                }
            }
            startLine++;
        }
        this.currentLine = startLine;
        if (startLine <= endLine) {
            this.tokenizeLines.timer = setTimeout(() => {
                this.tokenizeLines(startLine, endLine);
            }, 20);
        }
    }
    tokenizeLine(line) {
        let tokens = [];
        let match = null;
        let rule = null;
        let lastIndex = 0;
        let preEnd = 0;
        let preStates = line > 1 && this.context.htmls[line - 2].states || [];
        let states = preStates.slice(0);
        let lineObj = this.context.htmls[line - 1];
        let regex = this.getRegex(states.peek());
        while (match = regex.exec(lineObj.text)) {
            let result = null;
            let token = null;
            let flag = '';
            for (let ruleId in match.groups) {
                if (match.groups[ruleId] == undefined) {
                    continue;
                }
                result = match.groups[ruleId];
                ruleId = ruleId.slice(1);
                rule = this.ruleUidMap[ruleId];
                token = {
                    ruleId: rule.ruleId,
                    value: result
                };
                if (preEnd < match.index) { //普通文本
                    tokens.push({
                        value: lineObj.text.slice(preEnd, match.index),
                        type: 'plain'
                    });
                }
                if (rule.next) { //多行token被匹配
                    let state = states.peek();
                    if (state == ruleId) { //多行token尾
                        states.pop();
                        if (!rule.childRule) { //无子节点
                            if (preStates.indexOf(state) == -1) { //在同一行匹配
                                let value = '';
                                token = tokens.pop();
                                value = token.value;
                                if (token.type == 'plain') {
                                    token = tokens.pop();
                                    value = token.value + value;
                                }
                                token.value = value + result;
                            } else { //跨行匹配
                                tokens.pop()
                                token.value = lineObj.text.slice(0, match.index + result.length);
                            }
                        }
                        flag = 'end';
                    } else { //多行token始
                        states.push(ruleId);
                        flag = 'start';
                    }
                }
                token.type = typeof rule.token == 'function' ? rule.token(token.value, flag) : rule.token;
                tokens.push(token);
                preEnd = match.index + result.length;
                break;
            }
            if (!match[0]) { //考虑/^$/的情况
                break;
            }
            lastIndex = regex.lastIndex;
            regex.lastIndex = 0;
            regex = this.getRegex(states.peek());
            regex.lastIndex = lastIndex;
        }
        if (!tokens.length && states.length) { // 整行被多行token包裹
            rule = this.ruleUidMap[states.peek()];
            !rule.childRule && tokens.push({
                value: lineObj.text,
                type: typeof rule.token == 'function' ? rule.token(lineObj.text) : rule.token
            });
        } else if (states.length && preStates.indexOf(states.peek()) == -1) { //最后一个token未匹配到尾节点
            tokens.peek().value += lineObj.text.slice(preEnd);
        } else if (preEnd < lineObj.text.length) { //普通文本
            tokens.push({
                value: lineObj.text.slice(preEnd),
                type: 'plain'
            });
        }
        regex.lastIndex = 0;
        return {
            tokens: tokens,
            states: states
        };
    }
    getRegex(ruleId) {
        let regex = null;
        if (ruleId) {
            let rule = this.ruleUidMap[ruleId];
            if (rule.childRule) {
                regex = rule.childRule.regex;
            } else {
                regex = rule.nextRegex;
            }
        } else {
            regex = this.rules.regex;
        }
        return regex;
    }
}