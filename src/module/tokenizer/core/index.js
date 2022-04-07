/*
 * @Author: lisong
 * @Date: 2021-12-15 11:39:41
 * @Description: 
 */
import Util from '@/common/Util';
const vsctm = require('vscode-textmate');
const oniguruma = require('vscode-oniguruma');

const require = window.require || window.parent.require || function () { };
const fs = require('fs');
const path = require('path');

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
                        let type = item.type.join('.');
                        return `<span class="${type.split('.').join(' ')}" data-column="${item.column}">${Util.htmlTrans(item.value)}</span>`;
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
                    console.log(startLine);
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
        let startPosition = 0;
        let preStart = 0;
        let preEnd = 0;
        let preRule = null;
        let lineObj = this.htmls[line - 1];
        let states = (line > 1 && this.htmls[line - 2].states || []).slice(0);
        let resultObj = {
            tokens: [],
            folds: []
        }
        if (lineObj.text.length > 10000 || this.language == 'plain') {
            return {
                tokens: this.splitLongToken([{
                    type: 'plain',
                    column: 0,
                    value: lineObj.text,
                    state: states.peek()
                }]),
                folds: [],
                states: states
            }
        }
        let scanner = this.getRegex(states);
        while (match = scanner.findNextMatchSync(lineObj.text, startPosition)) {
            let side = this.firstIsEnd && match.index === 0 ? 'end' : 'begin';
            let rule = this.nowCombRegexRule[match.index];
            rule = this.ruleIdMap[rule];
            if (preEnd < match.captureIndices[0].start) { //普通文本
                let value = lineObj.text.slice(preEnd, match.captureIndices[0].start);
                resultObj.tokens.push({
                    value: value,
                    column: preEnd,
                    state: states.peek(),
                    type: this.getTokenType({
                        states: states
                    })
                });
            }
            this.addToken({
                rule: rule,
                states: states,
                match: match,
                side: side,
                text: lineObj.text,
                tokens: resultObj.tokens
            });
            if (rule.begin && rule.end) { //多行token-end
                if (side === 'end') { //多行token尾
                    states.pop();
                } else { //多行token-begin
                    states.push(rule.ruleId);
                }
            }
            if (resultObj.tokens.length) {
                preEnd = resultObj.tokens.peek();
                preEnd = preEnd.column + preEnd.value.length;
            }
            if (match.captureIndices[0].start === match.captureIndices[0].end &&
                side === 'begin' && preStart === match.captureIndices[0].start &&
                preRule && preRule.ruleId === rule.ruleId) {
                // 有些规则可能没有结果，只是标识进入某一个规则块，
                // 如果其子规则也有该规则，则会进入死循环
                startPosition++;
            } else {
                startPosition = match.captureIndices[0].end;
            }
            scanner = this.getRegex(states, rule.ruleId);
            preStart = match.captureIndices[0].start;
            preRule = rule;
        }
        if (!resultObj.tokens.length && states.length) { // 整行被多行token包裹
            resultObj.tokens.push({
                value: lineObj.text,
                column: 0,
                state: states.peek(),
                type: this.getTokenType({
                    states: states
                })
            });
        } else if (preEnd < lineObj.text.length) { //文本末尾
            var value = lineObj.text.slice(preEnd);
            resultObj.tokens.push({
                value: value,
                column: preEnd,
                state: states.peek(),
                type: this.getTokenType({
                    states: states
                })
            });
        }
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
                        type: token.type,
                        state: token.state
                    });
                }
                count = count * 100;
                if (count < token.value.length) {
                    result.push({
                        column: count + startCol,
                        value: token.value.slice(count),
                        type: token.type,
                        state: token.state
                    });
                }
            } else {
                result.push(token);
            }
        });
        return result;
    }
    addToken(option) {
        let rule = option.rule;
        let states = option.states;
        let match = option.match;
        let side = option.side;
        let text = option.text;
        let tokens = option.tokens;
        let token = null;
        let type = this.getTokenType({
            rule: rule,
            states: states,
            match: match,
            side: side
        });
        if (rule.beginCaptures && side === 'begin') {
            _addCapturesToken(rule.beginCaptures);
        } else if (rule.endCaptures && side === 'end') {
            _addCapturesToken(rule.endCaptures);
        } else if (rule.captures) {
            _addCapturesToken(rule.captures);
        } else if (match.captureIndices[0].start < match.captureIndices[0].end) {
            token = _createToken.call(this, match.captureIndices[0].start, match.captureIndices[0].end, type);
            tokens.push(token);
        }

        function _createToken(start, end, type) {
            let token = {
                ruleId: rule.ruleId,
                value: text.slice(start, end),
                column: start,
                state: states.peek(),
                type: type
            }
            return token;
        }

        function _addCapturesToken(captures) {
            let _tokens = [];
            for (let i = 0; i < match.captureIndices.length; i++) {
                let start = match.captureIndices[i].start;
                let end = match.captureIndices[i].end;
                if (captures[i] && start < 100000 && start < end) {
                    token = _createToken(start, end, [captures[i].name]);
                    _tokens.push(token);
                }
            }
            _tokens.sort((a, b) => {
                return a.column + a.value.length - (b.column + b.value.length);
            });
            let token = null;
            let tokenPart = [];
            while (token = _tokens.pop()) {
                let preEnd = token.column + token.value.length;
                let _type = token.type.concat(type);
                for (let i = _tokens.length - 1; i >= 0; i--) {
                    let _token = _tokens[i];
                    let end = _token.column + _token.value.length;
                    if (end > token.column) {
                        if (preEnd > end) {
                            tokenPart.push(_createToken(end, preEnd, _type));
                        }
                        _token.type.push(...token.type);
                        preEnd = _token.column;
                    } else {
                        break;
                    }
                }
                if (preEnd > token.column) {
                    tokenPart.push(_createToken(token.column, preEnd, _type));
                }
            }
            tokenPart.sort((a, b) => {
                return a.column - b.column;
            });
            for (let i = 0; i < tokenPart.length; i++) {
                let end = 0;
                token = tokenPart[i];
                tokens.push(token);
                end = token.column + token.value.length;
                token = tokenPart[i + 1];
                if (token && token.column > end) {
                    tokens.push(_createToken(end, token.column, type));
                }
            }
        }
    }
    /**
     * 获取token类型
     * @param {Object} option {
     *  rule: 规则对象,
     *  side: 开始/结束标记,
     *  match: 正则执行后的结果对象
     *  states: 状态栈
     * } 
     */
    getTokenType(option) {
        let rule = option.rule || {};
        let states = option.states || [];
        let type = [];
        rule.name && type.push(rule.name);
        for (let i = states.length - 1; i >= 0; i--) {
            let _rule = this.ruleIdMap[states[i]];
            if (_rule.ruleId !== rule.ruleId) {
                if (_rule.name) {
                    type.push(_rule.name);
                }
                if (_rule.contentName) {
                    type.push(_rule.contentName);
                }
            }
        }
        if (!type.length) {
            type.push('plain')
        };
        return type;
    }
    getRegex(states) {
        return this.getCombRegex(states);
    }
}