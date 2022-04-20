/*
 * @Author: lisong
 * @Date: 2021-12-15 11:39:41
 * @Description:
 */
import Util from '@/common/Util';
import globalData from '@/data/globalData';
import * as vsctm from 'vscode-textmate';
import * as oniguruma from 'vscode-oniguruma';

const require = window.require || window.parent.require || function () {};
const fs = require('fs');
const path = require('path');


export default class {
    constructor(editor, context) {
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
                            // 每种语言都有对应的折叠标记
                            this.sourceFoldMap[language.scopeName] = {};
                            // 是否存在标记性语言
                            this.hasTextGrammar = this.hasTextGrammar || language.scopeName.startsWith('text');
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
        this.sourceFoldMap = {};
        this.hasTextGrammar = false;
        language = Util.getLanguageById(globalData.languageList, language);
        this.scopeName = (language && language.scopeName) || '';
        if (this.scopeName) {
            if(globalData.grammars[this.scopeName]) {
                let grammarData = globalData.grammars[this.scopeName];
                this.grammar = grammarData.grammar;
                this.sourceFoldMap = grammarData.sourceFoldMap;
                this.hasTextGrammar = grammarData.hasTextGrammar;
            } else {
                return this.registry.loadGrammar(this.scopeName).then((grammar) => {
                    this.grammar = grammar;
                    globalData.grammars[this.scopeName] = {
                        grammar: grammar,
                        sourceFoldMap: this.sourceFoldMap,
                        hasTextGrammar: this.hasTextGrammar
                    }
                });
            }
        }
        return Promise.resolve();
    }
    initProperties(editor, context) {
        Util.defineProperties(this, editor, ['startLine', 'maxVisibleLines', 'maxLine', 'renderLine', 'folder', '$nextTick']);
        Util.defineProperties(this, context, ['htmls']);
    }
    initLanguageConifg(foldMap, data) {
        let source = [];
        foldMap.__comments__ = {
            lineComment: '',
            blockComment: [],
        };
        if (data.comments) {
            if (data.comments.lineComment) {
                source.push(data.comments.lineComment);
                foldMap[data.comments.lineComment] = 0;
                foldMap.__comments__.lineComment = data.comments.lineComment;
            }
            if (data.comments.blockComment) {
                source.push(data.comments.blockComment[0]);
                source.push(data.comments.blockComment[1]);
                foldMap[data.comments.blockComment[0]] = -this.foldType;
                foldMap[data.comments.blockComment[1]] = this.foldType;
                foldMap.__comments__.blockComment = data.comments.blockComment;
                foldMap.__endCommentReg__ = new RegExp(data.comments.blockComment[1].replace(/[\{\}\(\)\[\]\&\?\+\*\\]/g, '\\$&'), 'g');
                this.foldType++;
            }
        }
        if (data.brackets) {
            data.brackets.forEach((item) => {
                if (foldMap[item[0]]) {
                    //相同的前缀
                    if (!foldMap[item[1]]) {
                        source.push(item[1]);
                        foldMap[item[1]] = -foldMap[item[0]];
                    }
                } else if (foldMap[item[1]]) {
                    //相同的后缀
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
            });
        }
        source = source.join('|');
        source = source.replace(/[\{\}\(\)\[\]\&\?\+\*\\]/g, '\\$&');
        foldMap.__foldReg__ = new RegExp(source, 'g');
    }
    onInsertContentAfter(nowLine, newLine) {
        if (nowLine <= this.currentLine) {
            this.currentLine = nowLine;
            clearTimeout(this.tokenizeLinesTimer);
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
            clearTimeout(this.tokenizeLinesTimer);
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
        let tokenizeVisibleLinsId = this.tokenizeVisibleLinsId + 1 || 1;
        this.tokenizeVisibleLinsId = tokenizeVisibleLinsId;
        this.$nextTick(() => {
            if (this.tokenizeVisibleLinsId !== tokenizeVisibleLinsId) {
                return;
            }
            let currentLine = this.currentLine;
            let startLine = this.startLine;
            let endLine = this.startLine + this.maxVisibleLines;
            endLine = this.folder.getRealLine(endLine);
            // 先渲染可视范围内的行
            this.asyncTokenizeLines(startLine, endLine).then(() => {
                startLine = this.startLine - 2000;
                startLine = startLine < 1 ? 1 : startLine;
                // 考虑到当前行可能处于内嵌语法种，渲染前2000行
                if (startLine > currentLine) {
                    this.asyncTokenizeLines(startLine, endLine).then(() => {
                        this.tokenizeLines(currentLine);
                    });
                } else {
                    this.tokenizeLines(currentLine);
                }
            });
        });
    }
    asyncTokenizeLines(startLine, endLine) {
        return new Promise((resolve) => {
            this.tokenizeLines(startLine, endLine, resolve);
        });
    }
    tokenizeLines(startLine, endLine, resolve) {
        let processedLines = 0;
        let processedTime = Date.now();
        endLine = endLine || this.maxLine;
        endLine = endLine > this.maxLine ? this.maxLine : endLine;
        cancelIdleCallback(this.tokenizeLinesTimer);
        if (this.scopeName && !this.grammar) {
            this.tokenizeLinesTimer = setTimeout(() => {
                this.tokenizeLines(startLine, endLine, resolve);
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
                lineObj.stateFold = data.stateFold;
                if (this.checkLineVisible(startLine)) {
                    lineObj.tokens = this.splitLongToken(lineObj.tokens);
                    lineObj.html = this.createHtml(lineObj.tokens, lineObj.text);
                    this.renderLine(lineObj.lineId);
                }
                if (!lineObj.states || (lineObj.states.equals && !lineObj.states.equals(data.states)) || lineObj.states.toString() !== data.states.toString()) {
                    lineObj.states = data.states;
                    lineObj = this.htmls[startLine];
                    if (lineObj) {
                        lineObj.tokens = null;
                        lineObj.html = '';
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
        this.currentLine = startLine;
        if (startLine <= endLine) {
            this.tokenizeLinesTimer = requestIdleCallback(() => {
                this.tokenizeLines(startLine, endLine, resolve);
            });
        } else if (resolve) {
            resolve();
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
        let folds = [];
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
        let stateFold = this.addFold(line, lineTokens.tokens, folds);
        return {
            tokens: lineTokens.tokens,
            states: lineTokens.ruleStack,
            folds: folds,
            stateFold: stateFold,
        };
    }
    addFold(line, tokens, folds) {
        let scopeName = '';
        let startIndex = 0;
        let existTag = false;
        let lineText = this.htmls[line - 1].text;
        let stateFold = line > 1 ? this.htmls[line - 2].stateFold : null;
        outerLoop: for (let index = 0; index < tokens.length; index++) {
            let token = tokens[index];
            let _scopeName = '';
            let foldMap = null;
            for (let i = token.scopes.length - 1; i >= 0; i--) {
                foldMap = this.sourceFoldMap[token.scopes[i]];
                if (!foldMap) {
                    continue;
                }
                _scopeName = token.scopes[i];
                if (scopeName || index === tokens.length - 1) {
                    if (_scopeName !== scopeName || index === tokens.length - 1) {
                        let endIndex = index === tokens.length - 1 ? token.endIndex : token.startIndex;
                        let lastFold = this.addBracket({
                            line: line,
                            foldMap: foldMap,
                            folds: folds,
                            startIndex: startIndex,
                            endIndex: endIndex,
                            stateFold: stateFold,
                            lineText: lineText,
                        });
                        // 单行注释
                        if (lastFold && lastFold.type === Util.constData.LINE_COMMENT) {
                            break outerLoop;
                        }
                        scopeName = token.scopes[i];
                        startIndex = token.startIndex;
                    }
                } else {
                    scopeName = token.scopes[i];
                    startIndex = token.startIndex;
                }
                break;
            }
            if (
                this.addTagFold({
                    token: token,
                    foldMap: foldMap,
                    folds: folds,
                    lineText: lineText,
                })
            ) {
                existTag = true;
            }
        }
        if (existTag) {
            folds.sort((a, b) => {
                return a.startIndex - b.startIndex;
            });
        }
        if (folds.length) {
            return folds.peek().type === Util.constData.BLOCK_COMMENT ? folds.peek() : null;
        } else {
            return stateFold;
        }
    }
    addBracket(option) {
        let foldMap = option.foldMap;
        let folds = option.folds;
        let startIndex = option.startIndex;
        let endIndex = option.endIndex;
        let stateFold = option.stateFold;
        let text = option.lineText.slice(startIndex, endIndex);
        let reg = foldMap.__foldReg__;
        let res = null;
        let preFold = null;
        if (folds.length) {
            preFold = folds.peek();
        } else {
            preFold = stateFold;
        }
        if (preFold && preFold.type === Util.constData.BLOCK_COMMENT && preFold.side < 0) {
            reg = foldMap.__endCommentReg__;
        }
        while ((res = reg.exec(text))) {
            let type = Util.constData.BRACKET;
            if (foldMap.__comments__.lineComment === res[0]) {
                type = Util.constData.LINE_COMMENT;
            } else if (foldMap.__comments__.blockComment[0] === res[0] || foldMap.__comments__.blockComment[1] === res[0]) {
                type = Util.constData.BLOCK_COMMENT;
            }
            folds.push({
                startIndex: startIndex + res.index,
                endIndex: startIndex + res.index + res[0].length,
                side: foldMap[res[0]],
                type: type,
            });
            if (type === Util.constData.BLOCK_COMMENT && foldMap[res[0]] < 0) {
                foldMap.__endCommentReg__.lastIndex = reg.lastIndex;
                reg.lastIndex = 0;
                reg = foldMap.__endCommentReg__;
            } else if (type === Util.constData.LINE_COMMENT) {
                break;
            }
        }
        reg.lastIndex = 0;
        return folds.length && folds.peek();
    }
    addTagFold(option) {
        let token = option.token;
        let folds = option.folds;
        let foldMap = option.foldMap;
        let lineText = option.lineText;
        if (this.hasTextGrammar && token.scopes.peek().startsWith('entity.name.tag')) {
            //html、xml标签名称
            let tag = lineText.slice(token.startIndex, token.endIndex);
            let side = 0;
            if (foldMap[tag]) {
                side = foldMap[tag];
            } else {
                side = this.foldType++;
                foldMap[tag] = side;
            }
            //开始标签
            if (lineText[token.startIndex - 1] === '<') {
                side = -side;
            }
            folds.push({
                startIndex: token.startIndex,
                endIndex: token.endIndex,
                side: side,
                type: Util.constData.TAG,
            });
            return true;
        }
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
