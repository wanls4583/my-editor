/*
 * @Author: lisong
 * @Date: 2021-12-15 11:39:41
 * @Description: 
 */
import jsRules from '@/highlight/rules/javascript.js';
import htmlRules from '@/highlight/rules/html.js';
import cssRules from '@/highlight/rules/css.js';
import Util from '@/common/util';
export default class {
    constructor(editor, context) {
        this.context = context;
        this.currentLine = 1;
        this.languageMap = [];
        this.initProperties(editor);
        this.initLanguage(editor.language);
    }
    initLanguage(language) {
        this.language = language;
        clearTimeout(this.tokenizeLines.timer);
        switch (language) {
            case 'JavaScript':
                this.initRules(jsRules);
                break;
            case 'HTML':
                this.initRules(htmlRules);
                break;
            case 'CSS':
                this.initRules(cssRules);
                break;
            default:
                this.language = 'plain';
        }
    }
    initProperties(editor) {
        let properties = ['startLine', 'maxVisibleLines', 'maxLine', 'renderLine'];
        let result = {};
        properties.map((property) => {
            result[property] = {
                get: function () {
                    if (typeof editor[property] == 'function') {
                        return editor[property].bind(editor);
                    } else {
                        return editor[property];
                    }
                }
            }
        });
        Object.defineProperties(this, result);
    }
    initRules(rules) {
        if (this.languageMap[this.language]) {
            let obj = this.languageMap[this.language];
            this.rules = obj.rules;
            this.ruleIdMap = obj.ruleIdMap;
            return;
        }
        rules = Util.deepAssign({}, rules);
        let pairLevel = rules.pairLevel || 1;
        this.ruleId = 1;
        this.ruleIdMap = {};
        rules.rules.map((item) => {
            this.setRuleUuid(item, pairLevel);
        });
        rules = rules.rules;
        rules.sort((a, b) => {
            return b.level - a.level;
        });
        this.setCombStartRegex(rules, []);
        this.setCombEndRegex(rules, []);
        this.rules = rules;
        this.languageMap[this.language] = {
            rules: rules,
            ruleIdMap: this.ruleIdMap
        };
    }
    setRuleUuid(item, pairLevel, parentUuid) {
        let that = this;
        // 每个规则生成一个唯一标识
        item.ruleId = this.ruleId++;
        item.parentUuid = parentUuid;
        item.level = item.level || 0;
        this.ruleIdMap[item.ruleId] = item;
        if (item.start && item.end) {
            item.level = item.level || pairLevel;
        }
        if (typeof item.start === 'object' && !(item.start instanceof RegExp)) {
            item.start.ruleId = this.ruleId++;
            item.start.startBy = item.ruleId;
            this.ruleIdMap[item.start.ruleId] = item.start;
            _setChildRuleId(item.start);
        }
        if (typeof item.end === 'object' && !(item.end instanceof RegExp)) {
            item.end.ruleId = this.ruleId++;
            item.end.endBy = item.ruleId;
            this.ruleIdMap[item.end.ruleId] = item.end;
            _setChildRuleId(item.end);
        }
        _setChildRuleId(item);

        function _setChildRuleId(item) {
            if (item.childRule && item.childRule.rules) {
                item.childRule.rules.map((_item) => {
                    that.setRuleUuid(_item, item.childRule.pairLevel || 1, item.ruleId);
                });
                item.childRule = item.childRule.rules;
                item.childRule.sort((a, b) => {
                    return b.level - a.level;
                });
            }
        }
    }
    // 组合同一层级的正则表达式
    setCombStartRegex(rules, parentRules) {
        let sources = [];
        let sourceMap = {};
        let startRegexs = [];
        parentRules.map((parentRule) => {
            startRegexs.push(this.getEndRegex(parentRule));
        });
        rules.map((item) => {
            if (item.childRule && item.childRule.length) {
                this.setCombStartRegex(item.childRule, parentRules.concat([item]));
            }
            if (item.start && item.end) {
                if (item.start.childRule && item.start.childRule.length) {
                    this.setCombStartRegex(item.start.childRule, parentRules.concat([item.start]));
                }
                if (item.end.childRule && item.end.childRule.length) {
                    this.setCombStartRegex(item.end.childRule, parentRules.concat([item.end]));
                }
                item = this.getStartRegex(item);
            }
            startRegexs.push(item);
        });
        startRegexs.map((item) => {
            if (!sourceMap[item.ruleId]) {
                sources.push(`?<_${item.ruleId}>${item.regex.source}`);
                sourceMap[item.ruleId] = true;
            }
        });
        rules.regex = new RegExp(`(${sources.join(')|(')})`, 'g');
    }
    setCombEndRegex(rules, parentRules) {
        let that = this;
        rules.map((item) => {
            if (item.childRule && item.childRule.length) {
                this.setCombEndRegex(item.childRule, parentRules.concat([item]));
            }
            if (item.start && item.end) {
                if (item.start.childRule && item.start.childRule.length) {
                    this.setCombEndRegex(item.start.childRule, parentRules.concat([item.start]));
                }
                if (item.end.childRule && item.end.childRule.length) {
                    this.setCombEndRegex(item.end.childRule, parentRules.concat([item.end]));
                }
                _build(item, parentRules);
            }
        });

        function _build(rule, parentRules) {
            let sources = [];
            let sourceMap = {};
            let endRegexs = [that.getEndRegex(rule)];
            let index = parentRules.length - 1;
            while (index >= 0 && !parentRules[index].childFirst) {
                let parentRule = parentRules[index];
                endRegexs.push(that.getEndRegex(parentRule));
                index--;
            }
            endRegexs.reverse().map((item) => {
                if (!sourceMap[item.ruleId]) {
                    sources.push(`?<_${item.ruleId}>${item.regex.source}`)
                    sourceMap[item.ruleId] = true;
                }
            });
            rule.endRegex = new RegExp(`(${sources.join(')|(')})`, 'g');
        }
    }
    getStartRegex(rule) {
        if (rule.regex instanceof RegExp) {
            return {
                ruleId: rule.ruleId,
                regex: rule.regex
            }
        } else if (rule.start instanceof RegExp) {
            return {
                ruleId: rule.ruleId,
                regex: rule.start
            };
        } else if (rule.start.startBy) {
            return this.getStartRegex(rule.start);
        }
    }
    getEndRegex(rule) {
        if (rule.regex instanceof RegExp) {
            return {
                ruleId: rule.ruleId,
                regex: rule.regex
            }
        } else if (rule.end instanceof RegExp) {
            return {
                ruleId: rule.ruleId,
                regex: rule.end
            };
        } else if (rule.end.endBy) {
            return this.getStartRegex(rule.end);
        }
    }
    onInsertContent(line) {
        if (this.language == 'plain') {
            return;
        }
        if (line <= this.currentLine) {
            this.tokenizeLines(line);
        } else {
            this.tokenizeVisibleLins();
        }
    }
    onDeleteContent(line) {
        if (this.language == 'plain') {
            return;
        }
        if (line <= this.currentLine) {
            this.tokenizeLines(line);
        } else {
            this.tokenizeVisibleLins();
        }
    }
    onScroll() {
        if (this.language == 'plain') {
            return;
        }
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
                lineObj.folds = data.folds;
                lineObj.html = data.tokens.map((item) => {
                    let rule = this.ruleIdMap[item.ruleId];
                    if (rule && typeof rule.value === 'function') {
                        return rule.value(item.value);
                    } else {
                        return `<span class="${item.type.split('.').join(' ')}">${Util.htmlTrans(item.value)}</span>`;
                    }
                }).join('');
                this.renderLine(lineObj.lineId);
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
        let match = null;
        let rule = null;
        let lastIndex = 0;
        let preEnd = 0;
        let preStates = line > 1 && this.context.htmls[line - 2].states || [];
        let states = preStates.slice(0);
        let lineObj = this.context.htmls[line - 1];
        let regex = this.getRegex(states.peek());
        let resultObj = {
            tokens: [],
            folds: []
        }
        while (match = regex.exec(lineObj.text)) {
            let token = null;
            let fold = null;
            for (let ruleId in match.groups) {
                if (match.groups[ruleId] == undefined) {
                    continue;
                }
                ruleId = ruleId.slice(1) - 0;
                rule = this.ruleIdMap[ruleId];
                if (preEnd < match.index) { //普通文本
                    resultObj.tokens.push({
                        value: lineObj.text.slice(preEnd, match.index),
                        type: 'plain'
                    });
                }
                fold = this.getFold(rule, match, states, resultObj, lineObj.text);
                token = this.getToken(rule, match, states, preStates, resultObj, lineObj.text);
                resultObj.tokens.push(token);
                fold && resultObj.folds.push(fold);
                preEnd = match.index + match[0].length;
                break;
            }
            if (!match[0]) { //考虑/^$/的情况
                break;
            }
            lastIndex = regex.lastIndex;
            regex.lastIndex = 0;
            regex = this.getRegex(states.peek(), rule.ruleId, states);
            regex.lastIndex = lastIndex;
        }
        if (!resultObj.tokens.length && states.length) { // 整行被多行token包裹
            rule = this.ruleIdMap[states.peek()];
            if (rule.childRule) {
                resultObj.tokens.push({
                    value: lineObj.text,
                    type: 'plain'
                });
            } else {
                resultObj.tokens.push({
                    value: lineObj.text,
                    type: typeof rule.token == 'function' ? rule.token({
                        value: lineObj.text,
                        text: lineObj.text,
                        index: 0
                    }) : rule.token
                });
            }
        } else if (states.length && preStates.indexOf(states.peek()) == -1) { //最后一个token未匹配到尾节点
            resultObj.tokens.peek().value += lineObj.text.slice(preEnd);
        } else if (preEnd < lineObj.text.length) { //普通文本
            resultObj.tokens.push({
                value: lineObj.text.slice(preEnd),
                type: 'plain'
            });
        }
        regex.lastIndex = 0;
        return {
            tokens: resultObj.tokens,
            folds: resultObj.folds,
            states: states
        };
    }
    getToken(rule, match, states, preStates, resultObj, text) {
        let result = match[0];
        let flag = '';
        let token = {
            value: result
        };
        if (rule.start && rule.end) { //多行token被匹配
            if (states.indexOf(rule.ruleId) > -1) { //多行token尾
                while (states.peek() != rule.ruleId) {
                    states.pop();
                }
                states.pop();
                if (!rule.childRule) { //无子节点
                    if (preStates.indexOf(rule.ruleId) == -1) { //在同一行匹配
                        let value = '';
                        token = resultObj.tokens.pop();
                        value = token.value;
                        if (token.type == 'plain') {
                            token = resultObj.tokens.pop();
                            value = token.value + value;
                        }
                        token.value = value + result;
                    } else { //跨行匹配
                        resultObj.tokens.pop()
                        token.value = text.slice(0, match.index + result.length);
                    }
                }
                flag = 'end';
            } else { //多行token始
                states.push(rule.ruleId);
                flag = 'start';
            }
        }
        if (typeof rule.token == 'function') {
            token.type = rule.token({
                value: token.value,
                index: match.index,
                text: text,
                state: flag
            });
        } else if (rule.token instanceof Array) {
            if (rule.start && rule.end) {
                if (flag == 'start') {
                    token.type = rule.token[0];
                } else {
                    token.type = rule.token[1];
                }
            } else {
                let expIndex = this.getChildExpIndex(match);
                if (expIndex > -1) {
                    token.type = rule.token[expIndex];
                } else {
                    token.type = rule.token.join('.');
                }
            }
        } else {
            token.type = rule.token;
        }
        return token;
    }
    getFold(rule, match, states, resultObj, text) {
        let result = match[0];
        let flag = '';
        let fold = null;
        if (rule.start && rule.end) { //多行token被匹配
            flag = 'start';
            if (states.indexOf(rule.ruleId) > -1) {
                flag = 'end';
            }
            if (rule.foldName) { //多行匹配可折叠
                fold = {
                    start: match.index,
                    end: match.index + result.length,
                    value: result
                };
                if (rule.foldName instanceof Array) {
                    fold.name = flag == 'start' ? rule.foldName[0] : rule.foldName[1];
                }
                if (rule.foldType instanceof Array) {
                    fold.type = flag == 'start' ? rule.foldType[0] : rule.foldType[1];
                }
            }
        } else if (rule.foldName && rule.foldType) { //折叠标记
            fold = {
                start: match.index,
                end: match.index + result.length,
                value: result
            };
            let expIndex = this.getChildExpIndex(match);
            expIndex = expIndex == -1 ? 0 : expIndex;
            if (rule.foldName instanceof Array) {
                fold.name = rule.foldName[expIndex];
            }
            if (rule.foldType instanceof Array) {
                fold.type = rule.foldType[expIndex];
            }
        }
        if (fold) {
            if (typeof rule.foldName === 'function') {
                fold.name = rule.foldName({
                    value: result,
                    text: text,
                    index: match.index,
                    state: flag
                });
            } else if (!(rule.foldName instanceof Array)) {
                fold.name = rule.foldName;
            }
            if (!fold.name) { //没有折叠名称无效
                return null;
            }
            if (typeof rule.foldType === 'function') {
                fold.type = rule.foldType({
                    value: result,
                    text: text,
                    index: match.index,
                    state: flag
                });
            } else if (!(rule.foldType instanceof Array)) {
                fold.type = flag ? (flag === 'start' ? -1 : 1) : rule.foldType;
            }
            if (fold.type == 1) {
                fold = _checkFold(resultObj, fold);
            }
        }
        return fold;

        function _checkFold(resultObj, fold) {
            let folds = resultObj.folds;
            if (folds) {
                for (let i = folds.length - 1; i >= 0; i--) {
                    // 同行折叠无效
                    if (folds[i].name == fold.name && folds[i].type == -1) {
                        resultObj.folds = folds.slice(0, i);
                        fold = null;
                        break;
                    }
                }
            }
            return fold;
        }
    }
    /**
     * 获取子表达式索引位置
     * @param {Array} match 正则exec结果
     */
    getChildExpIndex(match) {
        if (match.childExpIndex !== undefined) {
            return match.childExpIndex;
        }
        let captures = match.slice(1);
        let hasChildExp = captures.filter((item) => {
            return item
        }).length > 1;
        if (hasChildExp) { //正则里有子表达式
            for (let i = 0; i < captures.length; i++) {
                if (captures[i] != undefined) {
                    captures = captures.slice(i + 1);
                    break;
                }
            }
            for (let i = 0; i < captures.length; i++) {
                if (captures[i] != undefined) {
                    match.childExpIndex = i;
                    return i;
                }
            }
        }
        match.childExpIndex = -1;
        return -1;
    }
    getRegex(ruleId, preRuleId, states) {
        let regex = null;
        let rule = null;
        let preRule = this.ruleIdMap[preRuleId];
        if (preRule && states.indexOf(preRuleId) == -1 && preRule.startBy) { //以preRule的完整匹配为开始节点
            rule = this.ruleIdMap[preRule.startBy];
            states.push(rule.ruleId);
            ruleId = rule.ruleId;
        }
        if (preRule && states.indexOf(preRuleId) == -1 && preRule.endBy) { //以preRule的完整匹配为结束节点
            states.pop();
            ruleId = states.peek();
        }
        if (ruleId) {
            rule = this.ruleIdMap[ruleId];
            if (rule.childRule) {
                regex = rule.childRule.regex;
            } else {
                regex = rule.endRegex;
            }
        } else {
            regex = this.rules.regex;
        }
        return regex;
    }
}