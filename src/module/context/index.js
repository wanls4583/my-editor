/*
 * @Author: lisong
 * @Date: 2022-02-18 13:42:22
 * @Description:
 */
import EventBus from '@/event';
import Util from '@/common/util';
import Enum from '@/data/enum';
import expand from 'emmet';
import globalData from '@/data/globalData';

const regs = {
	endTag: /(?=\<\/)/,
	line_comment: /comment\.line/,
	block_comment: /comment\.block/
};

class Context {
	constructor(editor) {
		this.editor = editor;
		this.lineId = 1;
		this.serial = 1;
		this.reset();
	}
	reset() {
		this.htmls = [];
		this.fgLines = [];
		this.lineIdMap = new Map(); //htmls的唯一标识对象
		this.htmls.push({
			lineId: this.lineId++,
			text: '',
			html: '',
			width: 0,
			tabNum: -1,
			tokens: [],
			folds: [],
			states: [],
			stateFold: null
		});
		this.lineIdMap.set(this.htmls[0].lineId, this.htmls[0]);
	}
	setData(prop, value) {
		if (typeof this[prop] === 'function') {
			return;
		}
		this[prop] = value;
	}
	destroy() {
		this.reset();
		this.editor = null;
		this.allText = '';
		cancelIdleCallback(this.setLineWidthTimer);
		cancelAnimationFrame(this.renderTimer);
		clearTimeout(this.renderTimer);
	}
	render(scrollToCursor) {
		this.scrollToCursor = scrollToCursor;
		if (this.renderTimer) {
			return;
		}
		this.renderTimer = requestAnimationFrame(() => {
			this.editor.render(this.scrollToCursor);
			this.renderTimer = null;
		});
	}
	insertContent(text, command) {
		let historyArr = null;
		let cursorPosList = [];
		let serial = ''; // 历史记录连续操作标识
		let historyJoinAble = true;
		let delDirect = '';
		if (command) {
			command.forEach(item => {
				// 多个插入的光标可能相同，这里不能先添加光标
				cursorPosList.push(item.cursorPos);
				delDirect = item.delDirect;
			});
		} else {
			serial = this.serial++;
			// 如果有选中区域，需要先删除选中区域
			if (this.editor.selecter.activedRanges.size) {
				let _historyArr = this.deleteContent('left', null, true);
				_historyArr.serial = serial;
				historyJoinAble = false;
			}
			cursorPosList = this.editor.cursor.multiCursorPos.toArray();
		}
		historyArr = this._insertMultiContent({ text, cursorPosList, command });
		if (command && command.originCursorPosList) {
			this.addCursorList(command.originCursorPosList);
		} else if (command && command.afterCursorPosList) {
			this.addCursorList(command.afterCursorPosList);
		} else {
			this.addCursorList(
				historyArr.map((item) => {
					if (item.ending) {
						return { start: item.preCursorPos, end: item.cursorPos, ending: item.ending }
					} else if (delDirect === 'right') {
						return item.preCursorPos;
					}
					return item.cursorPos
				})
			);
		}
		if (command) {
			historyArr.serial = command.serial;
			historyArr.afterCursorPosList = command.afterCursorPosList;
			historyArr.originCursorPosList = command._originCursorPosList;
			historyArr._originCursorPosList = command.originCursorPosList;
			this.editor.history.updateHistory(historyArr);
		} else {
			historyArr.serial = serial;
			this.editor.history.pushHistory(historyArr, historyJoinAble);
		}
		this.editor.setNowCursorPos(this.editor.cursor.multiCursorPos.get(0));
		return historyArr;
	}
	_insertMultiContent({
		text,
		cursorPosList,
		command,
	}) {
		let prePos = null;
		let historyObj = null;
		let historyArr = [];
		let texts = text instanceof Array ? text : text.split(/\r\n|\n/);
		let lineDelta = 0;
		let columnDelta = 0;
		this.editor.cursor.clearCursorPos();
		if (text === '\n' || text === '\r\n') {
			texts = ['\n'];
		}
		cursorPosList.forEach((cursorPos, index) => {
			let _text = texts.length === cursorPosList.length ? texts[index] : text;
			let commandObj = (command && command[index]) || {};
			let pos = {
				line: cursorPos.line,
				column: cursorPos.column
			};
			pos.line += lineDelta;
			if (prePos && pos.line === prePos.line) {
				pos.column += columnDelta;
			} else {
				columnDelta = 0;
			}
			if (_text) {
				historyObj = this._insertContent(_text, pos, !command);
				prePos = historyObj.cursorPos;
				commandObj.ending && (historyObj.ending = commandObj.ending);
				lineDelta += historyObj.cursorPos.line - historyObj.preCursorPos.line;
				columnDelta += historyObj.cursorPos.column - historyObj.preCursorPos.column;
			} else {
				historyObj = {
					type: Util.HISTORY_COMMAND.DELETE,
					cursorPos: { line: pos.line, column: pos.column },
					preCursorPos: { line: pos.line, column: pos.column }
				};
			}
			historyArr.push(historyObj);
		});
		this.editor.searcher.clearSearch();
		return historyArr;
	}
	// 插入内容
	_insertContent(text, cursorPos, alignmentTab) {
		let lineObj = this.htmls[cursorPos.line - 1];
		let nowLineText = lineObj.text;
		let newPos = Object.assign({}, cursorPos);
		let isLineFeed = text === '\n' || text === '\r\n';
		cursorPos.moveWidth = 0; //去除上下移动光标的初始宽度记录
		text = text.split(/\r\n|\n/);
		text = text.map(item => {
			item = {
				lineId: this.lineId++,
				text: item,
				html: '',
				width: 0,
				tabNum: -1,
				tokens: null,
				folds: null,
				states: null,
				stateFold: null
			};
			this.lineIdMap.set(item.lineId, item);
			return item;
		});
		if (text.length > 1) {
			// 换行对齐
			if (isLineFeed && alignmentTab) {
				let tabStr = _getTabStr.call(
					this,
					nowLineText,
					nowLineText.length === cursorPos.column && this.editor.folder.getRangeFold(cursorPos.line, true)
				);
				if (tabStr) {
					text[1].text = tabStr + text[1].text.trimLeft();
				}
			}
			// 插入多行
			newPos.column = text[text.length - 1].text.length;
			text[0].text = nowLineText.slice(0, cursorPos.column) + text[0].text;
			text[text.length - 1].text = text[text.length - 1].text + nowLineText.slice(cursorPos.column);
			this.htmls = this.htmls
				.slice(0, cursorPos.line - 1)
				.concat(text)
				.concat(this.htmls.slice(cursorPos.line));
		} else {
			// 插入一行
			newPos.column += text[0].text.length;
			text[0].text = nowLineText.slice(0, cursorPos.column) + text[0].text + nowLineText.slice(cursorPos.column);
			this.htmls.splice(cursorPos.line - 1, 1, text[0]);
		}
		newPos.line += text.length - 1;
		this.editor.setData('maxLine', this.htmls.length);
		this.editor.lint.onInsertContentAfter(cursorPos.line, newPos.line);
		this.editor.tokenizer.onInsertContentAfter(cursorPos.line, newPos.line);
		this.editor.folder.onInsertContentAfter(Object.assign({}, cursorPos), Object.assign({}, newPos));
		this.editor.setErrors([]);
		this.editor.setAutoTip(null);
		this.render(true);
		this.setLineWidth(text);
		this.contentChanged();
		this.editor.tabData.status !== '!!' && this.editor.differ.run();
		let historyObj = {
			type: Util.HISTORY_COMMAND.DELETE,
			cursorPos: Object.assign({}, newPos),
			preCursorPos: Object.assign({}, cursorPos)
		};
		return historyObj;

		function _getTabStr(text, plus) {
			let tabNum = 0;
			let tabStr = '';
			//该行有内容
			let spaceNum = /^\s+/.exec(text);
			if (spaceNum) {
				tabNum = /\t+/.exec(spaceNum[0]);
				tabNum = (tabNum && tabNum[0].length) || 0;
				tabNum = tabNum + Math.ceil((spaceNum[0].length - tabNum) / this.editor.tabSize);
			}
			tabNum += plus ? 1 : 0;
			for (let i = 0; i < tabNum; i++) {
				if (this.editor.indent === 'tab') {
					tabStr += '\t';
				} else {
					tabStr += this.editor.space;
				}
			}
			return tabStr;
		}
	}
	/**
	 * 
	 * @param {String} delDirect 删除方向【left|right】
	 * @param {Object|Array} command 历史记录【从历史记录中恢复】
	 * @param {Boolean} justDeleteRange 是否只删除选区范围
	 * @returns 
	 */
	deleteContent(delDirect, command, justDeleteRange) {
		let historyArr = [];
		let rangeList = [];
		let historyJoinAble = true;
		if (command) {
			rangeList = command.map(item => {
				let obj = { start: item.preCursorPos, end: item.cursorPos, };
				item.ending && (obj.ending = item.ending);
				return obj;
			});
		} else {
			this.editor.cursor.multiCursorPos.forEach(item => {
				let range = this.editor.selecter.getRangeByCursorPos(item);
				if (range) {
					if (Util.comparePos(range.start, item) === 0) {
						range.ending = 'left';
					} else {
						range.ending = 'right';
					}
					rangeList.push(range);
					historyJoinAble = false;
				} else {
					rangeList.push(item);
				}
			});
		}
		historyArr = this._deleteMultiContent({
			rangeOrCursorList: rangeList,
			delDirect,
			justDeleteRange,
			command
		});
		if (command && command.originCursorPosList) {
			this.addCursorList(command.originCursorPosList);
		} else if (command && command.afterCursorPosList) {
			this.addCursorList(command.afterCursorPosList);
		} else {
			this.addCursorList(historyArr.map((item) => { return item.cursorPos }));
		}
		if (command) {
			historyArr.serial = command.serial;
			historyArr.afterCursorPosList = command.afterCursorPosList;
			historyArr.originCursorPosList = command._originCursorPosList;
			historyArr._originCursorPosList = command.originCursorPosList;
			this.editor.history.updateHistory(historyArr);
		} else {
			this.editor.history.pushHistory(historyArr, historyJoinAble);
		}
		this.editor.setNowCursorPos(this.editor.cursor.multiCursorPos.get(0));
		return historyArr;
	}
	/**
	 * 同时删除多处
	 * @param {Array} rangeOrCursorList 选区范围或者光标列表 
	 * @param {String} delDirect 删除方向【left|right】
	 * @param {Boolean} justDeleteRange 是否只删除选区范围
	 * @returns 历史记录列表
	 */
	_deleteMultiContent({
		delDirect = 'left',
		rangeOrCursorList,
		justDeleteRange,
	}) {
		let historyArr = [];
		let historyObj = null;
		let prePos = null;
		let lineDelta = 0;
		let columnDelta = 0;
		this.editor.cursor.clearCursorPos();
		rangeOrCursorList.forEach(item => {
			if (item.start && item.end) {
				_deleteRangePos.call(this, item);
			} else {
				_deleteCursorPos.call(this, item);
			}
		});
		this.editor.searcher.clearSearch();
		return historyArr;

		function _deleteCursorPos(cursorPos) {
			let pos = {
				line: cursorPos.line,
				column: cursorPos.column
			};
			pos.line -= lineDelta;
			if (prePos && pos.line === prePos.line) {
				pos.column -= columnDelta;
			} else {
				columnDelta = 0;
			}
			if (justDeleteRange || pos.line === 1 && pos.column === 0) {
				historyObj = {
					type: Util.HISTORY_COMMAND.INSERT,
					cursorPos: { line: pos.line, column: pos.column }
				}
			} else {
				historyObj = this._deleteContent(pos, delDirect);
				lineDelta += historyObj.preCursorPos.line - historyObj.cursorPos.line;
				columnDelta += historyObj.preCursorPos.column - historyObj.cursorPos.column;
				prePos = historyObj.cursorPos;
			}
			historyArr.push(historyObj);
		}

		function _deleteRangePos(rangePos) {
			let start = rangePos.start;
			let end = rangePos.end;
			start.line -= lineDelta;
			end.line -= lineDelta;
			if (prePos && start.line === prePos.line) {
				start.column -= columnDelta;
				if (start.line === end.line) {
					end.column -= columnDelta;
				} else {
					columnDelta = 0;
				}
			} else {
				columnDelta = 0;
			}
			if (Util.comparePos(start, end) === 0) {
				historyObj = {
					type: Util.HISTORY_COMMAND.INSERT,
					cursorPos: { line: start.line, column: start.column }
				}
			} else {
				historyObj = this._deleteContent(rangePos, delDirect);
				lineDelta += historyObj.preCursorPos.line - historyObj.cursorPos.line;
				columnDelta += historyObj.preCursorPos.column - historyObj.cursorPos.column;
				prePos = historyObj.cursorPos;
			}
			historyArr.push(historyObj);
		}
	}
	// 删除内容
	_deleteContent(cursorPos, delDirect) {
		let range = null;
		if (cursorPos.start && cursorPos.end) {
			//删除范围内的内容
			range = cursorPos;
			cursorPos = range.end;
		} else {
			//去除上下移动光标的初始宽度记录
			cursorPos.moveWidth = 0;
		}
		let start = null;
		let startObj = this.htmls[cursorPos.line - 1];
		let text = startObj.text;
		let deleteText = '';
		let rangeUuid = [startObj.lineId];
		let originPos = Object.assign({}, cursorPos);
		let newPos = Object.assign({}, cursorPos);
		if (range) {
			// 删除选中区域
			let end = range.end;
			let endObj = this.htmls[end.line - 1];
			start = range.start;
			startObj = this.htmls[start.line - 1];
			text = startObj.text;
			deleteText = this.getRangeText(range.start, range.end);
			if (start.line == 1 && end.line == this.editor.maxLine) {
				//全选删除
				rangeUuid = [this.editor.maxWidthObj.lineId];
				this.lineIdMap.clear();
			} else {
				rangeUuid = this.htmls.slice(start.line - 1, end.line).map(item => {
					this.lineIdMap.delete(item.lineId);
					return item.lineId;
				});
			}
			this.lineIdMap.set(startObj.lineId, startObj);
			if (start.line == end.line) {
				// 单行选中
				text = text.slice(0, start.column) + text.slice(end.column);
				startObj.text = text;
			} else {
				// 多行选中
				text = text.slice(0, start.column);
				startObj.text = text;
				text = endObj.text;
				text = text.slice(end.column);
				startObj.text += text;
				this.htmls.splice(start.line, end.line - start.line);
			}
			newPos.line = start.line;
			newPos.column = start.column;
		} else if (delDirect === 'right') {
			// 向后删除一个字符
			if (cursorPos.column == text.length) {
				// 光标处于行尾
				if (cursorPos.line < this.htmls.length) {
					this.lineIdMap.delete(this.htmls[cursorPos.line].lineId);
					text = startObj.text + this.htmls[cursorPos.line].text;
					this.htmls.splice(cursorPos.line, 1);
					deleteText = '\n';
					originPos = {
						line: cursorPos.line + 1,
						column: 0
					};
				}
			} else {
				deleteText = text[cursorPos.column];
				text = text.slice(0, cursorPos.column) + text.slice(cursorPos.column + 1);
				originPos = {
					line: cursorPos.line,
					column: cursorPos.column + 1
				};
			}
			startObj.text = text;
		} else {
			// 向前删除一个字符
			if (cursorPos.column == 0) {
				// 光标处于行首
				if (cursorPos.line > 1) {
					let column = this.htmls[cursorPos.line - 2].text.length;
					this.lineIdMap.delete(this.htmls[cursorPos.line - 2].lineId);
					text = this.htmls[cursorPos.line - 2].text + text;
					this.htmls.splice(cursorPos.line - 2, 1);
					deleteText = '\n';
					newPos.line = cursorPos.line - 1;
					newPos.column = column;
				}
			} else {
				deleteText = text[cursorPos.column - 1];
				text = text.slice(0, cursorPos.column - 1) + text.slice(cursorPos.column);
				newPos.column = cursorPos.column - 1;
			}
			startObj.text = text;
		}
		startObj.width = this.editor.getStrWidth(startObj.text);
		startObj.tabNum = -1;
		startObj.html = '';
		startObj.tokens = null;
		startObj.folds = null;
		startObj.states = null;
		startObj.stateFold = null;
		this.editor.setData('maxLine', this.htmls.length);
		this.editor.lint.onDeleteContentAfter(originPos.line, newPos.line);
		this.editor.tokenizer.onDeleteContentAfter(originPos.line, newPos.line);
		this.editor.folder.onDeleteContentAfter(Object.assign({}, originPos), Object.assign({}, newPos));
		this.editor.setErrors([]);
		this.editor.setAutoTip(null);
		this.render(true);
		this.contentChanged();
		this.editor.tabData.status !== '!!' && this.editor.differ.run();
		// 更新最大文本宽度
		if (startObj.width >= this.editor.maxWidthObj.width) {
			this.editor.setData('maxWidthObj', {
				lineId: startObj.lineId,
				text: startObj.text,
				width: startObj.width
			});
		} else if (rangeUuid.indexOf(this.editor.maxWidthObj.lineId) > -1) {
			this.setMaxWidth();
		}
		let historyObj = {
			type: Util.HISTORY_COMMAND.INSERT,
			cursorPos: Object.assign({}, newPos),
			preCursorPos: Object.assign({}, originPos),
			text: deleteText,
			delDirect: delDirect
		};
		range && range.ending && (historyObj.ending = range.ending);
		return historyObj;
	}
	addCursorList(cursorPosList) {
		for (let i = 0; i < cursorPosList.length; i++) {
			let item = cursorPosList[i];
			if (item.start && item.end) {
				this.editor.selecter.addRange({ start: item.start, end: item.end, active: true });
				this.editor.cursor.addCursorPos(item.ending === 'left' ? item.start : item.end);
			} else {
				this.editor.cursor.addCursorPos(item);
			}
		}
	}
	insertEmptyLineUp() {
		let cursorPosList = [];
		let preItem = {};
		let lineOne = false;
		let historyArr = null;
		let originCursorPosList = [];
		this.editor.cursor.multiCursorPos.forEach((item) => {
			let range = this.editor.selecter.getRangeByCursorPos(item);
			if (preItem.line !== item.line) {
				if (item.line === 1) {
					cursorPosList.push({
						line: item.line,
						column: 0
					});
					lineOne = true;
				} else {
					cursorPosList.push({
						line: item.line - 1,
						column: this.htmls[item.line - 2].text.length
					});
				}
			}
			if (range) {
				originCursorPosList.push({
					start: { line: range.start.line, column: range.start.column },
					end: { line: range.end.line, column: range.end.column },
					ending: Util.comparePos(range.start, range) === 0 ? 'left' : 'right'
				});
			} else {
				originCursorPosList.push({
					line: item.line,
					column: item.column
				});
			}
			preItem = item;
		});
		historyArr = this._insertMultiContent({ text: '\n', cursorPosList });
		historyArr.originCursorPosList = originCursorPosList;
		this.addCursorList(historyArr.map((item) => { return item.cursorPos }));
		this.editor.history.pushHistory(historyArr);
		if (lineOne) {
			this.editor.cursor.updateCursorPos(this.editor.cursor.multiCursorPos.get(0), 1, 0);
		}
	}
	insertEmptyLineDown() {
		let cursorPosList = [];
		let preItem = {};
		let historyArr = null;
		let originCursorPosList = [];
		this.editor.cursor.multiCursorPos.forEach((item) => {
			let range = this.editor.selecter.getRangeByCursorPos(item);
			if (preItem.line !== item.line) {
				cursorPosList.push({
					line: item.line,
					column: this.htmls[item.line - 1].text.length
				});
			}
			if (range) {
				originCursorPosList.push({
					start: { line: range.start.line, column: range.start.column },
					end: { line: range.end.line, column: range.end.column },
					ending: Util.comparePos(range.start, range) === 0 ? 'left' : 'right'
				});
			} else {
				originCursorPosList.push({
					line: item.line,
					column: item.column
				});
			}
			preItem = item;
		});
		historyArr = this._insertMultiContent({ text: '\n', cursorPosList });
		historyArr.originCursorPosList = originCursorPosList;
		this.addCursorList(historyArr.map((item) => { return item.cursorPos }));
		this.editor.history.pushHistory(historyArr);
	}
	/**
	 * 向前或者向后删除一个单词
	 * @param {String} delDirect [left|right] 
	 */
	deleteWord(delDirect) {
		let preRange = null;
		let historyArr = null;
		let rangeList = [];
		let originCursorPosList = [];
		this.editor.cursor.multiCursorPos.forEach(item => {
			let range = this.editor.selecter.getRangeByCursorPos(item);
			let start = null, end = null;
			if (range) {
				if (preRange && Util.comparePos(range.start, preRange.end) < 0) {
					rangeList.pop();
				}
				if (Util.comparePos(range.start, item) === 0) {
					range.ending = 'left';
				} else {
					range.ending = 'right';
				}
				preRange = range;
				rangeList.push(preRange);
			} else {
				if (delDirect === 'left') {
					end = { line: item.line, column: item.column };
					start = this.editor.cursor.moveCursor(item, delDirect, true, true);
				} else {
					start = { line: item.line, column: item.column };
					end = this.editor.cursor.moveCursor(item, delDirect, true, true);
				}
				if (preRange && Util.comparePos(preRange.end, start) >= 0) {
					if (!preRange.ending) {
						preRange.end = end;
					}
				} else if (Util.comparePos(end, start) > 0) {
					preRange = { start: start, end: end };
					rangeList.push(preRange);
				}
			}
			originCursorPosList.push({
				line: item.line,
				column: item.column
			});
		});
		if (rangeList.length) {
			historyArr = this._deleteMultiContent({ rangeOrCursorList: rangeList, delDirect });
			historyArr.originCursorPosList = originCursorPosList;
			this.addCursorList(historyArr.map((item) => { return item.cursorPos }));
			this.editor.history.pushHistory(historyArr);
		}
	}
	// 向上移动整行内容
	moveLineUp() {
		let historyArr = null;
		let serial = this.serial++;
		let nextLine = Infinity;
		let texts = [];
		let cursorPosList = [];
		let originCursorPosList = [];
		let afterCursorPosList = [];
		let list = this.editor.cursor.multiCursorPos.toArray();
		for (let i = list.length - 1; i >= 0; i--) {
			let item = list[i];
			let range = this.editor.selecter.getRangeByCursorPos(item);
			let replaceRange = null;
			let replaceText = '';
			let joinRange = false;
			if (range) {
				replaceRange = {
					start: { line: range.start.line - 1, column: 0 },
					end: { line: range.end.line, column: this.htmls[range.end.line - 1].text.length }
				}
				originCursorPosList.push({
					start: { line: range.start.line, column: range.start.column },
					end: { line: range.end.line, column: range.end.column },
				});
			} else {
				replaceRange = {
					start: { line: item.line - 1, column: 0 },
					end: { line: item.line, column: this.htmls[item.line - 1].text.length }
				}
				originCursorPosList.push({ line: item.line, column: item.column });
			}
			if (replaceRange.start.line > 0) {
				if (replaceRange.end.line >= nextLine) { //和下一个替换区域相邻，合并区域
					let nextRange = cursorPosList.peek();
					nextRange.start = replaceRange.start;
					replaceRange = nextRange;
					joinRange = true;
				} else { //添加替换区域
					cursorPosList.push(replaceRange);
				}
				replaceText =
					this.getRangeText(
						{ line: replaceRange.start.line + 1, column: 0 },
						{ line: replaceRange.end.line, column: this.htmls[replaceRange.end.line - 1].text.length }
					)
					+ '\n'
					+ this.htmls[replaceRange.start.line - 1].text;
				if (joinRange) {
					texts[texts.length - 1] = replaceText;
				} else {
					texts.push(replaceText);
				}
				if (range) {
					afterCursorPosList.push({
						start: { line: range.start.line - 1, column: range.start.column },
						end: { line: range.end.line - 1, column: range.end.column },
					});
				} else {
					afterCursorPosList.push({ line: item.line - 1, column: item.column });
				}
				nextLine = replaceRange.start.line;
			}
		}
		if (cursorPosList.length) {
			cursorPosList.reverse();
			originCursorPosList.reverse();
			afterCursorPosList.reverse();
			texts.reverse();
			historyArr = this._deleteMultiContent({ rangeOrCursorList: cursorPosList });
			historyArr.serial = serial;
			historyArr.originCursorPosList = originCursorPosList;
			this.editor.history.pushHistory(historyArr);
			historyArr = this._insertMultiContent({
				text: texts,
				cursorPosList: historyArr.map((item) => { return item.cursorPos })
			});
			historyArr.serial = serial;
			historyArr.afterCursorPosList = afterCursorPosList;
			this.addCursorList(afterCursorPosList);
			this.editor.history.pushHistory(historyArr);
		}
	}
	// 向下移动整行内容
	moveLineDown() {
		let historyArr = null;
		let serial = this.serial++;
		let preLine = -Infinity;
		let texts = [];
		let cursorPosList = [];
		let originCursorPosList = [];
		let afterCursorPosList = [];
		let list = this.editor.cursor.multiCursorPos.toArray();
		for (let i = 0; i < list.length; i++) {
			let item = list[i];
			let range = this.editor.selecter.getRangeByCursorPos(item);
			let replaceRange = null;
			let replaceText = '';
			let joinRange = false;
			if (range) {
				replaceRange = {
					start: { line: range.start.line, column: 0 },
					end: { line: range.end.line + 1, column: this.htmls[range.end.line].text.length }
				}
				originCursorPosList.push({
					start: { line: range.start.line, column: range.start.column },
					end: { line: range.end.line, column: range.end.column },
				});
			} else {
				replaceRange = {
					start: { line: item.line, column: 0 },
					end: { line: item.line + 1, column: this.htmls[item.line].text.length }
				}
				originCursorPosList.push({ line: item.line, column: item.column });
			}
			if (replaceRange.end.line < this.editor.maxLine) {
				if (replaceRange.start.line <= preLine + 1) { //和上一个替换区域相邻，合并区域
					let preRange = cursorPosList.peek();
					preRange.end = replaceRange.end;
					replaceRange = preRange;
					joinRange = true;
				} else { //添加替换区域
					cursorPosList.push(replaceRange);
				}
				replaceText =
					this.htmls[replaceRange.end.line - 1].text
					+ '\n'
					+ this.getRangeText(
						{ line: replaceRange.start.line, column: 0 },
						{ line: replaceRange.end.line - 1, column: this.htmls[replaceRange.end.line - 2].text.length }
					);
				if (joinRange) {
					texts[texts.length - 1] = replaceText;
				} else {
					texts.push(replaceText);
				}
				if (range) {
					afterCursorPosList.push({
						start: { line: range.start.line + 1, column: range.start.column },
						end: { line: range.end.line + 1, column: range.end.column },
					});
				} else {
					afterCursorPosList.push({ line: item.line + 1, column: item.column });
				}
				preLine = replaceRange.end.line;
			}
		}
		if (cursorPosList.length) {
			historyArr = this._deleteMultiContent({ rangeOrCursorList: cursorPosList });
			historyArr.serial = serial;
			historyArr.originCursorPosList = originCursorPosList;
			this.editor.history.pushHistory(historyArr);
			historyArr = this._insertMultiContent({
				text: texts,
				cursorPosList: historyArr.map((item) => { return item.cursorPos })
			});
			historyArr.serial = serial;
			historyArr.afterCursorPosList = afterCursorPosList;
			this.addCursorList(afterCursorPosList);
			this.editor.history.pushHistory(historyArr);
		}
	}
	// 向上复制行内容
	copyLineUp() {
		this.copyLine('up');
	}
	// 向下复制行内容
	copyLineDown() {
		this.copyLine('down');
	}
	// 复制行内容
	copyLine(copyDirect = 'up') {
		let historyArr = null;
		let index = 0;
		let preLine = -1;
		let texts = [];
		let cursorPosList = [];
		let originCursorPosList = [];
		let afterCursorPosList = [];
		let list = this.editor.cursor.multiCursorPos.toArray();
		for (let i = 0; i < list.length; i++) {
			let item = list[i];
			let range = this.editor.selecter.getRangeByCursorPos(item);
			let cursorPos = null;
			let text = '';
			if (range) {
				cursorPos = { line: range.start.line, column: 0 };
				text =
					this.htmls.slice(range.start.line - 1, range.end.line).map((item) => {
						return item.text;
					}).join('\n') + '\n';
				originCursorPosList.push({
					start: { line: range.start.line, column: range.start.column },
					end: { line: range.end.line, column: range.end.column },
				});
				list[i] = range;
			} else {
				cursorPos = { line: item.line, column: 0 };
				text = this.htmls[item.line - 1].text + '\n';
				originCursorPosList.push({ line: item.line, column: item.column });
			}
			if (cursorPos.line > preLine) { //添加移动区域
				cursorPosList.push(cursorPos);
				texts.push(text);
			} else if (range) { //合并移动区域
				if (range.end.line > range.start.line) {
					texts[texts.length - 1] +=
						this.htmls.slice(range.start.line, range.end.line).map((item) => {
							return item.text;
						}).join('\n') + '\n';
				}
			}
			preLine = range ? range.end.line : item.line;
		}
		historyArr = this._insertMultiContent({ text: texts, cursorPosList, afterCursorPosList });
		historyArr.originCursorPosList = originCursorPosList;
		historyArr.afterCursorPosList = afterCursorPosList;
		// 更正光标位置
		for (let i = 0; i < historyArr.length; i++) {
			let cursorPos = historyArr[i].cursorPos;
			let item = list[index];
			let nextItem = null;
			let preLine = -1;
			let preCursorPos = null;
			if (item.start) {
				let delta = item.end.line - item.start.line;
				preLine = item.end.line;
				if (copyDirect === 'up') {
					preCursorPos = {
						start: { line: cursorPos.line, column: item.start.column },
						end: { line: cursorPos.line + delta, column: item.end.column },
					};
				} else {
					preCursorPos = {
						start: { line: cursorPos.line - 1 - delta, column: item.start.column },
						end: { line: cursorPos.line - 1, column: item.end.column },
					}
				}
			} else {
				preLine = item.line;
				if (copyDirect === 'up') {
					preCursorPos = { line: cursorPos.line, column: item.column };
				} else {
					preCursorPos = { line: cursorPos.line - 1, column: item.column };
				}
			}
			afterCursorPosList.push(preCursorPos);
			nextItem = list[++index];
			while (nextItem) {
				let line = preCursorPos.end ? preCursorPos.end.line : preCursorPos.line;
				if (nextItem.start) {
					if (nextItem.start.line === preLine) {
						let delta = nextItem.end.line - nextItem.start.line;
						preLine = nextItem.end.line;
						preCursorPos = {
							start: { line: line, column: nextItem.start.column },
							end: { line: line + delta, column: nextItem.end.column }
						};
						afterCursorPosList.push(preCursorPos);
					} else {
						break;
					}
				} else if (nextItem.line === preLine) {
					preLine = nextItem.line;
					preCursorPos = { line: line, column: nextItem.column };
					afterCursorPosList.push(preCursorPos);
				} else {
					break;
				}
				nextItem = list[++index];
			}
		}
		this.addCursorList(afterCursorPosList);
		this.editor.history.pushHistory(historyArr);
	}
	// 删除当前行
	deleteLine() {
		let historyArr = null;
		let list = this.editor.cursor.multiCursorPos.toArray();
		let originCursorPosList = [];
		let afterCursorPosList = [];
		let cursorPosList = [];
		let columns = [];
		let preLine = -1;
		for (let i = 0; i < list.length; i++) {
			let item = list[i];
			let range = this.editor.selecter.getRangeByCursorPos(item);
			if (range) {
				let end = { line: range.end.line + 1, column: 0 };
				if (end.line > this.editor.maxLine) {
					end = {
						line: range.end.line,
						column: this.htmls[range.end.line - 1].text.length
					};
				}
				if (preLine + 1 >= range.start.line) {
					cursorPosList.peek().end = end;
				} else {
					cursorPosList.push({ start: { line: range.start.line, column: 0 }, end: end });
					columns.push(item.column);
				}
				originCursorPosList.push({
					start: { line: range.start.line, column: range.start.column },
					end: { line: range.end.line, column: range.end.column },
					ending: Util.comparePos(range.start, item) === 0 ? 'left' : 'right'
				});
				preLine = range.end.line;
			} else {
				let end = { line: item.line + 1, column: 0 };
				if (end.line > this.editor.maxLine) {
					end = { line: item.line, column: this.htmls[item.line - 1].text.length };
				}
				if (preLine + 1 >= item.line) {
					cursorPosList.peek().end = end;
				} else {
					cursorPosList.push({ start: { line: item.line, column: 0 }, end: end });
					columns.push(item.column);
				}
				originCursorPosList.push({ line: item.line, column: item.column });
				preLine = item.line;
			}
		}
		historyArr = this._deleteMultiContent({ rangeOrCursorList: cursorPosList });
		historyArr.forEach((item, index) => {
			let column = columns[index];
			if (column > this.htmls[item.cursorPos.line - 1].text.length) {
				column = this.htmls[item.cursorPos.line - 1].text.length;
			}
			afterCursorPosList.push({ line: item.cursorPos.line, column: column });
		});
		historyArr.originCursorPosList = originCursorPosList;
		historyArr.afterCursorPosList = afterCursorPosList;
		this.addCursorList(afterCursorPosList);
		this.editor.history.pushHistory(historyArr);
	}
	// 文件变动，重写加载文件内容
	reload(text) {
		let range = {
			start: { line: 1, column: 0 },
			end: { line: this.htmls.length, column: this.htmls.peek().text.length }
		};
		this.editor.searcher.clearSearch();
		this.replace(text, [range]);
		// 格式化内容时，延迟渲染，等待高亮
		cancelAnimationFrame(this.renderTimer);
		this.renderTimer = setTimeout(() => {
			this.renderTimer = null;
			this.render();
		}, 200);
	}
	replace(texts, ranges) {
		let historyArr = null;
		let serial = this.serial++;
		let originCursorPosList = [];
		this.editor.cursor.multiCursorPos.forEach((item) => {
			let range = this.editor.selecter.getRangeByCursorPos(item);
			if (range) {
				originCursorPosList.push({
					start: { line: range.start.line, column: range.start.column },
					end: { line: range.end.line, column: range.end.column },
					ending: Util.comparePos(range.start, range) === 0 ? 'left' : 'right'
				});
			} else {
				originCursorPosList.push({
					line: item.line,
					column: item.column
				});
			}
		});
		historyArr = this._deleteMultiContent({ rangeOrCursorList: ranges });
		historyArr.serial = serial;
		this.editor.history.pushHistory(historyArr);
		historyArr = this._insertMultiContent({
			text: texts,
			cursorPosList: historyArr.map((item) => { return item.cursorPos })
		});
		historyArr.serial = serial;
		this.addCursorList(historyArr.map((item) => { return item.cursorPos }));
		this.editor.history.pushHistory(historyArr);
	}
	// 点击自动提示替换输入的内容
	replaceTip(tip) {
		let word = tip.word || '';
		let after = tip.after || '';
		let before = tip.before || '';
		let result = before + _getResult(tip) + after;
		let ranges = null;
		if (result === word) {
			//替换前后一致，不做操作
			return;
		}
		ranges = _getRanges.call(this);
		this.replace(result, ranges);
		_updatePos.call(this);
		if (tip.type === Enum.TOKEN_TYPE.CSS_PROPERTY) {
			//选中css属性名后，自动弹出属性值列表
			this.editor.autocomplete.search();
		}

		function _getResult(tip) {
			let result = '';
			if (tip.type === Enum.TOKEN_TYPE.EMMET_HTML || tip.type === Enum.TOKEN_TYPE.EMMET_CSS) {
				try {
					const config = {};
					if (tip.type === Enum.TOKEN_TYPE.EMMET_CSS) {
						config.type = 'stylesheet';
					}
					result = expand(tip.result, config);
				} catch (e) {
					result = tip.result;
				}
			} else if (tip.type === Enum.TOKEN_TYPE.TAG_NAME) {
				result += tip.result + `></${tip.result}>`;
			} else {
				result = tip.result;
			}
			return result;
		}

		function _getRanges() {
			let ranges = [];
			this.editor.cursor.multiCursorPos.forEach(cursorPos => {
				let range = null;
				range = {
					start: { line: cursorPos.line, column: cursorPos.column - word.length },
					end: { line: cursorPos.line, column: cursorPos.column }
				};
				ranges.push(range);
			});
			return ranges;
		}

		function _updatePos() {
			if (tip.type === Enum.TOKEN_TYPE.TAG_NAME || tip.type === Enum.TOKEN_TYPE.EMMET_HTML) {
				//生成标签后，光标定位到标签中间的位置
				let exec = regs.endTag.exec(result);
				if (exec) {
					let text = result.slice(exec.index);
					let deltaArr = text.split('\n');
					let multiCursorPos = this.editor.cursor.multiCursorPos.toArray();
					for (let i = multiCursorPos.length - 1; i >= 0; i--) {
						let cursorPos = _getDeltaPos.call(this, deltaArr, multiCursorPos[i]);
						this.editor.cursor.updateCursorPos(multiCursorPos[i], cursorPos.line, cursorPos.column);
					}
				}
			} else if (tip.type === Enum.TOKEN_TYPE.ATTR_NAME) {
				//选中标签属性后，光标移动端""内
				this.editor.cursor.multiCursorPos.forEach(item => {
					this.editor.cursor.moveCursor(item, 'left');
				});
			}
		}

		function _getDeltaPos(deltaArr, cursorPos) {
			let line = cursorPos.line;
			let column = cursorPos.column;
			if (deltaArr.length === 1) {
				column -= deltaArr[0].length;
			} else {
				line -= deltaArr.length - 1;
				column = this.htmls[line - 1].text.length - deltaArr[0].length;
			}
			return {
				line: line,
				column: column
			};
		}
	}
	convertTabToSpace(command) {
		let contentChanged = false;
		let tabSize = this.editor.tabSize;
		let space = this.editor.space;
		if (command) {
			tabSize = command.tabSize;
			space = command.space;
		}
		this.editor.cursor.multiCursorPos.forEach(cursorPos => {
			_checkPos.call(this, cursorPos);
		});
		this.editor.selecter.ranges.forEach(range => {
			_checkPos.call(this, range.start);
			_checkPos.call(this, range.end);
		});
		this.editor.fSelecter.ranges.forEach(range => {
			_checkPos.call(this, range.start);
			_checkPos.call(this, range.end);
		});
		this.editor.folder.folds.forEach(fold => {
			let text = this.htmls[fold.start.line - 1].text;
			let tabCount = _getTabNum(text);
			if (tabCount) {
				tabCount = tabCount * (tabSize - 1);
				fold.start.startIndex += tabCount;
				fold.start.endIndex += tabCount;
			}
			text = this.htmls[fold.end.line - 1].text;
			tabCount = _getTabNum(text);
			if (tabCount) {
				tabCount = tabCount * (tabSize - 1);
				fold.end.startIndex += tabCount;
				fold.end.endIndex += tabCount;
			}
		});
		this.htmls.forEach(lineObj => {
			let tabCount = _getTabNum(lineObj.text);
			tabCount = tabCount * (tabSize - 1);
			if (tabCount > 0) {
				if (lineObj.tokens) {
					lineObj.tokens.forEach((token, index) => {
						if (index > 0) {
							token.startIndex += tabCount;
						}
						token.endIndex += tabCount;
					});
				}
				if (lineObj.folds) {
					lineObj.folds.forEach(fold => {
						fold.startIndex += tabCount;
						fold.endIndex += tabCount;
					});
				}
				if (lineObj.stateFold) {
					lineObj.stateFold.startIndex += tabCount;
					lineObj.stateFold.endIndex += tabCount;
				}
				lineObj.text = lineObj.text.replace(/(?<=^\s*)\t/g, space);
				lineObj.html = '';
				lineObj.tabNum = -1;
				contentChanged = true;
			}
		});
		if (contentChanged) {
			this.contentChanged();
			EventBus.$emit('indent-change', 'space');
			this.editor.tabData.status !== '!!' && this.editor.differ.run();
			this.render();
			if (command) {
				this.editor.history.updateHistory({ type: Util.HISTORY_COMMAND.SPACE_TO_TAB, tabSize, space });
			} else {
				this.editor.history.pushHistory({ type: Util.HISTORY_COMMAND.SPACE_TO_TAB, tabSize, space });
			}
		}

		function _getTabNum(text) {
			let tabNum = 0;
			let res = /^\s+/.exec(text);
			if (res) {
				res = res[0];
				for (let i = 0; i < res.length; i++) {
					if (res[i] === '\t') {
						tabNum++;
					}
				}
			}
			return tabNum;
		}

		function _checkPos(cursorPos) {
			let text = this.htmls[cursorPos.line - 1].text.slice(0, cursorPos.column);
			let tabCount = _getTabNum(text);
			if (tabCount) {
				tabCount = tabCount * (tabSize - 1);
				cursorPos.column += tabCount;
			}
		}
	}
	convertSpaceToTab(command) {
		let contentChanged = false;
		let tabSize = this.editor.tabSize;
		let space = this.editor.space;
		if (command) {
			tabSize = command.tabSize;
			space = command.space;
		}
		let indexReg = new RegExp(`^(\\t|${space})+`);
		let reg = new RegExp(`(?<=^\\s*)${space}`, 'g');
		this.editor.cursor.multiCursorPos.forEach(cursorPos => {
			_checkPos.call(this, cursorPos);
		});
		this.editor.selecter.ranges.forEach(range => {
			_checkPos.call(this, range.start);
			_checkPos.call(this, range.end);
		});
		this.editor.fSelecter.ranges.forEach(range => {
			_checkPos.call(this, range.start);
			_checkPos.call(this, range.end);
		});
		this.editor.folder.folds.forEach(fold => {
			let text = this.htmls[fold.start.line - 1].text;
			let tabCount = _getTabNum(text);
			if (tabCount) {
				tabCount = tabCount * (tabSize - 1);
				fold.start.startIndex -= tabCount;
				fold.start.endIndex -= tabCount;
			}
			text = this.htmls[fold.end.line - 1].text;
			tabCount = _getTabNum(text);
			if (tabCount) {
				tabCount = tabCount * (tabSize - 1);
				fold.end.startIndex -= tabCount;
				fold.end.endIndex -= tabCount;
			}
		});
		this.htmls.forEach(lineObj => {
			let tabCount = _getTabNum(lineObj.text);
			tabCount = tabCount * (tabSize - 1);
			if (tabCount > 0) {
				if (lineObj.tokens) {
					lineObj.tokens.forEach((token, index) => {
						if (index > 0) {
							token.startIndex -= tabCount;
						}
						token.endIndex -= tabCount;
					});
				}
				if (lineObj.folds) {
					lineObj.folds.forEach(fold => {
						fold.startIndex -= tabCount;
						fold.endIndex -= tabCount;
					});
				}
				if (lineObj.stateFold) {
					lineObj.stateFold.startIndex -= tabCount;
					lineObj.stateFold.endIndex -= tabCount;
				}
				lineObj.text = lineObj.text.replace(reg, '\t');
				lineObj.html = '';
				lineObj.tabNum = -1;
				contentChanged = true;
			}
		});
		if (contentChanged) {
			this.contentChanged();
			EventBus.$emit('indent-change', 'tab');
			this.editor.tabData.status !== '!!' && this.editor.differ.run();
			this.render();
			if (command) {
				this.editor.history.updateHistory({ type: Util.HISTORY_COMMAND.TAB_TO_SPACE, tabSize, space });
			} else {
				this.editor.history.pushHistory({ type: Util.HISTORY_COMMAND.TAB_TO_SPACE, tabSize, space });
			}
		}

		function _getTabNum(text) {
			let tabNum = 0;
			let res = text.match(reg);
			tabNum = res && res.length;
			return tabNum;
		}

		function _checkPos(cursorPos) {
			let text = this.htmls[cursorPos.line - 1].text;
			let preText = text.slice(0, cursorPos.column);
			let tabCount = _getTabNum(preText);
			tabCount = tabCount * (tabSize - 1);
			if (tabCount) {
				let index = indexReg.exec(preText)[0].length;
				if (cursorPos.column > index && text.slice(index, index + 4) === space) {
					cursorPos.column = index - tabCount + 1;
				} else {
					cursorPos.column -= tabCount;
				}
			}
		}
	}
	addAnIndent() {
		let preLine = -1;
		let historyArr = null;
		let cursorPosList = [];
		let afterCursorPosList = [];
		let originCursorPosList = this.getOriginCursorPosList();
		let text = this.editor.indent === 'tab' ? '\t' : Util.space(this.editor.tabSize);
		let charSize = this.editor.indent === 'tab' ? 1 : this.editor.tabSize;
		this.editor.cursor.multiCursorPos.forEach((item) => {
			let range = this.editor.selecter.getRangeByCursorPos(item);
			if (range) {
				if (preLine !== range.start.line) {
					for (let line = range.start.line; line <= range.end.line; line++) {
						cursorPosList.push({ line: line, column: 0 });
					}
				}
				afterCursorPosList.push({
					start: { line: range.start.line, column: range.start.column + charSize },
					end: { line: range.end.line, column: range.end.column + charSize },
					ending: Util.comparePos(range.start, range) === 0 ? 'left' : 'right'
				})
				preLine = range.start.line;
			} else {
				if (preLine !== item.line) {
					cursorPosList.push({ line: item.line, column: 0 });
				}
				afterCursorPosList.push({
					line: item.line,
					column: item.column + charSize
				});
			}
		});
		historyArr = this._insertMultiContent({ text: text, cursorPosList });
		historyArr.originCursorPosList = originCursorPosList;
		historyArr.afterCursorPosList = afterCursorPosList;
		this.addCursorList(afterCursorPosList);
		this.editor.history.pushHistory(historyArr);
	}
	removeAnIndent() {
		let preLine = -1;
		let historyArr = null;
		let cursorPosList = [];
		let afterCursorPosList = [];
		let originCursorPosList = this.getOriginCursorPosList();
		this.editor.cursor.multiCursorPos.forEach((item) => {
			let range = this.editor.selecter.getRangeByCursorPos(item);
			if (range) {
				let afterStart = { line: range.start.line, column: range.start.column };
				let afterEnd = { line: range.end.line, column: range.end.column };
				let ending = Util.comparePos(range.start, range) === 0 ? 'left' : 'right';
				if (preLine !== range.start.line) {
					for (let line = range.start.line; line <= range.end.line; line++) {
						let charSize = _getCharSize.call(this, line);
						if (charSize) {
							cursorPosList.push({
								start: { line: line, column: 0 },
								end: { line: line, column: charSize }
							});
							if (line === afterStart.line) {
								afterStart.column -= charSize;
							}
							if (line === afterEnd.line) {
								afterEnd.column -= charSize;
							}
						}
					}
				}
				afterCursorPosList.push({ start: afterStart, end: afterEnd, ending: ending });
				preLine = range.start.line;
			} else {
				let afterCursorPos = { line: item.line, column: item.column }
				if (preLine !== item.line) {
					let charSize = _getCharSize.call(this, item.line);
					if (charSize) {
						cursorPosList.push({
							start: { line: item.line, column: 0 },
							end: { line: item.line, column: charSize }
						});
						afterCursorPos.column -= charSize;
					}
				}
				afterCursorPosList.push(afterCursorPos);
			}
		});
		historyArr = this._deleteMultiContent({ rangeOrCursorList: cursorPosList });
		historyArr.originCursorPosList = originCursorPosList;
		historyArr.afterCursorPosList = afterCursorPosList;
		this.addCursorList(afterCursorPosList);
		this.editor.history.pushHistory(historyArr);

		function _getCharSize(line) {
			let text = this.htmls[line - 1].text;
			let charSize = 0;
			for (let i = 0; i < this.editor.tabSize; i++) {
				if (text[i] === ' ') {
					charSize++;
				} else if (text[i] === '\t') {
					charSize++;
					break;
				} else {
					break;
				}
			}
			return charSize;
		}
	}
	toggleLineComment() {
		let serial = this.serial++;
		let historyArr = null;
		let nowIndex = 0;
		let preLine = -1;
		let afterCursorPosList = [];
		let delPosList = [];
		let addPosList = [];
		let comments = [];
		let allCurosrPosList = this.editor.cursor.multiCursorPos.toArray();
		let originCursorPosList = this.getOriginCursorPosList();
		while (nowIndex < allCurosrPosList.length) {
			let result = _toggleLineComment.call(this);
			_moveCursor.call(this, result);
		}
		if (delPosList.length) {
			historyArr = this._deleteMultiContent({ rangeOrCursorList: delPosList, justDeleteRange: true });
			historyArr.serial = serial;
			historyArr.originCursorPosList = originCursorPosList;
			originCursorPosList = null;
			this.editor.history.pushHistory(historyArr);
		}
		if (addPosList.length) {
			historyArr = this._insertMultiContent({ text: comments, cursorPosList: addPosList });
			historyArr.serial = serial;
			if (originCursorPosList) {
				historyArr.originCursorPosList = originCursorPosList;
			}
			this.editor.history.pushHistory(historyArr);
		}
		if (historyArr) {
			historyArr.afterCursorPosList = afterCursorPosList;
			this.addCursorList(afterCursorPosList);
		}

		function _toggleLineComment() {
			let token = null;
			let lastToken = null;
			let range = null;
			let startRange = null;
			let endRange = null;
			let added = false;
			let deled = false;
			let sourceConfigData = null;
			let blockComment = null;;
			let lineComment = '';
			let comment = '';
			let ending = '';
			let cursorPos = allCurosrPosList[nowIndex++];
			range = this.editor.selecter.getRangeByCursorPos(cursorPos);
			if (range) {
				ending = Util.comparePos(range.start, cursorPos) === 0 ? 'left' : 'right';
				cursorPos = range.start;
			}
			token = this.getTokenByCursorPos(cursorPos);
			if (!token) {
				return;
			}
			lastToken = this.htmls[cursorPos.line - 1].tokens;
			lastToken = lastToken && lastToken.peek();
			sourceConfigData = this.getConfigData(token);
			if (!sourceConfigData || !sourceConfigData.__comments__) {
				return;
			}
			blockComment = sourceConfigData.__comments__.blockComment;
			lineComment = sourceConfigData.__comments__.lineComment;
			if (range) {
				let allComent = true;
				let startLine = preLine === range.start.line ? preLine + 1 : range.start.line;
				for (let line = startLine; line <= range.end.line; line++) {
					if (!this.htmls[line - 1].text.trimLeft().startsWith(lineComment)) {
						allComent = false;
						break;
					}
				}
				if (allComent) { //删除单行注释
					for (let line = startLine; line <= range.end.line; line++) {
						let text = this.htmls[line - 1].text;
						let spaceLength = text.length - text.trimLeft().length;
						delPosList.push({
							start: { line: line, column: spaceLength },
							end: { line: line, column: spaceLength + lineComment.length }
						});
					}
					afterCursorPosList.push({
						start: { line: range.start.line, column: range.start.column - lineComment.length },
						end: { line: range.end.line, column: range.end.column - lineComment.length },
						ending: ending
					});
					deled = true;
					comment = lineComment;
				} else { //添加单行注释
					let start = { line: range.start.line, column: range.start.column };
					let end = { line: range.end.line, column: range.end.column };
					let column = -1;
					for (let line = startLine; line <= range.end.line; line++) {
						let text = this.htmls[line - 1].text;
						let _text = text.trimLeft();
						let spaceLength = text.length - _text.length;
						// 和第一行注释对齐
						column = column > -1 ? column : spaceLength;
						if (!_text.startsWith(lineComment)) {
							addPosList.push({ line: line, column: column });
							comments.push(lineComment);
							if (line === start.line) {
								start.column += lineComment.length;
							}
							if (line === end.line) {
								end.column += lineComment.length;
								added = true;
								comment = lineComment;
							}
						}
					}
					afterCursorPosList.push({ start, end });
				}
				preLine = range.end.line;
			} else {
				let text = this.htmls[cursorPos.line - 1].text;
				let _text = text.trimLeft();
				let spaceLength = text.length - _text.length;
				let afterPos = { line: cursorPos.line, column: cursorPos.column };
				if (regs.block_comment.test(token.scope) && blockComment) { //光标在多行注释中，删除多行注释
					startRange = blockComment[0] && this.findPreBlockComment(cursorPos, blockComment[0]);
					endRange = blockComment[1] && this.findNextBlockComment(cursorPos, blockComment[1]);
					if (startRange) {
						delPosList.push(startRange);
						endRange && delPosList.push(endRange);
						if (startRange.start.line === cursorPos.line) {
							afterPos.column -= blockComment[0].length;
						} else if (endRange && endRange.start.line === cursorPos.line) {
							afterPos.column -= blockComment[1].length;
							deled = true;
							comment = blockComment[1];
						}
					}
				} else if (_text.startsWith(lineComment)) { //删除单行注释
					delPosList.push({
						start: { line: cursorPos.line, column: spaceLength },
						end: { line: cursorPos.line, column: spaceLength + lineComment.length },
					});
					afterPos.column -= lineComment.length;
					deled = true;
					comment = lineComment;
				} else { //添加单行注释
					addPosList.push({ line: cursorPos.line, column: spaceLength });
					comments.push(lineComment);
					afterPos.column += lineComment.length;
					added = true;
					comment = lineComment;
				}
				afterCursorPosList.push(afterPos);
				preLine = cursorPos.line;
			}
			return { added, deled, comment };
		}

		//同一行的选区或光标需要同步移动
		function _moveCursor(result) {
			if (result.added || result.deled) {
				let cursorPos = allCurosrPosList[nowIndex];
				while (cursorPos) {
					let range = this.editor.selecter.getRangeByCursorPos(cursorPos);
					if (preLine === cursorPos.line) {
						if (result.added) {
							cursorPos.column += result.comment.length;
						} else {
							cursorPos.column -= result.comment.length;
						}
					}
					if (range) {
						let ending = Util.comparePos(range.start, cursorPos) === 0 ? 'left' : 'right';
						if (preLine === range.start.line) {
							let delta = result.added ? result.comment.length : -result.comment.length;
							range.start.column += delta;
							if (range.start.line === range.end.line) {
								range.end.column += delta;
								afterCursorPosList.push({
									start: { line: range.start.line, column: range.start.column },
									end: { line: range.end.line, column: range.end.column },
									ending: ending
								});
							} else {
								break;
							}
							nowIndex++;
							cursorPos = allCurosrPosList[nowIndex];
						} else {
							break;
						}
					} else if (preLine === cursorPos.line) {
						afterCursorPosList.push({ line: cursorPos.line, column: cursorPos.column });
						nowIndex++;
						cursorPos = allCurosrPosList[nowIndex];
					} else {
						break;
					}
				}
			}
		}
	}
	toggleBlockComment() {

	}
	findPreBlockComment(cursorPos, blockComment) {
		let line = cursorPos.line;
		while (line >= 1) {
			let text = this.htmls[line - 1].text;
			let index = text.indexOf(blockComment);
			if (index > -1) {
				if (line === cursorPos.line && index >= cursorPos.column) {
					line--;
					continue;
				}
				return {
					start: { line: line, column: index },
					end: { line: line, column: index + blockComment.length }
				}
			}
			line--;
		}
	}
	findNextBlockComment(cursorPos, blockComment) {
		let line = cursorPos.line;
		while (line <= this.editor.maxLine) {
			let text = this.htmls[line - 1].text;
			let index = text.indexOf(blockComment);
			if (index > -1) {
				if (line === cursorPos.line && index + blockComment.length < cursorPos.column) {
					line++;
					continue;
				}
				return {
					start: { line: line, column: index },
					end: { line: line, column: index + blockComment.length }
				}
			}
			line++;
		}
	}
	contentChanged() {
		this.allText = '';
		EventBus.$emit('editor-content-change', { id: this.editor.editorId, path: this.editor.tabData.path });
	}
	// 获取最大宽度
	setMaxWidth() {
		let index = 0;
		let startTime = Date.now();
		let maxWidthObj = {
			line: this.htmls[0].lineId,
			width: 0
		};
		clearTimeout(this.setMaxWidthTimer);
		_setMaxWidth.call(this);

		function _setMaxWidth() {
			while (index < this.htmls.length) {
				let item = this.htmls[index];
				if (item.width > maxWidthObj.width) {
					maxWidthObj = {
						lineId: item.lineId,
						text: item.text,
						width: item.width
					};
				}
				index++;
				if (Date.now() - startTime > 20) {
					break;
				}
			}
			if (index < this.htmls.length) {
				this.setMaxWidthTimer = setTimeout(() => {
					_setMaxWidth.call(this);
				}, 20);
			} else {
				this.editor.setData('maxWidthObj', maxWidthObj);
			}
		}
	}
	/**
	 * 设置每行文本的宽度
	 * @param {Array} texts
	 */
	setLineWidth(texts) {
		let index = 0;
		let maxWidthObj = this.editor.maxWidthObj;
		globalData.scheduler.removeTask(this.setLineWidthTask);
		_setLineWidth.call(this);

		function _setLineWidth() {
			let startTime = Date.now();
			let count = 0;
			let limit = 5;
			while (index < texts.length) {
				let lineObj = texts[index];
				if (this.lineIdMap.has(lineObj.lineId)) {
					let width = this.editor.getStrWidth(lineObj.text);
					lineObj.width = width;
					if (width > maxWidthObj.width) {
						maxWidthObj = {
							lineId: lineObj.lineId,
							text: lineObj.text,
							width: width
						};
					}
				}
				index++;
				count++;
				if (count >= limit && Date.now() - startTime >= 5) {
					break;
				}
			}
			this.editor.setData('maxWidthObj', maxWidthObj);
			if (index < texts.length) {
				this.setLineWidthTask = globalData.scheduler.addTask(() => {
					_setLineWidth.call(this);
				});
			}
		}
	}
	getOriginCursorPosList() {
		let originCursorPosList = [];
		this.editor.cursor.multiCursorPos.forEach((item) => {
			let range = this.editor.selecter.getRangeByCursorPos(item);
			if (range) {
				originCursorPosList.push({
					start: { line: range.start.line, column: range.start.column },
					end: { line: range.end.line, column: range.end.column },
					ending: Util.comparePos(range.start, range) === 0 ? 'left' : 'right'
				});
			} else {
				originCursorPosList.push({
					line: item.line,
					column: item.column
				});
			}
		});
		return originCursorPosList;
	}
	getTokenByCursorPos(cursorPos) {
		let tokens = this.htmls[cursorPos.line - 1].tokens || [];
		for (let i = 0; i < tokens.length; i++) {
			if (tokens[i].startIndex < cursorPos.column
				&& tokens[i].endIndex >= cursorPos.column) {
				return tokens[i];
			}
		}
	}
	getConfigData(token) {
		let language = Util.getLanguageById(this.editor.language);
		let grammarData = language && globalData.grammars[language.scopeName];
		if (grammarData) {
			let scopeNames = token.scope.match(grammarData.scopeNamesReg);
			if (scopeNames) {
				// 一种语言中可能包含多种内嵌语言，优先处理内嵌语言
				for (let i = scopeNames.length - 1; i >= 0; i--) {
					if (grammarData.sourceConfigMap[scopeNames[i]]) {
						return grammarData.sourceConfigMap[scopeNames[i]];
					}
				}
			}
		}
	}
	// 获取选中范围内的文本
	getRangeText(start, end) {
		var text = this.htmls[start.line - 1].text;
		if (start.line != end.line) {
			let arr = [];
			text = text.slice(start.column);
			arr = this.htmls.slice(start.line, end.line - 1);
			arr = arr.map(item => {
				return item.text;
			});
			text += arr.length ? '\n' + arr.join('\n') : '';
			if (end.line <= this.editor.maxLine) {
				text += '\n' + this.htmls[end.line - 1].text.slice(0, end.column);
			}
		} else {
			text = text.slice(start.column, end.column);
		}
		return text;
	}
	// 获取待复制的文本
	getCopyText(cut) {
		let text = '';
		let prePos = null;
		let ranges = [];
		this.editor.cursor.multiCursorPos.forEach(item => {
			let range = this.editor.selecter.getRangeByCursorPos(item);
			let start = null;
			if (range) {
				ranges.push(range);
				return;
			}
			if (prePos && item.line === prePos.line) {
				return;
			}
			if (item.line > 1) {
				start = {
					line: item.line - 1,
					column: this.htmls[item.line - 2].text.length
				};
			} else {
				start = {
					line: item.line,
					column: 0
				};
			}
			range = {
				start: start,
				end: {
					line: item.line,
					column: this.htmls[item.line - 1].text.length
				}
			};
			ranges.push(range);
			prePos = item;
		});
		ranges.forEach(item => {
			let str = this.getRangeText(item.start, item.end);
			text = str[0] === '\n' ? (text += str) : (text += '\n' + str);
		});
		if (cut) {
			let historyArr = this._deleteMultiContent({ rangeOrCursorList: ranges });
			historyArr.length && this.editor.history.pushHistory(historyArr);
			this.editor.searcher.clearSearch();
		}
		return text.slice(1);
	}
	getAllText() {
		if (!this.allText) {
			this.allText = this.htmls
				.map(item => {
					return item.text;
				})
				.join('\n');
		}
		return this.allText;
	}
}
Context.contexts = {};

export default Context;
