/*
 * @Author: lisong
 * @Date: 2021-12-15 11:39:41
 * @Description: 
 */
import rules from '@/highlight/javascript/rules';
import Util from '@/common/util';
export default class {
    constructor(editor, context) {
        this.editor = editor;
        this.context = context;
        this.rules = rules;
        this.initProperties(editor);
        this.initRules();
    }
    initProperties(editor) {
        let properties = ['startLine', 'maxVisibleLines', 'maxLine', 'renderedUidMap'];
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
        this.ruleUuid = 1;
        this.ruleUidMap = {};
        this.rules.rules.map((item) => {
            this.setRuleUuid(item, pairLevel);
        });
        this.rules = this.rules.rules;
        this.rules.sort((a, b) => {
            return b.level - a.level;
        });
        this.setCombRegex(this.rules);
    }
    setRuleUuid(item, pairLevel, parentUuid) {
        // 每个规则生成一个唯一标识
        item.uuid = this.ruleUuid++;
        item.parentUuid = parentUuid;
        this.ruleUidMap[item.uuid] = item;
        item.level = item.level || 0;
        if (item.start && item.next) {
            item.level = item.level || pairLevel;
        }
        if (item.childRule && item.childRule.rules) {
            item.childRule.rules.map((_item) => {
                this.setRuleUuid(_item, item.childRule.pairLevel, item.uuid);
            });
            item.childRule = item.childRule.rules;
            item.childRule.sort((a, b) => {
                return b.level - a.level;
            });
        }
    }
    // 组合同一层级的正则表达式
    setCombRegex(rules, parentRule) {
        let source = [];
        rules.map((item) => {
            if (item.childRule) {
                this.setCombRegex(item.childRule, item);
            }
            if (item.regex) {
                source.push(`?<_${item.uuid}>${item.regex.source}`);
            } else if (item.start instanceof RegExp) {
                source.push(`?<_${item.uuid}>${item.start.source}`);
            }
        });
        if (parentRule) {
            if (parentRule.level > rules[0].level) {
                source.unshift(`?<_${parentRule.uuid}>${parentRule.next.source}`);
            } else {
                source.push(`?<_${parentRule.uuid}>${parentRule.next.source}`);
            }
        }
        rules.regex = new RegExp(`(${source.join(')|(')})`, 'g');
    }
    onInsertContent(line) {
        this.tokenizeLines(line);
    }
    onDeleteContent(line) {
        this.tokenizeLines(line);
    }
    onScroll() {
        this.tokenizeVisibleLins();
    }
    tokenizeVisibleLins() {
        let startLine = this.startLine;
        let endLine = this.startLine + this.maxVisibleLines;
        endLine = endLine > this.maxLine ? this.maxLine : endLine;
        while (this.context.htmls[startLine - 1].tokens) {
            startLine++;
        }
        this.tokenizeLines(startLine, endLine);
    }
    tokenizeLines(startLine, endLine) {
        this.tokenizeLines.time = Date.now();
        endLine = endLine || this.maxLine;
        while (startLine <= endLine && Date.now() - this.tokenizeLines.time <= 20) {
            let lineObj = this.context.htmls[startLine - 1];
            if (!lineObj.tokens) {
                let data = this.tokenizeLine(startLine);
                lineObj.tokens = data.tokens;
                lineObj.html = data.tokens.map((item) => {
                    return `<span class="${item.type}">${Util.htmlTrans(item.value)}</span>`;
                }).join('');
                if (this.renderedUidMap.has(lineObj.uuid)) {
                    this.renderedUidMap.get(lineObj.uuid).html = lineObj.html;
                }
                if (lineObj.states + '' != data.states + '') {
                    lineObj.states = data.states;
                    lineObj = this.context.htmls[startLine];
                    if (lineObj) {
                        lineObj.tokens = null;
                    }
                }
            } else {
                startLine = endLine + 1;
                break;
            }
            startLine++;
        }
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
        let result = null;
        let lastIndex = 0;
        let preEnd = 0;
        let newStates = [];
        let preStates = line > 1 && this.context.htmls[line - 2].states || [];
        let states = preStates.slice(0);
        let lineObj = this.context.htmls[line - 1];
        let regex = this.getRegex(states.peek());
        while (match = regex.exec(lineObj.text)) {
            for (let uuid in match.groups) {
                if (match.groups[uuid] == undefined) {
                    continue;
                }
                let token = null;
                result = match.groups[uuid];
                uuid = uuid.slice(1);
                rule = this.ruleUidMap[uuid];
                token = {
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
                    if (state == uuid) { //多行token尾
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
                                token.value = value;
                            } else { //跨行匹配
                                tokens.pop()
                                token.value = lineObj.text.slice(0, match.index + result.length);
                            }
                        }
                    } else { //多行token始
                        states.push(uuid);
                        newStates.push(uuid);
                        if (!rule.childRule) { //无子节点
                            token.value = lineObj.text.slice(match.index);
                        }
                    }
                }
                token.type = typeof rule.token == 'function' ? rule.token(token.value) : rule.token;
                tokens.push(token);
                preEnd = match.index + token.value.length;
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
        } else if (preEnd < lineObj.text.length) { //普通文本
            tokens.push({
                value: lineObj.text.slice(preEnd),
                type: 'plain'
            });
        }
        regex.lastIndex = 0;
        return {
            tokens: tokens,
            states: newStates
        };
    }
    getRegex(uuid) {
        let regex = null;
        if (uuid) {
            let rule = this.ruleUidMap[uuid];
            if (rule.childRule) {
                regex = rule.childRule.regex;
            } else {
                regex = new RegExp(`(?<_${rule.uuid}>${rule.next.source})`, 'g');
            }
        } else {
            regex = this.rules.regex;
        }
        return regex;
    }
}