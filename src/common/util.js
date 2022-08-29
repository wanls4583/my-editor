/*
 * @Author: lisong
 * @Date: 2020-10-31 13:48:50
 * @Description: 工具类
 */
import stripJsonComments from 'strip-json-comments';
import stringWidth from 'string-width';
import $ from 'jquery';

const fs = window.require('fs');
const fse = window.require('fs-extra');
const path = window.require('path');

class Util {
	static readClipboard() {
		if (window.clipboardData) {
			return new Promise(resolve => {
				resolve(clipboardData.getData('Text'));
			});
		} else if (navigator.clipboard) {
			return navigator.clipboard.readText();
		}
	}
	static writeClipboard(text) {
		if (window.clipboardData) {
			clipboardData.setData('Text', text);
		} else if (navigator.clipboard) {
			navigator.clipboard.writeText(text);
		}
	}
	//获取数字
	static getNum(value) {
		value = String(value);
		value = value.replace(/[^0123456789\.]/g, '');
		var regex = /^\d+(\.\d*)?$/;
		var r = regex.exec(value);
		var num = (r && r[0]) || '';
		if (num) {
			num = Number(r[0]);
		}
		return num;
	}
	//生成指定个数的空白符
	static space(tabSize) {
		var val = '';
		for (var tmp = 0; tmp < tabSize; tmp++) {
			val += ' ';
		}
		return val;
	}
	//数组数字排序
	static sortNum(arr) {
		arr.sort(function (arg1, arg2) {
			return Number(arg1) - Number(arg2);
		});
	}
	static debounce(cb, delay) {
		var timer = null;
		return function () {
			clearTimeout(timer);
			timer = setTimeout(function () {
				cb();
			}, delay);
		};
	}
	static throttle(cb, delay) {
		var timer = null;
		return function () {
			if (!timer) {
				timer = setTimeout(function () {
					cb();
				}, delay);
			}
		};
	}
	//获取字符宽度
	static getCharWidth(wrap, template) {
		let str1 = '';
		let str2 = '';
		for (let i = 0; i < 100; i++) {
			str1 += '1';
			str2 += '啊';
		}
		let fontSize = 0;
		let id1 = 'char-width-' + Util.getUUID();
		let id2 = 'char-width-' + Util.getUUID();
		let $tempDom1 = $(template.replace('[dom]', `<span style="display:inline-block" id="${id1}">${str1}</span>`));
		let $tempDom2 = $(template.replace('[dom]', `<span style="display:inline-block" id="${id2}">${str2}</span>`));
		$(wrap).append($tempDom1).append($tempDom2);
		id1 = $('#' + id1);
		id2 = $('#' + id2);
		if (window.getComputedStyle) {
			fontSize = parseFloat(window.getComputedStyle(id1[0], null).fontSize);
		} else {
			fontSize = parseFloat(id1[0].currentStyle.fontSize);
		}
		let charWidth = id1[0].getBoundingClientRect().width / str1.length;
		let fullCharWidth = id2[0].getBoundingClientRect().width / str2.length;
		let charHight = id1[0].clientHeight;
		$tempDom1.remove();
		$tempDom2.remove();
		return {
			charWidth: charWidth,
			charScale: charWidth / fontSize,
			fullCharWidth: fullCharWidth,
			fullCharScale: fullCharWidth / fontSize,
			charHight: charHight,
			fontSize: fontSize
		};
	}
	/**
	 * 获取文本在浏览器中的真实宽度
	 * @param  {string} str       文本
	 * @param  {number} charW     半角符号/文字宽度
	 * @param  {number} fullCharW 全角符号/文字宽度
	 * @param  {number} tabSize   tab符所占宽度
	 * @param  {number} start     文本开始索引
	 * @param  {number} end       文本结束索引
	 * @return {number}           文本真实宽度
	 */
	static getStrWidth({
		str,
		fontSize,
		charScale,
		fullCharScale,
		tabSize,
		start,
		end
	}) {
		tabSize = tabSize || 4;
		if (typeof start != 'undefined') {
			str = str.substr(start);
		}
		if (typeof end != 'undefined') {
			str = str.substring(0, end - start);
		}
		let charNum = stringWidth(str, {ambiguousIsNarrow: false}); //\t将被忽略
		let fullCharNum = 0;
		let tabNum = 0;
		tabNum = str.match(/\t/g);
		tabNum = (tabNum && tabNum.length) || 0;
		fullCharNum = charNum - (str.length - tabNum);
		charNum = charNum - fullCharNum * 2 + tabSize * tabNum;
		return charNum * fontSize * charScale + fullCharNum * fontSize * fullCharScale;
	}
	/**
	 * 获取文本在浏览器中的真实宽度
	 * @param  {string} str       文本
	 * @param  {DOM} wrap     容器
	 */
	static getStrExactWidth(str, tabSize, wrap) {
		Util.getStrExactWidth.count = Util.getStrExactWidth.count || 0;
		Util.getStrExactWidth.count++;
		if (!str) {
			return 0;
		}
		var id = 'str-width-' + Util.getUUID();
		var $tempDom = $(`<div class="my-line my-temp-text" style="visibility:hidden">
        <div class="my-code" id="${id}">${_splitStr(str)}</div>
        </div>`);
		$(wrap).append($tempDom);
		var dom = $('#' + id)[0];
		var charWidth = dom.clientWidth;
		$('.my-temp-text').remove();
		// if (Util.getStrExactWidth.count > 5) { //避免频繁删除dom导致浏览器卡顿
		//     $('.my-temp-text').remove();
		// } else {
		//     clearTimeout(Util.getStrExactWidth.timer);
		//     Util.getStrExactWidth.timer = setTimeout(() => {
		//         $('.my-temp-text').remove();
		//     }, 500);
		// }
		return charWidth;

		function _splitStr(str) {
			let count = Math.floor(str.length / 100);
			let result = [];
			for (let i = 0; i < count; i++) {
				let column = i * 100;
				result.push(Util.htmlTrans(str.slice(column, column + 100)));
			}
			count = count * 100;
			if (count < str.length) {
				result.push(Util.htmlTrans(str.slice(count)));
			}
			return `<span>${result.join('</span><span>').replace(/\t/g, Util.space(tabSize || 4))}</span>`;
		}
	}
	//<,>转义
	static htmlTrans(cont) {
		cont = cont.replace(/\&/g, '&amp;'); //防止‘&lt;’等纯文本被显示成转义符‘<’
		cont = cont.replace(/</g, '&lt;').replace(/>/g, '&gt;');
		return cont;
	}
	// 深度克隆
	static deepAssign(targetObj, originObj, noDeepKeys) {
		return _assign(targetObj, originObj, noDeepKeys, new Map());

		function _assign(targetObj, originObj, noDeepKeys, assigned) {
			noDeepKeys = noDeepKeys || [];
			for (var key in originObj) {
				var value = originObj[key];
				if (noDeepKeys.indexOf(key) > -1) {
					targetObj[key] = value;
					continue;
				}
				if (typeof value === 'object' && !(value instanceof RegExp) && value !== null && (!value.nodeName || !value.nodeType)) {
					if (assigned.has(value)) {
						targetObj[key] = assigned.get(value);
					} else {
						let tmp = null;
						if (value instanceof Array) {
							tmp = targetObj[key] || [];
							assigned.set(value, tmp);
							targetObj[key] = _assign(tmp, value, noDeepKeys, new Map(assigned));
						} else {
							tmp = targetObj[key] || {};
							assigned.set(value, tmp);
							targetObj[key] = _assign(tmp, value, noDeepKeys, new Map(assigned));
						}
					}
				} else {
					targetObj[key] = value;
				}
			}
			return targetObj;
		}
	}
	/**
	 * 比较坐标的前后
	 * @param {Object} start
	 * @param {Object} end
	 */
	static comparePos(start, end) {
		if (start.line > end.line || (start.line == end.line && start.column > end.column)) {
			return 1;
		} else if (start.line == end.line && start.column == end.column) {
			return 0;
		} else {
			return -1;
		}
	}
	static diffObj(obj1, obj2) {
		return JSON.stringify(obj1) !== JSON.stringify(obj2);
	}
	static createWorker(fun) {
		var funStr = `(${fun.toString()})()`;
		var blob = new Blob([funStr]);
		var url = window.URL.createObjectURL(blob);
		var worker = new Worker(url);
		return worker;
	}
	static defineProperties(target, context, properties) {
		let result = {};
		properties.forEach(property => {
			result[property] = {
				get: function () {
					if (typeof context[property] == 'function') {
						return context[property].bind(context);
					} else {
						return context[property];
					}
				}
			};
		});
		Object.defineProperties(target, result);
	}
	static readFile(path) {
		return new Promise((resolve, reject) => {
			fs.readFile(path, {
				encoding: 'utf8'
			}, (error, data) => (error ? reject(error) : resolve(data)));
		});
	}
	static writeFile(path, data) {
		const os = window.require('os');
		return new Promise((resolve, reject) => {
			fse.ensureFile(path).then(() => {
				if (os.platform() === 'win32') {
					data = data.replace(/(?<!\r)\n/g, '\r\n');
				} else {
					data = data.replace(/\r\n/g, '\n');
				}
				fs.writeFile(path, data, {
					encoding: 'utf8'
				}, error => (error ? reject(error) : resolve()));
			});
		});
	}
	static writeFileSync(path, data) {
		const os = window.require('os');
		if (os.platform() === 'win32') {
			data = data.replace(/(?<!\r)\n/g, '\r\n');
		} else {
			data = data.replace(/\r\n/g, '\n');
		}
		fse.ensureFileSync(path);
		fs.writeFileSync(path, data, {
			encoding: 'utf8'
		});
	}
	static loadJsonFile(fullPath) {
		return Util.readFile(fullPath).then(data => {
			data = data.toString();
			data = stripJsonComments(data);
			data = data.replaceAll(/\,(?=\s*(?:(?:\r\n|\n|\r))*\s*[\]\}])/g, '');
			data = (data && JSON.parse(data)) || {};
			return data;
		});
	}
	static loadJsonFileSync(fullPath) {
		let data = fs.readFileSync(fullPath, {
			encoding: 'utf8'
		});
		data = data.toString();
		data = stripJsonComments(data);
		data = data.replaceAll(/\,(?=\s*(?:(?:\r\n|\n|\r))*\s*[\]\}])/g, '');
		data = (data && JSON.parse(data)) || {};
		return data;
	}
	static checkGitRep(filePath) {
		while (filePath.length > 3) {
			if (fs.existsSync(path.join(filePath, '.git'))) {
				return true;
			}
			filePath = path.dirname(filePath);
		}
	}
	static getIgnore(filePath) {
		while (filePath.length > 3) {
			if (fs.existsSync(path.join(filePath, '.gitignore'))) {
				return path.join(filePath, '.gitignore');
			}
			filePath = path.dirname(filePath);
		}
	}
	/**
	 * 模糊匹配【word是否存在于target中】
	 * @param {String} word 被搜索的单词
	 * @param {String} target 模板单词
	 */
	static fuzzyMatch(word, target, fullMatch) {
		let wordMap = {};
		let towMap = {};
		let wordLength = 0;
		let score = 0;
		let preFinedChar = '';
		let preFinedOriginChar = '';
		let preFinded = false;
		let targetMap = {};
		let count = 0;
		let indexs = [];
		let result = null;
		let _target = target.toLowerCase();
		if (word === target) {
			return fullMatch ? {
				score: 100,
				indexs: []
			} : null;
		}
		_setMap();
		for (let i = 0; i < target.length; i++) {
			let originChar = target[i];
			let char = _target[i];
			if (
				wordMap[char] &&
				//保证前后字符顺序最多只出现一个位置颠倒且颠倒的两个字符必须相邻
				(!preFinedChar || towMap[preFinedChar + char] || (towMap[char + preFinedChar] && preFinded))
			) {
				if (!targetMap[char] || targetMap[char] < wordMap[char]) {
					targetMap[char] = targetMap[char] ? targetMap[char] + 1 : 1;
					indexs.push(i);
					if (char === '_' || char === '$') {
						//检测到连接符+10分
						score += 10;
					} else if (preFinded) {
						//检测到连续匹配
						score += 5;
						if (towMap[preFinedChar + char]) {
							//连续匹配且顺序正确
							score += 1;
							if (_humpCheck(preFinedOriginChar, originChar) && preFinded) {
								//检测到驼峰命名+10分
								score += 5;
							}
						}
					}
					if (_complete(char)) {
						return result;
					}
					if (!towMap[char + preFinedChar] || towMap[preFinedChar + char]) {
						preFinedChar = char;
						preFinedOriginChar = originChar;
					}
					preFinded = true;
				} else {
					//检测到字符不匹配-1分
					score--;
					preFinded = char === preFinedChar;
				}
			} else {
				if (!count && score > -9) {
					//检测到前三个首字符不匹配-3分
					score -= 3;
				} else {
					//检测到字符不匹配-1分
					score--;
				}
				preFinded = char === preFinedChar;
			}
		}

		// 预处理搜素单词
		function _setMap() {
			if (Util.fuzzyMatch.cache && Util.fuzzyMatch.cache.word === word) {
				wordMap = Util.fuzzyMatch.cache.wordMap;
				towMap = Util.fuzzyMatch.cache.towMap;
				wordLength = Util.fuzzyMatch.cache.wordLength;
				return;
			}
			let preChar = '';
			for (let i = 0; i < word.length; i++) {
				let char = word[i].toLowerCase();
				wordMap[char] = wordMap[char] ? wordMap[char] + 1 : 1;
				if (i > 0) {
					towMap[preChar + char] = true;
				}
				preChar = char;
			}
			wordLength = Object.keys(wordMap).length;
			Util.fuzzyMatch.cache = {
				word: word,
				wordMap: wordMap,
				towMap: towMap,
				wordLength: wordLength
			};
		}

		// 检查驼峰命名
		function _humpCheck(preChar, char) {
			let preCode = preChar.charCodeAt(0);
			let charCode = char.charCodeAt(0);
			if ((preCode < 97 && charCode >= 97) || (charCode < 97 && preCode >= 97)) {
				return true;
			}
			return false;
		}

		// 检查是否匹配完成
		function _complete(char) {
			if (targetMap[char] === wordMap[char]) {
				if (++count === wordLength) {
					result = {
						score: score,
						indexs: indexs
					};
					return true;
				}
			}
		}
	}
	static getUUID(len) {
		len = len || 16;
		var str = '';
		for (var i = 0; i < len; i++) {
			str += ((Math.random() * 16) | 0).toString(16);
		}
		return str;
	}
	static getLanguageById(language) {
		let languageList = globalData.languageList;
		for (let i = 0; i < languageList.length; i++) {
			if (languageList[i].language === language) {
				return languageList[i];
			}
		}
	}
	static getLanguageByScopeName(languageList, scopeName) {
		for (let i = 0; i < languageList.length; i++) {
			if (languageList[i].scopeName === scopeName) {
				return languageList[i];
			}
		}
	}
	static getWordPattern(language) {
		let wordPattern = globalData.defaultWordPattern;
		language = Util.getLanguageById(language);
		if (language) {
			let _wordPattern = globalData.sourceWordMap[language.scopeName];
			_wordPattern = _wordPattern && _wordPattern.pattern;
			wordPattern = _wordPattern || wordPattern;
		}
		return new RegExp(wordPattern);
	}
	static getIconByPath({
		fileType,
		filePath,
		opened,
		isRoot
	}) {
		let fileName = /[^\\\/]+$/.exec(filePath);
		let suffix1 = '';
		let suffix2 = '';
		let iconData = globalData.nowIconData;
		let themType = globalData.nowTheme.type;
		fileName = fileName && fileName[0];
		if (fileName) {
			suffix1 = /(?<=\.)[^\.]+$/.exec(fileName);
			suffix2 = /(?<=\.)[^\.]+\.[^\.]+$/.exec(fileName);
			suffix1 = suffix1 && suffix1[0];
			suffix2 = suffix2 && suffix2[0];
		}
		if (themType === 'light' || themType === 'contrast light') {
			iconData = iconData.light;
		}
		if (iconData) {
			if (fileType === 'dir') {
				if (opened) {
					if (iconData.folderNamesExpanded && iconData.folderNamesExpanded[fileName]) {
						return iconData.folderNamesExpanded[fileName];
					}
					if (isRoot && iconData.rootFolderExpanded) {
						return iconData.rootFolderExpanded;
					}
					return iconData.folderExpanded || '';
				} else {
					if (iconData.folderNames && iconData.folderNames[fileName]) {
						return iconData.folderNames[fileName];
					}
					if (isRoot && iconData.rootFolder) {
						return iconData.rootFolder;
					}
					return iconData.folder || '';
				}
			} else {
				if (iconData.fileNames && iconData.fileNames[fileName]) {
					return iconData.fileNames[fileName];
				}
				if (iconData.fileExtensions && iconData.fileExtensions[suffix2]) {
					return iconData.fileExtensions[suffix2];
				}
				if (iconData.fileExtensions && iconData.fileExtensions[suffix1]) {
					return iconData.fileExtensions[suffix1];
				}
				return iconData.file || '';
			}
		}
		return '';
	}
	static getIconByExtensions(extensions) {
		let iconData = globalData.nowIconData;
		if (globalData.nowTheme.type === 'light') {
			iconData = globalData.nowIconData.light;
		}
		if (iconData && iconData.fileExtensions) {
			for (let i = 0; i < extensions.length; i++) {
				let ext = extensions[i].slice(1);
				if (iconData.fileExtensions[ext]) {
					return iconData.fileExtensions[ext];
				}
			}
		}
		return (iconData && iconData.file) || '';
	}
	static getIdFromPath(filePath, mtimeMs) {
		let id = '';
		try {
			let stat = fs.statSync(filePath);
			id = `file-${stat.dev}-${stat.ino}${mtimeMs ? '-' + stat.mtimeMs : ''}`;
		} catch (e) {
			id = Util.getUUID();
		}
		return id;
	}
	static getTabById(editorList, id) {
		for (let i = 0; i < editorList.length; i++) {
			if (editorList[i].id === id) {
				return editorList[i];
			}
		}
	}
	static getTabByPath(editorList, filePath) {
		for (let i = 0; i < editorList.length; i++) {
			if (editorList[i].path === filePath) {
				return editorList[i];
			}
		}
	}
	static getFileItemByPath(fileTree, filePath, rootPath) {
		let results = [];
		for (let i = 0; i < fileTree.length; i++) {
			let item = fileTree[i];
			if (rootPath) {
				if (item.path === rootPath) {
					return _findItem(item);
				}
			} else {
				if (item.path === filePath) {
					results.push(item);
				} else if (filePath.startsWith(item.path + path.sep)) {
					let result = _findItem(item);
					result && results.push(result);
				}
			}
		}
		if (!rootPath) {
			return results;
		}

		function _findItem(parentItem) {
			let list = parentItem.children;
			for (let i = 0; i < list.length; i++) {
				let item = list[i];
				if (filePath === item.path) {
					return item;
				} else if (filePath.startsWith(item.path + path.sep)) {
					return _findItem(item);
				}
			}
		}
	}
	static getFileStatus(filePath) {
		let gitDir = '';
		for (let key in globalData.fileStatus) {
			if (filePath == key || filePath.startsWith(key + path.sep)) {
				gitDir = key;
				break;
			}
		}
		let fileStatus = globalData.fileStatus[gitDir] || {};
		let status = fileStatus[filePath] || '';
		let originStatus = status;
		let statusColor = '';
		status = Util.getStatus(status);
		if (!status && globalData.dirStatus[gitDir]) {
			let dirStatus = globalData.dirStatus[gitDir];
			for (let i = 0; i < dirStatus.length; i++) {
				if (filePath == dirStatus[i].path || filePath.startsWith(dirStatus[i].path + path.sep)) {
					status = dirStatus[i].status;
					break;
				}
			}
		}
		statusColor = Util.getFileStatusColor(status);

		return {
			status,
			originStatus,
			statusColor
		};
	}
	static getStatus(status) {
		Util.getStatus.statusMap = Util.getStatus.statusMap || {};
		let result = Util.getStatus.statusMap[status];
		if (result) {
			return result;
		}
		let level = 0;
		result = '';
		for (let i = 0; i < status.length; i++) {
			if (Util.STATUS_LEVEMAP[status[i]] > level) {
				level = Util.STATUS_LEVEMAP[status[i]];
				result = status[i];
			}
		}
		Util.getStatus.statusMap[status] = result;
		return result;
	}
	static getStatusLevel(status) {
		status = Util.getStatus(status);
		return Util.STATUS_LEVEMAP[status]
	}
	static getFileStatusColor(status) {
		let statusMap = {};
		let statusColor = '';
		for (let i = 0; i < status.length; i++) {
			statusMap[status[i]] = true;
		}
		if (statusMap['R']) {
			statusColor = 'my-status-rename';
		} else if (statusMap['?']) {
			statusColor = 'my-status-untracked';
		} else if (statusMap['D']) {
			statusColor = 'my-status-deleted';
		} else if (statusMap['M']) {
			statusColor = 'my-status-modified';
		} else if (statusMap['A']) {
			statusColor = 'my-status-added';
		}
		return statusColor;
	}
	static getMemnuPos(e, menuEl, areaEl) {
		let menuWidth = 0;
		let menuHeight = 0;
		let menuPos = {};
		let $menu = $(menuEl);
		let $parent = $menu.parent();
		let $area = areaEl ? $(areaEl) : $parent;
		let offset = $area.offset();
		let parentOffset = $parent.offset();
		menuWidth = $menu[0].clientWidth;
		menuHeight = $menu[0].clientHeight;
		if (menuHeight + e.clientY > offset.top + $area[0].clientHeight) {
			menuPos.top = e.clientY - parentOffset.top - menuHeight + 'px';
		} else {
			menuPos.top = e.clientY - parentOffset.top + 'px';
		}
		if (menuWidth + e.clientX > offset.left + $area[0].clientWidth) {
			menuPos.left = e.clientX - parentOffset.left - menuWidth + 'px';
		} else {
			menuPos.left = e.clientX - parentOffset.left + 'px';
		}
		return menuPos;
	}
	static getMatchHtml(text, indexs) {
		let index = 0;
		let html = '';
		for (let i = 0; i < indexs.length; i++) {
			let _index = indexs[i];
			if (_index >= text.length) {
				break;
			}
			if (index < _index) {
				html += `<span class="my-unmatch-char">${Util.htmlTrans(text.slice(index, _index))}</span>`;
			}
			html += `<span class="my-match-char">${Util.htmlTrans(text[_index])}</span>`;
			index = _index + 1;
		}
		if (index < text.length) {
			html += `<span class="my-unmatch-char">${Util.htmlTrans(text.slice(index))}</span>`;
		}
		return html;
	}
}
Array.prototype.peek = function (index) {
	if (this.length) {
		return this[this.length - (index || 1)];
	}
};
Array.prototype.empty = function () {
	this.length = 0;
	this.splice();
	return this;
};
Array.prototype.insert = function (item, sort) {
	if (sort && this.length) {
		let left = 0,
			right = this.length - 1;
		while (left < right) {
			let mid = Math.floor((left + right) / 2);
			if (sort(item, this[mid]) > 0) {
				left = mid + 1;
			} else {
				right = mid;
			}
		}
		if (sort(item, this[left]) < 0) {
			left--;
		}
		this.splice(left + 1, 0, item);
	} else {
		this.push(item);
	}
};
String.prototype.peek = function (index) {
	if (this.length) {
		return this[this.length - (index || 1)];
	}
};
//全角符号和中文字符
Util.FULL_ANGLE_REG =
	/[\x00-\x1f\x80-\xa0\xad\u1680\u180E\u2000-\u200f\u2028\u2029\u202F\u205F\u3000\uFEFF\uFFF9-\uFFFC]|[\u1100-\u115F\u11A3-\u11A7\u11FA-\u11FF\u2329-\u232A\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFB\u3000-\u303E\u3041-\u3096\u3099-\u30FF\u3105-\u312D\u3131-\u318E\u3190-\u31BA\u31C0-\u31E3\u31F0-\u321E\u3220-\u3247\u3250-\u32FE\u3300-\u4DBF\u4E00-\uA48C\uA490-\uA4C6\uA960-\uA97C\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFAFF\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE66\uFE68-\uFE6B\uFF01-\uFF60\uFFE0-\uFFE6]|[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
Util.KEYCODE = {
	DELETE: 46,
	BACKSPACE: 8
};
Util.HISTORY_COMMAND = {
	DELETE: 'delete',
	INSERT: 'insert',
	TAB_TO_SPACE: 'tabToSpace',
	SPACE_TO_TAB: 'spaceToTab'
};
Util.CONST_DATA = {
	LINE_COMMENT: 'line-comment',
	BLOCK_COMMENT: 'block-comment',
	BRACKET: 'bracket',
	TAG: 'tag'
};
Util.STATUS_LEVEMAP = {
	A: 1,
	M: 2,
	D: 3,
	'?': 4,
	R: 5
};

export default Util;