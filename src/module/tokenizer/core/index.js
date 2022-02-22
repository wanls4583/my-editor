/*
 * @Author: lisong
 * @Date: 2021-12-15 11:39:41
 * @Description: 
 */
import jsRules from '@/module/tokenizer/rules/javascript.js';
import htmlRules from '@/module/tokenizer/rules/html.js';
import cssRules from '@/module/tokenizer/rules/css.js';
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
    initProperties(editor, context) {
        Util.defineProperties(this, editor, ['startLine', 'maxVisibleLines', 'maxLine', 'renderLine', '$nextTick']);
        Util.defineProperties(this, context, ['htmls']);
    }
    initRules(rules) {
        if (this.languageMap[this.language]) {
            let obj = this.languageMap[this.language];
            this.rules = obj.rules;
            this.ruleIdMap = obj.ruleIdMap;
            this.regexMap = obj.regexMap;
            return;
        }
        this.ruleId = 1;
        this.ruleIdMap = {};
        this.regexMap = {};
        this.rules = Util.deepAssign({}, rules);
        this.rules.rules.map((item) => {
            this.setRuleId(item);
        });
        this.languageMap[this.language] = {
            rules: this.rules,
            ruleIdMap: this.ruleIdMap,
            regexMap: this.regexMap
        };
    }
    setRuleId(rule) {
        // 每个规则生成一个唯一标识
        rule.ruleId = this.ruleId++;
        rule.level = rule.level || 0;
        rule.token = rule.token || '';
        this.ruleIdMap[rule.ruleId] = rule;
        if (typeof rule.start === 'object' && !(rule.start instanceof RegExp)) {
            this.setRuleId(rule.start);
            rule.start.startBy = rule.ruleId;
        }
        if (typeof rule.end === 'object' && !(rule.end instanceof RegExp)) {
            this.setRuleId(rule.end);
            rule.end.endBy = rule.ruleId;
        }
        if (rule.childRule && rule.childRule.rules) {
            rule.childRule.rules.map((_item) => {
                !_item.ruleId && this.setRuleId(_item);
            });
            rule.rules = rule.childRule.rules;
        }
    }
    // 组合正则表达式
    getCombRegex(states) {
        states = states || [];
        let statesKey = states + '' || '0';
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
        index = states.length - 1;
        rule = states.length && this.ruleIdMap[states.peek()] || this.rules;
        while (index >= 0 && this.ruleIdMap[states[index]].level >= rule.level) {
            regexs.push(this.getEndRegex(this.ruleIdMap[states[index]]));
            index--;
        }
        regexs.reverse();
        rule.rules && rule.rules.map((item) => {
            regexs.push(this.getStartRegex(item));
        });
        regexs.map((item) => {
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
        if (rule.regex instanceof RegExp) {
            return {
                ruleId: rule.ruleId,
                regex: rule.regex,
                side: -1
            }
        } else if (rule.start instanceof RegExp) {
            return {
                ruleId: rule.ruleId,
                regex: rule.start,
                side: -1
            };
        } else if (rule.start.startBy) {
            return this.getStartRegex(rule.start);
        }
    }
    getEndRegex(rule, side) {
        if (rule.regex instanceof RegExp) {
            return {
                ruleId: rule.ruleId,
                regex: rule.regex,
                side: side || 1
            }
        } else if (rule.end instanceof RegExp) {
            return {
                ruleId: rule.ruleId,
                regex: rule.end,
                side: side || 1
            };
        } else if (rule.end.endBy) {
            return this.getStartRegex(rule.end, -1);
        }
    }
    onInsertContentBefore(nowLine) {
        this.onInsertContentBefore.nowLine = nowLine;
    }
    onInsertContentAfter(nowLine) {
        nowLine = this.onInsertContentBefore.nowLine;
        if (this.language == 'plain') {
            return;
        }
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
    onDeleteContentBefore(nowLine) {}
    onDeleteContentAfter(nowLine) {
        if (this.language == 'plain') {
            return;
        }
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
    onScroll() {
        if (this.language == 'plain') {
            return;
        }
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
                    let rule = this.ruleIdMap[item.ruleId];
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
        let newStates = [];
        let states = (line > 1 && this.htmls[line - 2].states || []).slice(0);
        let lineObj = this.htmls[line - 1];
        let regex = this.getRegex(states);
        let resultObj = {
            tokens: [],
            folds: []
        }
        if (lineObj.text.length > 10000) {
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
                // side = this.getSide(rule, states, side);
                if (preEnd < match.index) { //普通文本
                    let value = lineObj.text.slice(preEnd, match.index);
                    resultObj.tokens.push({
                        value: value,
                        column: preEnd,
                        type: this.getTokenType({
                            rule: this.ruleIdMap[states.peek()],
                            index: preEnd,
                            value: value,
                            text: lineObj.text
                        })
                    });
                    preEnd = match.index;
                }
                if (typeof rule.valid === 'function') {
                    valid = rule.valid({
                        index: match.index,
                        text: lineObj.text,
                        value: match[0],
                        side: side
                    });
                    if (!valid) {
                        break;
                    }
                }
                fold = this.getFold(rule, match, states, resultObj, lineObj.text);
                token = this.getToken(rule, match, states, newStates, resultObj, lineObj.text, side);
                resultObj.tokens.push(token);
                fold && resultObj.folds.push(fold);
                preEnd = match.index + match[0].length;
                break;
            }
            if (!match[0]) { //考虑/^$/的情况
                break;
            }
            if (!valid) { //跳过当前无效结果
                continue;
            }
            lastIndex = regex.lastIndex;
            regex.lastIndex = 0;
            regex = this.getRegex(states, rule.ruleId);
            regex.lastIndex = lastIndex;
        }
        if (!resultObj.tokens.length && states.length) { // 整行被多行token包裹
            resultObj.tokens.push({
                value: lineObj.text,
                column: 0,
                type: this.getTokenType({
                    rule: this.ruleIdMap[states.peek()],
                    value: lineObj.text,
                    text: lineObj.text
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
                    text: lineObj.text
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
        tokens.map((token) => {
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
    // getSide(rule, states) {
    //     let index = states.length - 1;
    //     if (states.indexOf(rule.ruleId) == -1) {
    //         return 'start';
    //     }
    //     while (index >= 0 && states[index] != rule.ruleId) {
    //         if (this.ruleIdMap[states[index]].level > rule.level) {
    //             return 'start';
    //         }
    //         index--
    //     }
    //     return 'end';
    // }
    /**
     * 获取折叠标记对象
     * @param {Object} rule 规则对象
     * @param {Object} match 正则结果对象
     * @param {Array} states 状态栈
     * @param {Array} newStates 当前行的新增状态栈
     * @param {Object} resultObj 结果对象
     * @param {String} text 当前行文本
     * @param {String} side 开始/结束标记
     */
    getToken(rule, match, states, newStates, resultObj, text, side) {
        let result = match[0];
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
            text: text,
            match: match,
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
        let value = option.value || option.text;
        let text = option.text;
        let match = option.match;
        let side = option.side || (rule && rule.start && rule.end ? 'start' : '');
        let type = '';
        if (!rule) {
            return 'plain';
        }
        if (typeof rule.token == 'function') {
            type = rule.token({
                value: value,
                index: index,
                text: text,
                side: side
            });
        } else if (rule.token instanceof Array) {
            if (rule.start && rule.end) {
                if (side == 'start') {
                    type = rule.token[0];
                } else {
                    type = rule.token[1];
                }
            } else {
                let expIndex = match && this.getChildExpIndex(match) || -1;
                if (expIndex > -1) {
                    type = rule.token[expIndex];
                } else {
                    type = rule.token.join('.');
                }
            }
        } else {
            type = rule.token;
        }
        return type;
    }
    /**
     * 获取折叠标记对象
     * @param {Object} rule 规则对象
     * @param {Object} match 正则结果对象
     * @param {Array} states 状态栈
     * @param {Object} resultObj 结果对象
     * @param {String} text 当前行文本
     */
    getFold(rule, match, states, resultObj, text) {
        let result = match[0];
        let side = '';
        let fold = null;
        if (rule.start && rule.end) { //多行token被匹配
            side = 'start';
            if (states.indexOf(rule.ruleId) > -1) {
                side = 'end';
            }
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
            let foldName = this.getFoldName(rule, match, text, side);
            if (!foldName) { //没有折叠名称无效
                return null;
            }
            fold.name = foldName;
            fold.type = this.getFoldType(rule, match, text, side);
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
     * @param {String} text 当前行的文本
     * @param {String} side 开始/结束标记
     */
    getFoldName(rule, match, text, side) {
        let foldName = '';
        if (rule.foldName instanceof Array) {
            if (rule.start && rule.end) {
                foldName = side == 'start' ? rule.foldName[0] : rule.foldName[1];
            } else {
                let expIndex = this.getChildExpIndex(match);
                expIndex = expIndex == -1 ? 0 : expIndex;
                foldName = rule.foldName[expIndex];
            }
        } else if (typeof rule.foldName === 'function') {
            foldName = rule.foldName({
                value: match[0],
                text: text,
                index: match.index,
                side: side
            });
        } else {
            foldName = rule.foldName;
        }
        return foldName;
    }
    /**
     * 获取折叠类型[-1:首,1:尾]
     * @param {Object} rule 规则对象
     * @param {Object} match 正则执行后的结果对象
     * @param {String} text 当前行的文本
     * @param {String} side 开始/结束标记
     */
    getFoldType(rule, match, text, side) {
        let foldType = '';
        if (rule.foldType instanceof Array) {
            if (rule.start && rule.end) {
                foldType = side == 'start' ? rule.foldType[0] : rule.foldType[1];
            } else {
                let expIndex = this.getChildExpIndex(match);
                expIndex = expIndex == -1 ? 0 : expIndex;
                foldType = rule.foldType[expIndex];
            }
        } else if (typeof rule.foldType === 'function') {
            foldType = rule.foldType({
                value: match[0],
                text: text,
                index: match.index,
                side: side
            });
        } else if (rule.start && rule.end) {
            foldType = side == 'start' ? -1 : 1;
        } else {
            foldType = rule.foldType;
        }
        return foldType;
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
}