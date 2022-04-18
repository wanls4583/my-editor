/*
 * @Author: lisong
 * @Date: 2021-12-15 11:39:41
 * @Description:
 */
import Util from '@/common/Util';
import * as vsctm from 'vscode-textmate';
import * as oniguruma from 'vscode-oniguruma';
import fold from '../fold';

const require = window.require || window.parent.require || function () {};
const fs = require('fs');
const path = require('path');
let globalData = null;

export default class {
    constructor(editor, context) {
        globalData = window.globalData;
        this.currentLine = 1;
        this.initRegistry();
        this.initProperties(editor, context);
        this.initLanguage(editor.language);
    }
    initRegistry() {
        const wasmBin = fs.readFileSync(path.join(globalData.dirname, 'lib/onig.wasm')).buffer;
        const vscodeOnigurumaLib = oniguruma.loadWASM(wasmBin).then(() => {
            return {
                createOnigScanner(patterns) {
                    return new oniguruma.OnigScanner(patterns);
                },
                createOnigString(s) {
                    return new oniguruma.OnigString(s);
                },
            };
        });
        this.registry = new vsctm.Registry({
            onigLib: vscodeOnigurumaLib,
            loadGrammar: (scopeName) => {
                let language = Util.getLanguageByScopeName(globalData.scopeFileList, scopeName);
                if (language) {
                    return Util.readFile(language.path).then((data) => vsctm.parseRawGrammar(data.toString(), language.path));
                }
                return null;
            },
        });
    }
    initLanguage(language) {
        if (this.language === language) {
            return;
        }
        this.language = language;
        this.grammar = null;
        this.foldMap = {};
        language = Util.getLanguageById(globalData.languageList, language);
        this.scopeName = (language && language.scopeName) || '';
        if (this.scopeName) {
            return this.registry.loadGrammar(this.scopeName).then((grammar) => {
                if (language.configPath) {
                    return Util.loadJsonFile(language.configPath).then((data) => {
                        this.grammar = grammar;
                        this.initLanguageConifg(data);
                    });
                }
            });
        }
        return Promise.resolve();
    }
    initProperties(editor, context) {
        Util.defineProperties(this, editor, ['startLine', 'maxVisibleLines', 'maxLine', 'renderLine', '$nextTick']);
        Util.defineProperties(this, context, ['htmls']);
    }
    initLanguageConifg(data) {
        let type = 1;
        let source = [];
        if (data.comments && data.comments.blockComment) {
            source.push(data.comments.blockComment[0]);
            source.push(data.comments.blockComment[1]);
            this.foldMap[data.comments.blockComment[0]] = -type;
            this.foldMap[data.comments.blockComment[1]] = type;
            type++;
        }
        if (data.brackets) {
            data.brackets.forEach((item) => {
                source.push(item[0]);
                source.push(item[1]);
                this.foldMap[item[0]] = -type;
                this.foldMap[item[1]] = type;
                type++;
            });
        }
        source = source.join('|');
        source = source.replace(/[\{\}\(\)\[\]\$\*\+\?]/g,'\\$&');
        console.log(source)
        this.foldReg = new RegExp(source);
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
            this.tokenizeLines(this.startLine, this.startLine + this.maxVisibleLines, this.currentLine);
        });
    }
    tokenizeLines(startLine, endLine, currentLine) {
        let processedLines = 0;
        let processedTime = Date.now();
        endLine = endLine || this.maxLine;
        endLine = endLine > this.maxLine ? this.maxLine : endLine;
        cancelIdleCallback(this.tokenizeLines.timer);
        if (this.scopeName && !this.grammar) {
            this.tokenizeLines.timer = setTimeout(() => {
                this.tokenizeLines(startLine, endLine, currentLine);
            });
            return;
        }
        while (startLine <= endLine) {
            let lineObj = this.htmls[startLine - 1];
            if (!lineObj.tokens) {
                //文本超过一万时跳过高亮
                let data = this.tokenizeLine(startLine);
                lineObj.tokens = data.tokens;
                lineObj.folds = data.folds;
                if (this.checkLineVisible(startLine)) {
                    lineObj.tokens = this.splitLongToken(lineObj.tokens);
                    lineObj.html = this.creatHtml(lineObj.tokens, lineObj.text);
                    this.renderLine(lineObj.lineId);
                    lineObj.nowTheme = globalData.nowTheme.value;
                } else {
                    lineObj.nowTheme = '';
                }
                if (!lineObj.states || (lineObj.states.equals && !lineObj.states.equals(data.states)) || lineObj.states.toString() !== data.states.toString()) {
                    lineObj.states = data.states;
                    lineObj = this.htmls[startLine];
                    if (lineObj) {
                        lineObj.tokens = null;
                    }
                }
                processedLines++;
                // 避免卡顿
                if (processedLines % 5 == 0 && Date.now() - processedTime >= 30) {
                    startLine++;
                    break;
                }
            } else if (lineObj.nowTheme !== globalData.nowTheme.value) {
                if (this.checkLineVisible(startLine)) {
                    lineObj.tokens = this.splitLongToken(lineObj.tokens);
                    lineObj.html = this.creatHtml(lineObj.tokens, lineObj.text);
                    this.renderLine(lineObj.lineId);
                    lineObj.nowTheme = globalData.nowTheme.value;
                } else {
                    lineObj.nowTheme = '';
                }
            }
            startLine++;
        }
        this.currentLine = currentLine || startLine;
        if (startLine <= endLine) {
            this.tokenizeLines.timer = requestIdleCallback(() => {
                this.tokenizeLines(startLine, endLine, currentLine);
            });
        } else if (currentLine !== undefined) {
            this.tokenizeLines.timer = requestIdleCallback(() => {
                this.tokenizeLines(currentLine);
            });
        }
    }
    creatHtml(tokens, lineText) {
        return tokens
            .map((item) => {
                let selector = '';
                let value = lineText.substring(item.startIndex, item.endIndex);
                if (item.scopes[0] === 'plain') {
                    selector = 'my-plain';
                } else if (item.scopes[0] === 'selected') {
                    selector = 'my-select-fg';
                } else {
                    selector = _getSelector(item.scopes);
                    selector = (selector && `my-scope-${selector.scopeId}`) || '';
                }
                return `<span class="${selector}" data-column="${item.startIndex}">${Util.htmlTrans(value)}</span>`;
            })
            .join('');

        function _getSelector(scopes) {
            let result = null;
            let selector = '';
            for (let i = scopes.length - 1; i >= 0; i--) {
                if (selector) {
                    selector = scopes[i] + ' ' + selector;
                } else {
                    selector = scopes[i];
                }
                let exec = globalData.scopeReg.exec(selector);
                if (exec) {
                    let scopeId = _getScopeId(exec.groups);
                    let _result = globalData.scopeIdMap[scopeId];
                    if (!result || _result.level - result.level > 900) {
                        result = _result;
                    }
                }
            }
            return result;
        }

        function _getScopeId(groups) {
            for (let key in groups) {
                if (groups[key]) {
                    return key.split('_')[1];
                }
            }
        }
    }
    tokenizeLine(line) {
        let lineText = this.htmls[line - 1].text;
        if (lineText.length > 10000 || !this.scopeName) {
            return {
                tokens: [
                    {
                        scopes: ['plain'],
                        startIndex: 0,
                        endIndex: lineText.length,
                    },
                ],
                folds: [],
                states: vsctm.INITIAL,
            };
        }
        let states = (line > 1 && this.htmls[line - 2].states) || vsctm.INITIAL;
        let lineTokens = this.grammar.tokenizeLine(lineText, states);
        let folds = [];
        states = lineTokens.ruleStack;
        if (this.foldReg && this.foldReg.test(lineText)) {
            lineTokens.tokens.forEach((token) => {
                let text = lineText.slice(token.startIndex, token.endIndex);
                if (this.foldMap[text]) {
                    folds.push({
                        line: line,
                        startIndex: token.startIndex,
                        endIndex: token.endIndex,
                        type: this.foldMap[text],
                    });
                }
            });
        }
        return {
            tokens: lineTokens.tokens,
            folds: folds,
            states: states,
        };
    }
    splitLongToken(tokens) {
        let result = [];
        tokens.forEach((token) => {
            let length = token.endIndex - token.startIndex;
            if (length > 100) {
                //将文本数量大于100的token分隔
                let startCol = token.startIndex;
                let count = Math.floor(length / 100);
                for (let i = 0; i < count; i++) {
                    let startIndex = i * 100;
                    let endIndex = (i + 1) * 100;
                    endIndex = endIndex > token.endIndex ? token.endIndex : endIndex;
                    result.push({
                        startIndex: startIndex + startCol,
                        endIndex: endIndex,
                        scopes: token.scopes,
                    });
                }
                count = count * 100;
                if (count < length) {
                    result.push({
                        startIndex: count + startCol,
                        endIndex: token.endIndex,
                        scopes: token.scopes,
                    });
                }
            } else {
                result.push(token);
            }
        });
        return result;
    }
    checkLineVisible(line) {
        return line >= this.startLine && line <= this.startLine + this.maxVisibleLines;
    }
}
