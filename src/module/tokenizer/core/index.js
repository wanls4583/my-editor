/*
 * @Author: lisong
 * @Date: 2021-12-15 11:39:41
 * @Description: 
 */
import Util from '@/common/Util';
import * as vsctm from 'vscode-textmate';
import * as oniguruma from 'vscode-oniguruma';

const require = window.require || window.parent.require || function () {};
const fs = require('fs');

export default class {
    constructor(editor, context) {
        this.currentLine = 1;
        this.languageMap = [];
        this.initRegistry();
        this.initProperties(editor, context);
        this.initLanguage(editor.language);
    }
    initRegistry() {
        const wasmBin = fs.readFileSync('./node_modules/vscode-oniguruma/release/onig.wasm').buffer;
        const vscodeOnigurumaLib = oniguruma.loadWASM(wasmBin).then(() => {
            return {
                createOnigScanner(patterns) {
                    return new oniguruma.OnigScanner(patterns);
                },
                createOnigString(s) {
                    return new oniguruma.OnigString(s);
                }
            };
        });
        this.registry = new vsctm.Registry({
            onigLib: vscodeOnigurumaLib,
            loadGrammar: (scopeName) => {
                if (scopeName === 'source.js') {
                    // https://github.com/textmate/javascript.tmbundle/blob/master/Syntaxes/JavaScript.plist
                    return this.readFile('./src/module/language/JavaScript.plist').then(data => vsctm.parseRawGrammar(data.toString()))
                }
                console.log(`Unknown scope name: ${scopeName}`);
                return null;
            }
        });
    }
    initLanguage(language) {
        if (this.language === language) {
            return;
        }
        switch (language) {
            case 'JavaScript':
                this.registry.loadGrammar('source.js').then(grammar => {
                    this.grammar = grammar;
                });
                this.language = language;
                break;
            default:
                this.language = 'plain';
                break;
        }
    }
    initProperties(editor, context) {
        Util.defineProperties(this, editor, ['startLine', 'maxVisibleLines', 'maxLine', 'renderLine', '$nextTick']);
        Util.defineProperties(this, context, ['htmls']);
    }
    readFile(path) {
        return new Promise((resolve, reject) => {
            fs.readFile(path, (error, data) => error ? reject(error) : resolve(data));
        })
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
        console.log('currentLine', currentLine);
        let processedLines = 0;
        let processedTime = Date.now();
        endLine = endLine || this.maxLine;
        endLine = endLine > this.maxLine ? this.maxLine : endLine;
        clearTimeout(this.tokenizeLines.timer);
        if (this.language !== 'plain' && !this.grammar) {
            this.tokenizeLines.timer = setTimeout(() => {
                this.tokenizeLines(startLine, endLine);
            });
            return;
        }
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
                if (!lineObj.states || !lineObj.states.equals(data.states)) {
                    lineObj.states = data.states;
                    lineObj = this.htmls[startLine];
                    if (lineObj) {
                        lineObj.tokens = null;
                    }
                }
                processedLines++;
                // 避免卡顿
                if (processedLines % 5 == 0 && Date.now() - processedTime >= 20) {
                    startLine++;
                    break;
                }
            }
            startLine++;
        }
        this.currentLine = startLine;
        clearTimeout(this.tokenizeLines.timer);
        if (startLine <= endLine) {
            this.tokenizeLines.timer = setTimeout(() => {
                this.tokenizeLines(startLine, endLine, currentLine);
            }, 20);
        } else if(currentLine !== undefined) {
            this.tokenizeLines.timer = setTimeout(() => {
                this.tokenizeLines(currentLine);
            }, 20);
        }
    }
    tokenizeLine(line) {
        let lineText = this.htmls[line - 1].text;
        if (lineText.length > 10000 || this.language == 'plain') {
            return {
                tokens: this.splitLongToken([{
                    type: 'plain',
                    column: 0,
                    value: lineText,
                }]),
                folds: [],
                states: []
            }
        }
        let states = line > 1 && this.htmls[line - 2].states || vsctm.INITIAL;
        let lineTokens = this.grammar.tokenizeLine(lineText, states);
        states = lineTokens.ruleStack;
        lineTokens = lineTokens.tokens.map((token) => {
            return {
                value: lineText.substring(token.startIndex, token.endIndex),
                type: token.scopes,
                column: token.startIndex
            }
        });
        return {
            tokens: this.splitLongToken(lineTokens),
            folds: [],
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
}