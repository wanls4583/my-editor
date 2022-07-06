/*
 * @Author: lisong
 * @Date: 2021-12-15 11:39:41
 * @Description:
 */
import Util from '@/common/util';
import EventBus from '@/event';
import globalData from '@/data/globalData';
import * as vsctm from 'vscode-textmate';
import * as oniguruma from 'vscode-oniguruma';

const fs = window.require('fs');
const path = window.require('path');

const regs = {
	stringToken: /(\.|^)string(\.|$)/,
};

export default class {
	constructor(editor, context) {
		this.editor = editor;
		this.context = context;
		this.currentLine = 1;
		this.initRegistry();
		this.initLanguage(editor.language);
	}
	initRegistry() {
		const wasmBin = fs.readFileSync(path.join(globalData.dirname, 'main/lib/onig.wasm')).buffer;
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
			loadGrammar: scopeName => {
				let language = Util.getLanguageByScopeName(globalData.scopeFileList, scopeName);
				if (language) {
					if (language.configPath) {
						return Util.loadJsonFile(language.configPath).then(data => {
							// 每种语言都有对应的折叠标记
							this.sourceFoldMap[language.scopeName] = {};
							globalData.sourceWordMap[language.scopeName] = data.wordPattern;
							// 是否存在标记性语言
							this.hasTextGrammar = this.hasTextGrammar || language.scopeName.startsWith('text');
							this.initLanguageConifg(this.sourceFoldMap[language.scopeName], data);
							return Util.readFile(language.path).then(data => vsctm.parseRawGrammar(data.toString(), language.path));
						});
					} else {
						return Util.readFile(language.path).then(data => vsctm.parseRawGrammar(data.toString(), language.path));
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
		this.scopeMap = {};
		this.hasTextGrammar = false;
		this.currentLine = 1;
		language = Util.getLanguageById(globalData.languageList, language);
		this.scopeName = (language && language.scopeName) || '';
		if (this.scopeName) {
			if (globalData.grammars[this.scopeName]) {
				let grammarData = globalData.grammars[this.scopeName];
				this.grammar = grammarData.grammar;
				this.sourceFoldMap = grammarData.sourceFoldMap;
				this.scopeMap = grammarData.scopeIdMap;
				this.hasTextGrammar = grammarData.hasTextGrammar;
			} else {
				return this.registry.loadGrammar(this.scopeName).then(grammar => {
					this.grammar = grammar;
					globalData.grammars[this.scopeName] = {
						grammar: grammar,
						sourceFoldMap: this.sourceFoldMap,
						scopeIdMap: this.scopeMap,
						hasTextGrammar: this.hasTextGrammar,
					};
					this.tokenizeVisibleLins();
				});
			}
		}
		this.tokenizeVisibleLins();
		return Promise.resolve();
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
			data.brackets.forEach(item => {
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
	destroy() {
		this.editor = null;
		this.context = null;
		cancelIdleCallback(this.tokenizeLinesTimer);
		globalData.scheduler.removeTask(this.tokenizeLinesTask);
	}
	onInsertContentAfter(nowLine, newLine) {
		globalData.scheduler.removeTask(this.tokenizeLinesTask);
		if (nowLine <= this.currentLine) {
			this.currentLine = nowLine;
		}
		this.editor.$nextTick(() => {
			this.tokenizeVisibleLins();
		});
	}
	onDeleteContentAfter(nowLine, newLine) {
		globalData.scheduler.removeTask(this.tokenizeLinesTask);
		if (newLine <= this.currentLine) {
			this.currentLine = newLine;
		}
		this.editor.$nextTick(() => {
			this.tokenizeVisibleLins();
		});
	}
	tokenizeVisibleLins() {
		let tokenizeVisibleLinsId = this.tokenizeVisibleLinsId + 1 || 1;
		this.tokenizeVisibleLinsId = tokenizeVisibleLinsId;
		this.editor.$nextTick(() => {
			if (this.tokenizeVisibleLinsId !== tokenizeVisibleLinsId) {
				return;
			}
			let startLine = this.editor.startLine;
			let endLine = this.editor.startLine + this.editor.maxVisibleLines;
			endLine = this.editor.folder.getRealLine(endLine);
			startLine = startLine < this.currentLine ? this.currentLine : startLine;
			if (endLine >= startLine) {
				// 先渲染可视范围内的行
				this.tokenizeLines(startLine, endLine, () => {
					// 考虑到当前行可能处于内嵌语法中，渲染前2000行
					startLine = this.editor.startLine - 2000;
					startLine = startLine < 1 ? 1 : startLine;
					// 考虑到minimap渲染的行数，这里乘以10
					endLine = this.editor.folder.getRealLine(endLine + this.editor.maxVisibleLines * 10);
					if (startLine > this.currentLine) {
						this.tokenizeLines(startLine, endLine, () => {
							this.tokenizeLines(this.currentLine);
						});
					} else {
						this.tokenizeLines(this.currentLine);
					}
				});
			}
		});
	}
	tokenizeLines(startLine, endLine, callback) {
		let limit = 5;
		let processedLines = 0;
		let originStartLine = startLine;
		let startTime = Date.now();
		endLine = endLine || this.editor.maxLine;
		endLine = endLine > this.editor.maxLine ? this.editor.maxLine : endLine;
		cancelIdleCallback(this.tokenizeLinesTimer);
		globalData.scheduler.removeTask(this.tokenizeLinesTask);
		if (this.scopeName && !this.grammar) {
			// 这里不用scheduler，否则将有可能导致parseRawGrammar失败
			this.tokenizeLinesTimer = requestIdleCallback(() => {
				this.tokenizeLines(startLine, endLine, callback);
			});
			return;
		}
		while (startLine <= endLine) {
			let lineObj = this.context.htmls[startLine - 1];
			if (!lineObj.tokens) {
				//文本超过一万时跳过高亮
				let data = this.tokenizeLine(startLine);
				lineObj.tokens = data.tokens;
				lineObj.folds = data.folds;
				lineObj.stateFold = data.stateFold;
				EventBus.$emit('render-line', { editorId: this.editor.editorId, lineId: lineObj.lineId });
				if (!lineObj.states || (lineObj.states.equals && !lineObj.states.equals(data.states)) || lineObj.states.toString() !== data.states.toString()) {
					lineObj.states = data.states;
					lineObj = this.context.htmls[startLine];
					if (lineObj) {
						lineObj.tokens = null;
						lineObj.html = '';
					}
				}
				processedLines++;
				// 避免卡顿
				if (processedLines >= limit || Date.now() - startTime >= 5) {
					startLine++;
					break;
				}
			}
			if (startLine - originStartLine > 1000) {
				break;
			}
			startLine++;
		}
		if (originStartLine === this.currentLine) {
			this.currentLine = startLine;
		}
		if (startLine <= endLine) {
			this.tokenizeLinesTask = globalData.scheduler.addTask(() => {
				this.tokenizeLines(startLine, endLine, callback);
			});
		} else if (callback) {
			callback();
		}
	}
	tokenizeLine(line) {
		let lineText = this.context.htmls[line - 1].text;
		let folds = [];
		if (lineText.length > 10000 || !this.scopeName || line <= this.editor.diffObj.deletedLength) {
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
		let states = null;
		if (this.editor.diffObj.states) {
			if (line === this.editor.diffObj.deletedLength + 1) {
				states = this.editor.diffObj.states;
			} else {
				states = this.context.htmls[line - 2].states || vsctm.INITIAL;
			}
		} else {
			states = (this.context.htmls[line - 2] && this.context.htmls[line - 2].states) || vsctm.INITIAL;
		}
		let lineTokens = this.grammar.tokenizeLine(lineText, states);
		let stateFold = this.addFold(line, lineTokens.tokens, folds);
		lineTokens.tokens.peek().endIndex = lineText.length; //某些情况下，会大于lineText.length
		return {
			tokens: lineTokens.tokens,
			states: lineTokens.ruleStack,
			folds: folds,
			stateFold: stateFold,
		};
	}
	createHtml(tokens, lineText) {
		let html = [];
		let preToken = null;
		if (!tokens) {
			tokens = [{ startIndex: 0, endIndex: lineText.length, scopes: ['plain'] }];
			tokens = this.splitLongToken(tokens);
		}
		for (let i = 0; i < tokens.length; i++) {
			let item = tokens[i];
			let selector = '';
			let scopeId = '';
			if (item.scopes[0] === 'plain') {
				selector = 'my-plain';
			} else if (item.scopes[0] === 'selected') {
				selector = 'my-select-fg';
			} else {
				scopeId = this.getScopeId(item);
				selector = (scopeId && `my-scope-${scopeId}`) || '';
			}
			if (preToken && _compair(preToken.scopeId, scopeId) && item.endIndex - preToken.startIndex < 100) {
				preToken.endIndex = item.endIndex;
				continue;
			}
			preToken = {
				scopeId: scopeId,
				selector: selector,
				startIndex: item.startIndex,
				endIndex: item.endIndex,
			};
			html.push(preToken);
		}
		return html
			.map(item => {
				let value = lineText.substring(item.startIndex, item.endIndex);
				return `<span class="${item.selector}" data-column="${item.startIndex}" data-end="${item.endIndex}">${Util.htmlTrans(value)}</span>`;
			})
			.join('')
			.replace(/\t/g, this.editor.space);

		function _compair(scope1, scope2) {
			scope1 = globalData.scopeIdMap[scope1];
			scope2 = globalData.scopeIdMap[scope2];
			scope1 = (scope1 && scope1.settingsStr) || '';
			scope2 = (scope2 && scope2.settingsStr) || '';
			return scope1 === scope2;
		}
	}
	getScopeId(token) {
		let result = null;
		let scopes = token.scopes;
		if (token.scopeId) {
			return token.scopeId;
		}
		token.scope = scopes.join(' ');
		outerLoop: for (let i = scopes.length - 1; i >= 0; i--) {
			let scope = scopes[i];
			if (scope in this.scopeMap) {
				if (this.scopeMap[scope]) {
					result = this.scopeMap[scope];
					break;
				} else {
					continue;
				}
			}
			for (let i = 0; i < globalData.scopeTokenList.length; i++) {
				let item = globalData.scopeTokenList[i];
				let _scope = item.scopes.peek();
				if (scope.indexOf(_scope) > -1) {
					if (item.regexp.test(token.scope)) {
						result = item.scopeId;
						this.scopeMap[scope] = result;
						break outerLoop;
					}
				}
				this.scopeMap[scope] = null;
			}
		}
		token.scopeId = result;
		return result;
	}
	addFold(line, tokens, folds) {
		let scopeName = '';
		let startIndex = 0;
		let existTag = false;
		let lineText = this.context.htmls[line - 1].text;
		let stateFold = line > 1 ? this.context.htmls[line - 2].stateFold : null;
		//给字符串token打上标记
		tokens.forEach(token => {
			if (regs.stringToken.test(token.scopes.join('.'))) {
				token.isString = true;
			}
		});
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
							tokens: tokens,
							line: line,
							foldMap: foldMap,
							folds: folds,
							startIndex: startIndex,
							endIndex: endIndex,
							stateFold: stateFold,
							lineText: lineText,
						});
						// 单行注释
						if (lastFold && lastFold.type === Util.CONST_DATA.LINE_COMMENT) {
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
			return folds.peek().type === Util.CONST_DATA.BLOCK_COMMENT ? folds.peek() : null;
		} else {
			return stateFold;
		}
	}
	addBracket(option) {
		let tokens = option.tokens;
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
		if (preFold && preFold.type === Util.CONST_DATA.BLOCK_COMMENT && preFold.side < 0) {
			reg = foldMap.__endCommentReg__;
		}
		while ((res = reg.exec(text))) {
			let type = Util.CONST_DATA.BRACKET;
			if (foldMap.__comments__.lineComment === res[0]) {
				type = Util.CONST_DATA.LINE_COMMENT;
			} else if (foldMap.__comments__.blockComment[0] === res[0] || foldMap.__comments__.blockComment[1] === res[0]) {
				type = Util.CONST_DATA.BLOCK_COMMENT;
			}
			// 如果处于字符串中，则无效
			if (_inString(res)) {
				continue;
			}
			folds.push({
				startIndex: startIndex + res.index,
				endIndex: startIndex + res.index + res[0].length,
				side: foldMap[res[0]],
				type: type,
			});
			if (type === Util.CONST_DATA.BLOCK_COMMENT && foldMap[res[0]] < 0) {
				foldMap.__endCommentReg__.lastIndex = reg.lastIndex;
				reg.lastIndex = 0;
				reg = foldMap.__endCommentReg__;
			} else if (type === Util.CONST_DATA.LINE_COMMENT) {
				break;
			}
		}
		reg.lastIndex = 0;
		return folds.length && folds.peek();

		function _inString(res) {
			let index = res.index;
			for (let i = 0; i < tokens.length; i++) {
				if (tokens[i].startIndex <= index && tokens[i].endIndex > index) {
					if (tokens[i].isString) {
						return true;
					}
					break;
				} else if (tokens[i].startIndex > index) {
					break;
				}
			}
			return false;
		}
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
				type: Util.CONST_DATA.TAG,
			});
			return true;
		}
	}
	splitLongToken(tokens) {
		let result = [];
		tokens.forEach(token => {
			let length = token.endIndex - token.startIndex + 1;
			if (length > 100) {
				//将文本数量大于100的token分隔
				let startCol = token.startIndex;
				let count = Math.floor(length / 100);
				for (let i = 0; i < count; i++) {
					let startIndex = i * 100;
					let endIndex = (i + 1) * 100;
					result.push({
						startIndex: startIndex + startCol,
						endIndex: endIndex + startCol,
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
	clearScopeMap() {
		this.scopeMap = {};
		for (let scopeName in globalData.grammars) {
			if (scopeName === this.scopeName) {
				globalData.grammars[scopeName].scopeIdMap = this.scopeMap;
			} else {
				globalData.grammars[scopeName].scopeIdMap = {};
			}
		}
	}
}
