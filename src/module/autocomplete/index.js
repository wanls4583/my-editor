/*
 * @Author: lisong
 * @Date: 2022-03-17 15:29:26
 * @Description:
 */
import { extract } from 'emmet';
import Util from '@/common/util';
import Enum from '@/data/enum';
import globalData from '@/data/globalData';

const require = window.require || window.parent.require || function () {};
const path = require('path');

const regs = {
	stringToken: /(?:\.|^)(?:string|regexp)(?:\.|$)/,
	tagToken: /meta\.tag/,
	tagNameToken: /entity\.name\.tag/,
	tagAttrName: /attribute\-name/,
	cssValueToken: /property\-list|property\-value|separator/,
	cssPropertyToken: /meta\.property\-name/,
	cssSelectorToken: /meta\.selector/,
	cssAttributeToken: /attribute\-selector/,
	cssClassToken: /attribute\-name\.class/,
	cssPseudoToken: /pseudo\-element/,
	styleCss: /([^\:\;\"\'\s]+)\s*\:\s*([^\:\;]+)?$/,
	styleCssProperty: /(?:^|[\;\"\'])([^\:\;]+)$/,
};

class Autocomplete {
	constructor(editor, context) {
		this.initProperties(editor, context);
		this.doneMap = {};
		this.results = [];
		this.wordPattern = Util.getWordPattern(this.language);
		this.wordPattern = new RegExp(`^(${this.wordPattern.source})$`);
	}
	initProperties(editor, context) {
		Util.defineProperties(this, editor, ['indent', 'space', 'language', 'cursor', 'nowCursorPos', 'tokenizer', 'autoTipList', 'setAutoTip', 'selectAutoTip']);
		Util.defineProperties(this, context, ['htmls', 'replaceTip', 'insertContent']);
	}
	reset() {
		this.currentLine = 1;
		this.results = [];
		this.doneMap = {};
	}
	stop() {
		cancelIdleCallback(this.searchTimer);
	}
	search() {
		this.stop();
		this.searchTimer = requestIdleCallback(() => {
			this._search();
		});
	}
	emmet() {
		let lineObj = this.htmls[this.nowCursorPos.line - 1];
		let tokenIndex = this.getTokenIndex(this.nowCursorPos);
		let nowToken = lineObj.tokens[tokenIndex];
		let word = nowToken && lineObj.text.slice(nowToken.startIndex, this.nowCursorPos.column);
		let emmetObj = null;
		let type = '';
		if (word) {
			let scope = nowToken.scopes.peek();
			if (scope.startsWith('text.')) {
				emmetObj = extract(word);
				type = Enum.TOKEN_TYPE.EMMET_HTML;
			} else if (this._isCssToken(nowToken)) {
				if (this._isCssPropertyToken(nowToken)) {
					emmetObj = extract(word, word.length, { type: 'stylesheet' });
				} else if (this._isCssValueToken(nowToken)) {
					//p10将会被分成pd和10两个token
					let preToken = lineObj.tokens[tokenIndex - 1];
					if (preToken && this._isCssPropertyToken(preToken)) {
						word = lineObj.text.slice(preToken.startIndex, preToken.endIndex) + word;
						emmetObj = extract(word, word.length, { type: 'stylesheet' });
					}
				}
				type = Enum.TOKEN_TYPE.EMMET_CSS;
			}
		}
		if (emmetObj) {
			this.replaceTip({ word: emmetObj.abbreviation, result: emmetObj.abbreviation, type: type });
		} else if (this.autoTipList && this.autoTipList.length) {
			this.selectAutoTip();
		} else {
			this.insertContent(this.indent === 'tab' ? '\t' : this.space);
		}
	}
	_search() {
		let lineObj = this.htmls[this.nowCursorPos.line - 1];
		let tokenIndex = this.getTokenIndex(this.nowCursorPos);
		let nowToken = lineObj.tokens[tokenIndex];
		let word = nowToken && lineObj.text.slice(nowToken.startIndex, this.nowCursorPos.column);
		this.reset();
		this.setAutoTip(null);
		if (!word) {
			return;
		}
		if (this._isTextToken(nowToken)) {
			let scope = nowToken.scopes.peek();
			if (scope.startsWith('text.')) {
				//emmet表达式
				this._searchEmmet(word);
			} else if (this._isTagNameToken(nowToken)) {
				//标签名
				this._searchTagName(word);
			} else if (this._isAttrNameToken(nowToken)) {
				//属性名
				let tag = this._getPreTagName(tokenIndex, this.nowCursorPos.line);
				if (tag) {
					this._searchTagAttrName(word, tag);
				}
			}
		} else if (this._isCssToken(nowToken)) {
			if (this._isCssPropertyToken(nowToken)) {
				//css属性名
				this._searchCssProperty(word);
			} else if (this._isCssValueToken(nowToken)) {
				//css属性值
				let preToken = lineObj.tokens[tokenIndex - 1];
				//p10将会被分成pd和10两个token
				if (preToken && this._isCssPropertyToken(preToken)) {
					let preToken = lineObj.tokens[tokenIndex - 1];
					if (preToken && this._isCssPropertyToken(preToken)) {
						word = lineObj.text.slice(preToken.startIndex, preToken.endIndex) + word;
						this._searchCssProperty(word);
					}
				} else {
					let property = this._getPreCssProperty(tokenIndex, this.nowCursorPos.line);
					if (property) {
						this._searchCssValue(word, property);
					}
				}
			} else if (this._isCssSelectorToken(nowToken)) {
				if (this._isTagNameToken(nowToken)) {
					this._searchCssTag(word);
				} else if (word.indexOf(':') > -1) {
					this._searchCssPseudo(word);
				}
				this._searchSelector(word, nowToken);
			} else if (this._isTagToken(nowToken)) {
				//style种的css样式
				this._searchStyle(word, nowToken);
			}
		} else if (this._isSourceToken(nowToken)) {
			if (this.wordPattern.test(word)) {
				this._searchWord(word, nowToken);
			}
		}
	}
	_searchWord(word, nowToken) {
		this._searchDocument(lineObj => {
			lineObj.tokens.forEach(token => {
				if (token === nowToken) {
					return;
				}
				let text = lineObj.text.slice(token.startIndex, token.endIndex);
				if (this.wordPattern.test(text)) {
					// 跳过标签和字符串
					if (this._isTextToken(token) || this._isStringToken(token)) {
						return;
					}
					this._addTip({ word: word, value: text, type: Enum.TOKEN_TYPE.WORD });
				}
			});
		});
	}
	_searchSelector(word, nowToken) {
		if (this._isCssClassToken(nowToken) && word !== '.') {
			word = '.' + word;
		}
		this._searchDocument(lineObj => {
			lineObj.tokens.forEach(token => {
				if (token === nowToken) {
					return;
				}
				if (this._isCssSelectorToken(token)) {
					let text = lineObj.text.slice(token.startIndex, token.endIndex);
					if (!this.wordPattern.test(text)) {
						return;
					}
					if (this._isCssClassToken(token)) {
						text = '.' + text;
					}
					if (word === '.') {
						if (this._isCssClassToken(token) && text !== '..') {
							this._addTip({ word: word, value: text, type: Enum.TOKEN_TYPE.CSS_CLASS, skipMatch: true });
						}
					} else if (this._isCssClassToken(nowToken)) {
						if (this._isCssClassToken(token)) {
							this._addTip({ word: word, value: text, type: Enum.TOKEN_TYPE.CSS_CLASS });
						}
					} else {
						this._addTip({ word: word, value: text, type: Enum.TOKEN_TYPE.CSS_SELECTOR });
					}
				}
			});
		}, true);
	}
	_searchDocument(callback, showAll) {
		let line = this.currentLine;
		let startTime = Date.now();
		let processedLines = 0;
		while (line <= this.htmls.length) {
			let lineObj = this.htmls[line - 1];
			line++;
			if (!lineObj.tokens) {
				continue;
			}
			callback(lineObj);
			processedLines++;
			// 避免卡顿
			if (processedLines % 5 == 0 && Date.now() - startTime >= 20) {
				break;
			}
		}
		this.currentLine = line;
		this._showTip(showAll);
		if (line <= this.htmls.length) {
			this.searchTimer = requestIdleCallback(() => {
				this._searchDocument(callback, showAll);
			});
		}
	}
	_searchTagName(word) {
		const htmlData = this.getHtmlData();
		htmlData.tags.forEach(item => {
			this._addTip({ word: word, value: item.name, type: Enum.TOKEN_TYPE.TAG_NAME });
		});
		if (!this.results.length) {
			this._addTip({ word: word, value: word, type: Enum.TOKEN_TYPE.TAG_NAME, skipMatch: true });
		}
		this._showTip();
	}
	_searchTagAttrName(word, tag) {
		const htmlData = this.getHtmlData();
		let attributes = htmlData.tagMap[tag];
		attributes = attributes && attributes.attributes;
		if (attributes) {
			// 标签专有属性
			attributes.forEach(item => {
				this._addTip({ word: word, value: item.name, type: Enum.TOKEN_TYPE.ATTR_NAME, after: '=""' });
			});
		}
		// 公共属性
		htmlData.globalAttributes.forEach(item => {
			this._addTip({ word: word, value: item.name, type: Enum.TOKEN_TYPE.ATTR_NAME, after: '=""' });
		});
		this._showTip();
	}
	_searchCssTag(word) {
		const htmlData = this.getHtmlData();
		htmlData.tags.forEach(item => {
			this._addTip({ word: word, value: item.name, type: Enum.TOKEN_TYPE.CSS_TAG });
		});
	}
	_searchCssPseudo(word) {
		const cssData = this.getCssData();
		const pseudo = word.split(':').peek().trim();
		cssData.pseudoClasses.forEach(item => {
			if (pseudo) {
				this._addTip({ word: word, value: item.name, type: Enum.TOKEN_TYPE.CSS_PSEUDO });
			} else {
				this._addTip({ word: word, value: item.name, type: Enum.TOKEN_TYPE.CSS_PSEUDO, skipMatch: true });
			}
		});
		cssData.pseudoElements.forEach(item => {
			if (pseudo) {
				this._addTip({ word: word, value: item.name, type: Enum.TOKEN_TYPE.CSS_PSEUDO });
			} else {
				this._addTip({ word: word, value: item.name, type: Enum.TOKEN_TYPE.CSS_PSEUDO, skipMatch: true });
			}
		});
	}
	_searchStyle(word, nowToken) {
		let column = this.nowCursorPos.column;
		let lineObj = this.htmls[this.nowCursorPos.line - 1];
		let keyValue = null;
		word = lineObj.text.slice(nowToken.startIndex, column);
		keyValue = regs.styleCss.exec(word);
		if (keyValue && keyValue[1]) {
			let property = keyValue[1];
			let value = keyValue[2] || '';
			this._searchCssValue(value, property);
			return;
		}
		keyValue = regs.styleCssProperty.exec(word);
		if (keyValue && keyValue[1]) {
			this._searchCssProperty(keyValue[1]);
		}
	}
	_searchCssProperty(word) {
		const cssData = this.getCssData();
		cssData.properties.forEach(item => {
			this._addTip({ word: word, value: item.name, type: Enum.TOKEN_TYPE.CSS_PROPERTY, after: ': ' });
		});
		if (!this.results.length) {
			const emmetObj = extract(word, word.length, { type: 'stylesheet' });
			if (emmetObj && emmetObj.abbreviation) {
				this._addTip({ word: emmetObj.abbreviation, value: emmetObj.abbreviation, type: Enum.TOKEN_TYPE.EMMET_CSS, skipMatch: true });
			}
		}
		this._showTip();
	}
	_searchCssValue(word, property) {
		const cssData = this.getCssData();
		let values = cssData.propertyMap[property];
		values = values && values.values;
		if (values) {
			let _word = word.trim();
			if (_word === ':' || _word === '') {
				values.forEach(item => {
					this._addTip({ word: word, value: item.name, type: Enum.TOKEN_TYPE.CSS_VALUE, before: ' ', after: ';', skipMatch: true });
				});
				this._showTip(true);
			} else {
				values.forEach(item => {
					this._addTip({ word: word, value: item.name, type: Enum.TOKEN_TYPE.CSS_VALUE, after: ';' });
				});
				this._showTip();
			}
		}
	}
	_searchEmmet(word) {
		const emmetObj = extract(word);
		if (emmetObj && emmetObj.abbreviation) {
			this._addTip({ word: emmetObj.abbreviation, value: emmetObj.abbreviation, type: Enum.TOKEN_TYPE.EMMET_HTML, skipMatch: true });
			this._showTip();
		}
	}
	_setTokenType(token) {
		token.isSourceToken = false;
		token.isCssToken = false;
		token.isTextToken = false;
		token.isTagToken = false;
		token.isTagAttrNameToken = false;
		token.scope = token.scope || token.scopes.join(' ');
		for (let i = token.scopes.length - 1; i >= 0; i--) {
			let scope = token.scopes[i];
			if (scope.startsWith('source.')) {
				token.isSourceToken = true;
				if (scope.startsWith('source.css')) {
					token.isCssToken = true;
				}
				break;
			} else if (scope.startsWith('text.')) {
				token.isTextToken = true;
				token.isTagAttrNameToken = regs.tagAttrName.test(token.scope);
				break;
			}
		}
		token.isTagToken = regs.tagToken.test(token.scope);
		token.isTagNameToken = regs.tagNameToken.test(token.scope);
		token.isStringToken = regs.stringToken.test(token.scope);
		if (token.isCssToken) {
			token.isCssValueToken = regs.cssValueToken.test(token.scope);
			token.isCssPropertyToken = regs.cssPropertyToken.test(token.scope);
			token.isCssSelectorToken = regs.cssSelectorToken.test(token.scope);
			token.isCssClassToken = regs.cssClassToken.test(token.scope);
			token.isCssAttributeToken = regs.cssAttributeToken.test(token.scope);
			token.isCssPseudoToken = regs.cssPseudoToken.test(token.scope);
		}
	}
	_isTextToken(token) {
		if (token.isTextToken === undefined) {
			this._setTokenType(token);
		}
		return token.isTextToken;
	}
	_isSourceToken(token) {
		if (token.isSourceToken === undefined) {
			this._setTokenType(token);
		}
		return token.isSourceToken;
	}
	_isCssToken(token) {
		if (token.isCssToken === undefined) {
			this._setTokenType(token);
		}
		return token.isCssToken;
	}
	_isCssPropertyToken(token) {
		if (token.isCssPropertyToken === undefined) {
			this._setTokenType(token);
		}
		return token.isCssPropertyToken;
	}
	_isCssValueToken(token) {
		if (token.isCssValueToken === undefined) {
			this._setTokenType(token);
		}
		return token.isCssValueToken;
	}
	_isCssSelectorToken(token) {
		if (token.isCssSelectorToken === undefined) {
			this._setTokenType(token);
		}
		return token.isCssSelectorToken;
	}
	_isCssClassToken(token) {
		if (token.isCssClassToken === undefined) {
			this._setTokenType(token);
		}
		return token.isCssClassToken;
	}
	_isCssAttributeToken(token) {
		if (token.isCssAttributeToken === undefined) {
			this._setTokenType(token);
		}
		return token.isCssAttributeToken;
	}
	_isCssPseudoToken(token) {
		if (token.isCssPseudoToken === undefined) {
			this._setTokenType(token);
		}
		return token.isCssPseudoToken;
	}
	_isStringToken(token) {
		if (token.isStringToken === undefined) {
			this._setTokenType(token);
		}
		return token.isStringToken;
	}
	_isTagToken(token) {
		if (token.isTagToken === undefined) {
			this._setTokenType(token);
		}
		return token.isTagToken;
	}
	_isTagNameToken(token) {
		if (token.isTagNameToken === undefined) {
			this._setTokenType(token);
		}
		return token.isTagNameToken;
	}
	_isAttrNameToken(token) {
		if (token.isTagAttrNameToken === undefined) {
			this._setTokenType(token);
		}
		return token.isTagAttrNameToken;
	}
	_getPreTagName(tokenIndex, line) {
		let tag = '';
		let count = 0;
		outerLoop: while (line >= 1) {
			let lineObj = this.htmls[line - 1];
			if (!lineObj.tokens) {
				break;
			}
			tokenIndex = tokenIndex > -1 ? tokenIndex : lineObj.tokens.length;
			for (let i = tokenIndex - 1; i >= 0; i--) {
				let token = lineObj.tokens[i];
				if (this._isTagNameToken(token)) {
					tag = lineObj.text.slice(token.startIndex, token.endIndex);
					break outerLoop;
				}
				count++;
				if (count > 100) {
					break outerLoop;
				}
			}
			line--;
			tokenIndex = -1;
		}
		return tag;
	}
	_getPreCssProperty(tokenIndex, line) {
		let property = '';
		let count = 0;
		outerLoop: while (line >= 1) {
			let lineObj = this.htmls[line - 1];
			if (!lineObj.tokens) {
				break;
			}
			tokenIndex = tokenIndex > -1 ? tokenIndex : lineObj.tokens.length;
			for (let i = tokenIndex - 1; i >= 0; i--) {
				let token = lineObj.tokens[i];
				if (this._isCssPropertyToken(token)) {
					property = lineObj.text.slice(token.startIndex, token.endIndex);
					break outerLoop;
				}
				count++;
				if (count > 100 || !this._isCssValueToken(token)) {
					break outerLoop;
				}
			}
			line--;
			tokenIndex = -1;
		}
		return property;
	}
	_addTip(option) {
		let result = null;
		let fullMatch = option.fullMatch;
		fullMatch = fullMatch === undefined ? true : fullMatch;
		if (this.doneMap[option.value] && !option.skipDone) {
			return;
		}
		if (option.skipMatch) {
			result = {
				indexs: [],
				score: 0,
			};
		} else {
			result = Util.fuzzyMatch(option.word.trim(), option.value, fullMatch);
		}
		if (result) {
			let obj = {
				result: option.value,
				word: option.word || '',
				desc: option.desc || '',
				type: option.type || '',
				before: option.before || '',
				after: option.after || '',
				icon: this.getIcon(option.scope),
				indexs: result.indexs,
				score: result.score,
			};
			this.results.push(obj);
			this.doneMap[option.value] = obj;
		} else {
			this.doneMap[option.value] = true;
		}
	}
	_showTip(all) {
		let results = null;
		let limit = all ? 200 : 10;
		this.results.sort((a, b) => {
			return b.score - a.score;
		});
		results = this.results.slice(0, limit);
		this.setAutoTip(results);
	}
	checkEmmetValid(text) {
		let _text = '';
		if (regs.invalidEmmetParen.exec(text)) {
			return false;
		}
		while (text !== (_text = text.replace(regs.paremEmmet, 'a'))) {
			text = _text;
		}
		return !!regs.emmet.exec(text);
	}
	getTokenIndex(cursorPos) {
		let tokens = this.htmls[cursorPos.line - 1].tokens;
		if (tokens) {
			for (let i = 0; i < tokens.length; i++) {
				if (tokens[i].startIndex < cursorPos.column && tokens[i].endIndex >= cursorPos.column) {
					return i;
				}
			}
		}
		return -1;
	}
	getHtmlData() {
		if (this.htmlData) {
			return this.htmlData;
		} else {
			const htmlData = require(path.join(globalData.dirname, 'main/data/browsers.html-data'));
			this.htmlData = htmlData;
			htmlData.tagMap = {};
			htmlData.tags.forEach(item => {
				htmlData.tagMap[item.name] = item;
			});
			return this.htmlData;
		}
	}
	getCssData() {
		if (this.cssData) {
			return this.cssData;
		} else {
			const cssData = require(path.join(globalData.dirname, 'main/data/browsers.css-data'));
			this.cssData = cssData;
			cssData.propertyMap = {};
			cssData.properties.forEach(item => {
				cssData.propertyMap[item.name] = item;
			});
			return this.cssData;
		}
	}
	getIcon(scope) {
		return '';
	}
}

export default Autocomplete;
