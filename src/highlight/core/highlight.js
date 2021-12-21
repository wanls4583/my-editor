/*
 * @Author: lisong
 * @Date: 2021-12-15 11:39:41
 * @Description: 
 */
import rules from '@/highlight/javascript/rules';
export default class {
    constructor(editor) {
        this.editor = editor;
        this.rules = rules;
        this.initProperties(editor);
        this.initRules();
    }
    initProperties(context) {
        let properties = ['htmls', 'startLine', 'maxVisibleLines', 'maxLine'];
        let result = {};
        properties.map((property) => {
            result[property] = {
                get: function () {
                    return context[property];
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
    tokenizeLines(startLine, endLine) {
        this.tokenizeLines.time = Date.now();
        while (startLine <= endLine && Date.now() - this.tokenizeLines.time <= 20) {
            this.htmls[startLine - 1].tokens = this.htmls[startLine - 1].tokens || this.tokenizeLine(startLine);
            startLine++;
        }
        clearTimeout(this.tokenizeLines.timer);
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
        let lineObj = this.htmls[line - 1];
        let regex = this.getRegex(this.tokenizeState);
        while (match = regex.exec(lineObj.text)) {
            for (let uuid in match.groups) {
                if (match.groups[uuid] == undefined) {
                    continue;
                }
                result = match.groups[uuid];
                uuid = uuid.slice(1);
                rule = this.ruleUidMap[uuid];
                tokens.push({
                    start: match.index,
                    end: match.index + result.length,
                    value: result,
                    type: typeof rule.token == 'function' ? rule.token(result) : rule.token
                });
                if (rule.next) { //多行token被匹配
                    let state = {};
                    state.type = 'start';
                    state.uuid = uuid;
                    if (this.tokenizeState && this.tokenizeState.type == 'start') {
                        if (this.tokenizeState.uuid == uuid) { //多行token匹配成功
                            if (this.ruleUidMap[this.tokenizeState.uuid].parentUuid) {
                                state.uuid = this.ruleUidMap[this.tokenizeState.uuid].parentUuid;
                            } else {
                                state.type = 'end';
                            }
                        } else { //子节点中的多行token匹配开始
                            state.type = 'start';
                            state.uuid = uuid;
                        }
                    } else { //新的多行token匹配
                        state.type = 'start';
                    }
                    this.tokenizeState = state; //记录当前状态
                }
                break;
            }
            if (!match[0]) { //考虑/^$/的情况
                break;
            }
            lastIndex = regex.lastIndex;
            regex.lastIndex = 0;
            regex = this.getRegex(this.tokenizeState);
            regex.lastIndex = lastIndex;
        }
        // 整行被多行token包裹
        if (!tokens.length && this.tokenizeState && this.tokenizeState.type == 'start') {
            rule = this.ruleUidMap[this.tokenizeState.uuid];
            tokens.push({
                start: 0,
                end: lineObj.text.length,
                value: lineObj.text,
                type: typeof rule.token == 'function' ? rule.token(result) : rule.token
            });
        }
        regex.lastIndex = 0;
        return tokens;
    }
    getRegex(tokenizeState) {
        let regex = null;
        if (tokenizeState && tokenizeState.uuid) {
            let rule = this.ruleUidMap[tokenizeState.uuid];
            if (tokenizeState.type == 'start') {
                if (rule.childRule) {
                    regex = rule.childRule.regex;
                } else {
                    regex = new RegExp(`(?<_${rule.uuid}>${rule.next.source})`, 'g');
                }
            } else if (rule.parentUuid) {
                regex = this.ruleUidMap[rule.parentUuid].childRule.regex;
            } else {
                regex = this.rules.regex;
            }
        } else {
            regex = this.rules.regex;
        }
        return regex;
    }
}