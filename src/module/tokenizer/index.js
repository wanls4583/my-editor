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
                    if (language.configPath) {
                        return Util.loadJsonFile(language.configPath).then((data) => {
                            this.sourceFoldMap[language.scopeName] = {};
                            this.initLanguageConifg(this.sourceFoldMap[language.scopeName], data);
                            return Util.readFile(language.path).then((data) => vsctm.parseRawGrammar(data.toString(), language.path));
                        });
                    } else {
                        return Util.readFile(language.path).then((data) => vsctm.parseRawGrammar(data.toString(), language.path));
                    }
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
        this.foldType = 1;
        this.sourceFoldMap = { allFoldMap: {} };
        language = Util.getLanguageById(globalData.languageList, language);
        this.scopeName = (language && language.scopeName) || '';
        if (this.scopeName) {
            return this.registry.loadGrammar(this.scopeName).then((grammar) => {
                this.grammar = grammar;
            });
        }
        return Promise.resolve();
    }
    initProperties(editor, context) {
        Util.defineProperties(this, editor, ['startLine', 'maxVisibleLines', 'maxLine', 'renderLine', 'folder', '$nextTick']);
        Util.defineProperties(this, context, ['htmls']);
    }
    initLanguageConifg(foldMap, data) {
        let source = [];
        if (data.comments && data.comments.blockComment) {
            source.push(data.comments.blockComment[0]);
            source.push(data.comments.blockComment[1]);
            foldMap[data.comments.blockComment[0]] = -this.foldType;
            foldMap[data.comments.blockComment[1]] = this.foldType;
            this.sourceFoldMap.allFoldMap[data.comments.blockComment[0]] = true;
            this.sourceFoldMap.allFoldMap[data.comments.blockComment[1]] = true;
            this.foldType++;
        }
        if (data.brackets) {
            data.brackets.forEach((item) => {
                if (foldMap[item[1]]) {
                    if (!foldMap[item[0]]) {
                        source.push(item[0]);
                        foldMap[item[0]] = -foldMap[item[1]];
                    }
                } else {
                    source.push(item[0]);
                    source.push(item[1]);
                    foldMap[item[0]] = -this.foldType;
                    foldMap[item[1]] = this.foldType;
                    this.foldType++;
                }
                this.sourceFoldMap.allFoldMap[item[0]] = true;
                this.sourceFoldMap.allFoldMap[item[1]] = true;
            });
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
            let endLine = this.startLine + this.maxVisibleLines;
            endLine = this.folder.getRealLine(endLine);
            this.tokenizeLines(this.startLine, endLine, this.currentLine);
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
                    lineObj.html = this.createHtml(lineObj.tokens, lineObj.text);
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
    createHtml(tokens, lineText) {
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
        lineTokens.tokens.forEach((token) => {
            let text = lineText.slice(token.startIndex, token.endIndex);
            if (this.sourceFoldMap.allFoldMap[text]) {
                for (let i = token.scopes.length - 1; i >= 0; i--) {
                    if (this.sourceFoldMap[token.scopes[i]] && this.sourceFoldMap[token.scopes[i]][text]) {
                        folds.push({
                            startIndex: token.startIndex,
                            endIndex: token.endIndex,
                            type: this.sourceFoldMap[token.scopes[i]][text],
                        });
                        break;
                    }
                }
            }
        });
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
        let endLine = this.startLine + this.maxVisibleLines;
        endLine = this.folder.getRealLine(endLine);
        if (this.folder.getLineInFold(line)) {
            //该行被包裹
            return false;
        }
        return line >= this.startLine && line <= endLine;
    }
}
