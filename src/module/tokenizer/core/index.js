/*
 * @Author: lisong
 * @Date: 2021-12-15 11:39:41
 * @Description: 
 */
import jsRule from '@/module/tokenizer/rules/javascript.js';
import htmlRule from '@/module/tokenizer/rules/html.js';
import cssRule from '@/module/tokenizer/rules/css.js';
import Util from '@/common/Util';
export default class {
    constructor(editor, context) {
        this.currentLine = 1;
        this.languageMap = [];
        this.initProperties(editor, context);
        this.initLanguage(editor.language);
    }
    initLanguage(language) {
        this.language = language;
        clearTimeout(this.tokenizeLines.timer);
        switch (language) {
            case 'JavaScript':
                this.initRules(jsRule);
                break;
            case 'HTML':
                this.initRules(htmlRule);
                break;
            case 'CSS':
                this.initRules(cssRule);
                break;
            default:
                this.language = 'plain';
        }
    }
    initProperties(editor, context) {
        Util.defineProperties(this, editor, ['startLine', 'maxVisibleLines', 'maxLine', 'renderLine', '$nextTick']);
        Util.defineProperties(this, context, ['htmls']);
    }
    initRules(rule) {
        if (this.languageMap[this.language]) {
            let obj = this.languageMap[this.language];
            this.rule = obj.rule;
            this.ruleIdMap = obj.ruleIdMap;
            this.ruleNameMap = obj.ruleNameMap;
            this.regexMap = obj.regexMap;
            return;
        }
        this.ruleId = 1;
        this.ruleIdMap = {};
        this.ruleNameMap = {
            unnamed: true
        };
        this.regexMap = {};
        rule = Util.deepAssign({}, rule);
        this.setRuleNameMap(rule);
        this.setRuleId(rule);
        this.rule = rule;
        this.languageMap[this.language] = {
            rule: this.rule,
            ruleIdMap: this.ruleIdMap,
            ruleNameMap: this.ruleNameMap,
            regexMap: this.regexMap
        };
    }
    setRuleNameMap(rule) {
        if (rule.name) {
            this.ruleNameMap[rule.name] = rule;
        }
        rule.name = rule.name || 'unnamed';
        if (rule.rules instanceof Array) {
            rule.rules.forEach((_item) => {
                if (typeof _item === 'object' && (!_item.name || !this.ruleNameMap[_item.name])) {
                    this.setRuleNameMap(_item);
                }
            });
        }
    }
    setRuleId(rule) {
        // 每个规则生成一个唯一标识
        rule.ruleId = this.ruleId++;
        rule.level = rule.level || 0;
        rule.token = rule.token || '';
        this.ruleIdMap[rule.ruleId] = rule;
        if (rule.start) {
            let start = this.getRule(rule.start);
            if (typeof start === 'object' && !(start instanceof RegExp)) {
                this.setRuleId(start);
                start.startBy = rule.ruleId;
            } else if (typeof rule.start === 'string') {
                rule.start = new RegExp(rule.start);
            }
        }
        if (rule.end) {
            let end = this.getRule(rule.end);
            if (typeof end === 'object' && !(end instanceof RegExp)) {
                this.setRuleId(end);
                end.endBy = rule.ruleId;
            } else if (typeof rule.end === 'string') {
                rule.end = new RegExp(rule.end);
            }
        }
        if (rule.rules) {
            let rules = this.getRule(rule.rules);
            if (rules) {
                rules = rules instanceof Array ? rules : rules.rules;
                rules = rules.map((_item) => {
                    if (typeof _item.regex === 'string') {
                        _item.regex = new RegExp(_item.regex);
                    } else {
                        _item = this.getRule(_item);
                    }
                    if (!_item.ruleId) {
                        this.setRuleId(_item);
                    }
                    return _item;
                });
            }
            rule.rules = rules;
        }
    }
    getRule(rule) {
        return typeof rule === 'string' ? this.ruleNameMap[rule] : rule;
    }
    // 组合正则表达式
    getCombRegex(states) {
        states = states || [];
        let statesKey = states + '' || '1';
        let sources = [];
        let sourceMap = {};
        let regexs = [];
        let index = 0;
        let rule = null;
        if (this.regexMap[statesKey]) {
            return this.regexMap[statesKey];
        }
        if (states.length > 1) {
            let resultStates = [];
            while (index < states.length - 1) {
                rule = this.ruleIdMap[states[index + 1]];
                if (rule.startBy === states[index] || rule.endBy === states[index]) { //处于同一层级
                    index++;
                    continue;
                }
                resultStates.push(states[index]);
                index++;
            }
            resultStates.push(states[index]);
            states = resultStates;
        }
        if (states.length > 0) {
            rule = this.ruleIdMap[states.peek()];
            states.length && regexs.push(this.getEndRegex(rule));
            for (let i = 0; i < states.length - 1; i++) {
                if (this.ruleIdMap[states[i]].prior) { //可以提前结束子规则块
                    regexs.push(this.getEndRegex(this.ruleIdMap[states[i]]));
                }
            }
        } else {
            rule = this.rule;
        }
        rule.rules && rule.rules.forEach((item) => {
            regexs.push(this.getStartRegex(item));
        });
        regexs.forEach((item) => {
            let side = item.side === -1 ? 'start' : 'end';
            if (!sourceMap[item.ruleId] || sourceMap[item.ruleId] !== side) {
                sources.push(`?<${side}_${item.ruleId}>${item.regex.source}`);
                sourceMap[item.ruleId] = side;
            }
        });
        this.regexMap[statesKey] = new RegExp(`(${sources.join(')|(')})`, 'g');
        return this.regexMap[statesKey];
    }
    getStartRegex(rule) {
        let start = null;
        rule = this.getRule(rule);
        start = this.getRule(rule.start);
        if (rule.regex instanceof RegExp) {
            return {
                ruleId: rule.ruleId,
                regex: rule.regex,
                side: -1
            }
        } else if (start instanceof RegExp) {
            return {
                ruleId: rule.ruleId,
                regex: start,
                side: -1
            };
        } else if (start.startBy) {
            return this.getStartRegex(start);
        }
    }
    getEndRegex(rule, side) {
        let end = null;
        rule = this.getRule(rule);
        end = this.getRule(rule.end);
        if (rule.regex instanceof RegExp) {
            return {
                ruleId: rule.ruleId,
                regex: rule.regex,
                side: side || 1
            }
        } else if (end instanceof RegExp) {
            return {
                ruleId: rule.ruleId,
                regex: end,
                side: side || 1
            };
        } else if (end.endBy) {
            return this.getStartRegex(end, -1);
        }
    }
    onInsertContentAfter(nowLine, newLine) {
        if (nowLine <= this.currentLine) {
            this.currentLine = nowLine;
            clearTimeout(this.tokenizeLines.timer);
            this.$nextTick(() => {
                if (this.currentLine !== nowLine) {
                    return;
                }
                this.tokenizeLines(nowLine);
            });
        } else {
            this.tokenizeVisibleLins();
        }
    }
    onDeleteContentAfter(nowLine, newLine) {
        if (newLine <= this.currentLine) {
            this.currentLine = newLine;
            clearTimeout(this.tokenizeLines.timer);
            this.$nextTick(() => {
                if (this.currentLine !== newLine) {
                    return;
                }
                this.tokenizeLines(newLine);
            });
        } else {
            this.tokenizeVisibleLins();
        }
    }
    onScroll() {
        this.tokenizeVisibleLins();
    }
    tokenizeVisibleLins() {
        let tokenizeVisibleLinsId = this.tokenizeVisibleLins.id + 1 || 1;
        this.tokenizeVisibleLins.id = tokenizeVisibleLinsId;
        this.$nextTick(() => {
            if (this.tokenizeVisibleLins.id !== tokenizeVisibleLinsId) {
                return;
            }
            let currentLine = this.currentLine;
            this.tokenizeLines(this.startLine, this.startLine + this.maxVisibleLines);
            this.currentLine = currentLine;
        });
    }
    tokenizeLines(startLine, endLine) {
        let processedLines = 0;
        let processedTime = Date.now();
        endLine = endLine || this.maxLine;
        endLine = endLine > this.maxLine ? this.maxLine : endLine;
        while (startLine <= endLine) {
            let lineObj = this.htmls[startLine - 1];
            if (!lineObj.tokens) { //文本超过一万时跳过高亮
                let data = this.tokenizeLine(startLine);
                lineObj.tokens = data.tokens;
                lineObj.folds = data.folds;
                lineObj.html = data.tokens.map((item) => {
                    let rule = this.ruleIdMap && this.ruleIdMap[item.ruleId];
                    if (rule && typeof rule.value === 'function') {
                        return rule.value(item.value);
                    } else {
                        return `<span class="${item.type.split('.').join(' ')}" data-column="${item.column}">${Util.htmlTrans(item.value)}</span>`;
                    }
                }).join('');
                this.renderLine(lineObj.lineId);
                if (lineObj.states + '' != data.states + '') {
                    lineObj.states = data.states;
                    lineObj = this.htmls[startLine];
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
        let preRule = null;
        let preIndex = 0;
        let newStates = [];
        let states = (line > 1 && this.htmls[line - 2].states || []).slice(0);
        let lineObj = this.htmls[line - 1];
        let resultObj = {
            tokens: [],
            folds: []
        }
        if (lineObj.text.length > 10000 || this.language == 'plain') {
            return {
                tokens: this.splitLongToken([{
                    type: 'plain',
                    column: 0,
                    value: lineObj.text
                }]),
                folds: [],
                states: states
            }
        }
        let regex = this.getRegex(states);
        while (match = regex.exec(lineObj.text)) {
            let token = null;
            let fold = null;
            let valid = true;
            let side = '';
            for (let ruleId in match.groups) {
                if (match.groups[ruleId] == undefined) {
                    continue;
                }
                side = ruleId.split('_')[0];
                ruleId = ruleId.split('_')[1] - 0;
                rule = this.ruleIdMap[ruleId];
                if (preEnd < match.index) { //普通文本
                    let value = lineObj.text.slice(preEnd, match.index);
                    resultObj.tokens.push({
                        value: value,
                        column: preEnd,
                        type: this.getTokenType({
                            rule: this.ruleIdMap[states.peek()],
                            index: preEnd,
                            value: value,
                            line: line
                        })
                    });
                    preEnd = match.index;
                }
                if (typeof rule.valid === 'function') {
                    valid = rule.valid(this.getFunParam(match.index, match[0], line, side));
                }
                if (!valid) {
                    break;
                }
                fold = this.getFold(rule, match, resultObj, line, side);
                token = this.getToken(rule, match, states, newStates, resultObj, line, side);
                token.value && resultObj.tokens.push(token);
                fold && resultObj.folds.push(fold);
                preEnd = match.index + match[0].length;
                break;
            }
            if (!match[0] && side === 'start' && preIndex === match.index &&
                preRule && preRule.ruleId === rule.ruleId) {
                // 有些规则可能没有结果，只是标识进入某一个规则块，
                // 如果其子规则也有该规则，则会进入死循环
                break;
            }
            if (!valid) { //跳过当前无效结果
                continue;
            }
            lastIndex = regex.lastIndex;
            regex.lastIndex = 0;
            regex = this.getRegex(states, rule.ruleId);
            regex.lastIndex = lastIndex;
            preRule = rule;
            preIndex = match.index;
        }
        if (!resultObj.tokens.length && states.length) { // 整行被多行token包裹
            resultObj.tokens.push({
                value: lineObj.text,
                column: 0,
                type: this.getTokenType({
                    rule: this.ruleIdMap[states.peek()],
                    value: lineObj.text,
                    line: line
                })
            });
        } else if (preEnd < lineObj.text.length) { //文本末尾
            var value = lineObj.text.slice(preEnd);
            resultObj.tokens.push({
                value: value,
                column: preEnd,
                type: this.getTokenType({
                    rule: this.ruleIdMap[states.peek()],
                    index: preEnd,
                    value: value,
                    line: line
                })
            });
        }
        regex.lastIndex = 0;
        return {
            tokens: this.splitLongToken(resultObj.tokens),
            folds: resultObj.folds,
            states: states
        };
    }
    splitLongToken(tokens) {
        let result = [];
        tokens.forEach((token) => {
            if (token.value.length > 100) { //将文本数量大于100的token分隔
                let startCol = token.column;
                let count = Math.floor(token.value.length / 100);
                for (let i = 0; i < count; i++) {
                    let column = i * 100;
                    result.push({
                        column: column + startCol,
                        value: token.value.slice(column, column + 100),
                        type: token.type
                    });
                }
                count = count * 100;
                if (count < token.value.length) {
                    result.push({
                        column: count + startCol,
                        value: token.value.slice(count),
                        type: token.type
                    });
                }
            } else {
                result.push(token);
            }
        });
        return result;
    }
    /**
     * 获取折叠标记对象
     * @param {Object} rule 规则对象
     * @param {Object} match 正则结果对象
     * @param {Array} states 状态栈
     * @param {Array} newStates 当前行的新增状态栈
     * @param {Object} resultObj 结果对象
     * @param {Number} line 当前行
     * @param {String} side 开始/结束标记
     */
    getToken(rule, match, states, newStates, resultObj, line, side) {
        let result = match[0];
        let text = this.htmls[line - 1].text;
        let token = {
            ruleId: rule.ruleId,
            value: result,
            column: match.index
        };
        if (rule.start && rule.end) { //多行token-end
            if (side === 'end') { //多行token尾
                while (states.peek() != rule.ruleId) {
                    states.pop();
                }
                states.pop();
                if (!rule.rules) { //无子节点
                    if (newStates.indexOf(rule.ruleId) > -1) { //在同一行匹配
                        let value = '';
                        token = resultObj.tokens.pop();
                        value = token.value;
                        if (token.ruleId !== rule.ruleId) {
                            token = resultObj.tokens.pop();
                            value = token.value + value;
                        }
                        token.value = value + result;
                    } else { //跨行匹配
                        resultObj.tokens.pop()
                        token.value = text.slice(0, match.index + result.length);
                        token.column = 0;
                    }
                }
            } else { //多行token-start
                states.push(rule.ruleId);
                newStates.push(rule.ruleId);
            }
        }
        token.type = this.getTokenType({
            rule: rule,
            index: match.index,
            value: token.value,
            line: line,
            side: side
        });
        return token;
    }
    /**
     * 获取token类型
     * @param {Object} option {
     *  rule: 规则对象,
     *  index: value在text中的开始索引,
     *  text: 当前行的文本,
     *  value: token的文本范围,
     *  side: 开始/结束标记,
     *  match: 正则执行后的结果对象
     * } 
     */
    getTokenType(option) {
        let rule = option.rule;
        let index = option.index || 0;
        let value = option.value;
        let line = option.line;
        let side = option.side;
        let type = '';
        let param = this.getFunParam(index, value, line)
        if (!rule) {
            return 'plain';
        }
        if (typeof rule.token == 'function') {
            type = rule.token(param);
        } else {
            if (side === 'start' && rule.startToken) {
                type = typeof rule.startToken === 'function' ? rule.startToken(param) : rule.startToken;
            } else if (side === 'end' && rule.endToken) {
                type = typeof rule.endToken === 'function' ? rule.endToken(param) : rule.endToken;
            } else {
                type = rule.token;
            }
        }
        return type;
    }
    /**
     * 获取折叠标记对象
     * @param {Object} rule 规则对象
     * @param {Object} match 正则结果对象
     * @param {Object} resultObj 结果对象
     * @param {Number} line 当前行
     * @param {String} side 开始/结束标记
     */
    getFold(rule, match, resultObj, line, side) {
        let result = match[0];
        let fold = null;
        if (rule.start && rule.end) { //多行token被匹配
            if (rule.foldName) { //多行匹配可折叠
                fold = {
                    start: match.index,
                    end: match.index + result.length,
                    value: result
                };
            }
        } else if (rule.foldName && rule.foldType) { //折叠标记
            fold = {
                start: match.index,
                end: match.index + result.length,
                value: result
            };
        }
        if (fold) {
            let foldName = this.getFoldName(rule, match, line);
            if (!foldName) { //没有折叠名称无效
                return null;
            }
            fold.name = foldName;
            fold.type = this.getFoldType(rule, match, line, side);
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
     * 获取折叠名称[唯一标识]
     * @param {Object} rule 规则对象
     * @param {Object} match 正则执行后的结果对象
     * @param {Number} line 当前行
     */
    getFoldName(rule, match, line) {
        let foldName = '';
        if (typeof rule.foldName === 'function') {
            foldName = rule.foldName(this.getFunParam(match.index, match[0], line));
        } else {
            foldName = rule.foldName;
        }
        return foldName;
    }
    /**
     * 获取折叠类型[-1:首,1:尾]
     * @param {Object} rule 规则对象
     * @param {Object} match 正则执行后的结果对象
     * @param {Number} line 当前行
     * @param {String} side 开始/结束标记
     */
    getFoldType(rule, match, line, side) {
        let foldType = '';
        if (typeof rule.foldType === 'function') {
            foldType = rule.foldType(this.getFunParam(match.index, match[0], line));
        } else if (rule.start && rule.end) {
            foldType = side == 'start' ? -1 : 1;
        } else {
            foldType = rule.foldType;
        }
        return foldType;
    }
    getRegex(states, preRuleId) {
        let preRule = this.ruleIdMap[preRuleId];
        while (preRule && states.indexOf(preRule.ruleId) == -1 && preRule.endBy) {
            while (states.peek() != preRule.endBy) {
                states.pop();
            }
            states.pop();
            preRule = this.ruleIdMap[preRule.endBy];
        }
        if (preRule && states.indexOf(preRule.ruleId) == -1 && preRule.startBy) {
            states.push(preRule.startBy);
        }
        return this.getCombRegex(states);
    }
    getFunParam(index, value, line, side) {
        return {
            index: index,
            value: value,
            line: line,
            side: side,
            getLineText: (line) => {
                return this.htmls[line - 1] && this.htmls[line - 1].text;
            },
            getLineTokens: (line) => {
                return this.htmls[line - 1] && this.htmls[line - 1].tokens && this.htmls[line - 1].tokens.map((item) => {
                    return {
                        type: item.type,
                        value: item.value
                    };
                });
            }
        }
    }
}