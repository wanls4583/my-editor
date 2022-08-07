/*
 * @Author: lisong
 * @Date: 2022-02-18 13:42:22
 * @Description:
 */
import Comment from './comment';
import MoveLine from './move-line';
import CopyLine from './copy-line';
import DeleteLine from './delete-line';
import Replace from './replace';
import Indent from './indent';
import InsertLine from './insert-line';
import AutoClose from './auto-close';
import Surrounding from './surrounding';
import EventBus from '@/event';
import Util from '@/common/util';
import globalData from '@/data/globalData';

class Context {
	constructor(editor) {
		this.editor = editor;
		this.lineId = 1;
		this.serial = 1;
		this.commentObj = new Comment(editor, this);
		this.moveLineObj = new MoveLine(editor, this);
		this.copyLineObj = new CopyLine(editor, this);
		this.deleteLineObj = new DeleteLine(editor, this);
		this.replaceObj = new Replace(editor, this);
		this.indentObj = new Indent(editor, this);
		this.insertLineObj = new InsertLine(editor, this);
		this.autoCloseObj = new AutoClose(editor, this);
		this.surroundingObj = new Surrounding(editor, this);
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
	}
	toggleLineComment() {
		this.commentObj.toggleLineComment();
	}
	toggleBlockComment() {
		this.commentObj.toggleBlockComment();
	}
	moveLineUp() {
		this.moveLineObj.moveLineUp();
	}
	moveLineDown() {
		this.moveLineObj.moveLineDown();
	}
	copyLineUp() {
		this.copyLineObj.copyLineUp();
	}
	copyLineDown() {
		this.copyLineObj.copyLineDown();
	}
	deleteLine() {
		this.deleteLineObj.deleteLine();
	}
	replace(texts, ranges) {
		this.replaceObj.replace(texts, ranges);
	}
	reload(text, afterCursorPosList) {
		this.replaceObj.reload(text, afterCursorPosList);
	}
	replaceTip(tip) {
		this.replaceObj.replaceTip(tip);
	}
	convertTabToSpace(command) {
		this.indentObj.convertTabToSpace(command);
	}
	convertSpaceToTab(command) {
		this.indentObj.convertSpaceToTab(command);
	}
	addAnIndent() {
		this.indentObj.addAnIndent();
	}
	removeAnIndent() {
		this.indentObj.removeAnIndent();
	}
	insertEmptyLineUp() {
		this.insertLineObj.insertEmptyLineUp();
	}
	insertEmptyLineDown() {
		this.insertLineObj.insertEmptyLineDown();
	}
	insertContent(text, command) {
		let historyArr = null;
		let cursorPosList = [];
		let serial = ''; // 历史记录连续操作标识
		let historyJoinAble = true;
		let originCursorPosList = null;
		let afterCursorPosList = null;
		if (command) {
			command.forEach(item => {
				// 多个插入的光标可能相同，这里不能先添加光标
				cursorPosList.push(item.cursorPos);
			});
		} else {
			if (this.autoCloseObj.check(text)) { //检测自动闭合符号
				return;
			}
			if (this.surroundingObj.check(text)) { //检测区域自动闭合符号
				return;
			}
			originCursorPosList = this.getOriginCursorPosList();
			serial = this.serial++;
			// 如果有选中区域，需要先删除选中区域
			if (this.editor.selecter.activedRanges.size) {
				let _historyArr = this.deleteContent('left', null, true);
				_historyArr.serial = serial;
				historyJoinAble = false;
			}
			cursorPosList = this.editor.cursor.multiCursorPos.toArray();
		}
		historyArr = this._insertMultiContent({
			text,
			cursorPosList,
			command
		});
		if (command) {
			if (command.originCursorPosList) {
				this.addCursorList(command.originCursorPosList);
			} else if (command.afterCursorPosList) {
				this.addCursorList(command.afterCursorPosList);
			}
			historyArr.serial = command.serial;
			historyArr.afterCursorPosList = command.afterCursorPosList;
			historyArr.originCursorPosList = command._originCursorPosList;
			historyArr._originCursorPosList = command.originCursorPosList;
			this.editor.history.updateHistory(historyArr);
		} else {
			afterCursorPosList = _getCursorList.call(this);
			historyArr.serial = serial;
			historyArr.originCursorPosList = originCursorPosList;
			historyArr.afterCursorPosList = afterCursorPosList;
			historyArr.historyJoinAble = historyJoinAble;
			this.editor.history.pushHistory(historyArr);
			this.addCursorList(afterCursorPosList);
		}
		if(this.editor.cursor.multiCursorPos.size) {
			this.editor.scrollToLine(this.editor.nowCursorPos.line, this.editor.nowCursorPos.column, true);
		}
		return historyArr;

		function _getCursorList() {
			return historyArr.map((item) => {
				if (text === '\n' && item.cursorPos.line - item.preCursorPos.line > 1) {
					//括号中间换行，多插入了一行
					return {
						line: item.cursorPos.line - 1,
						column: this.htmls[item.cursorPos.line - 2].tabNum
					}
				}
				return {
					...item.cursorPos
				};
			});
		}
	}
	_insertMultiContent({
		text,
		cursorPosList,
		command,
	}) {
		let prePos = null;
		let historyObj = null;
		let historyArr = [];
		let texts = text instanceof Array ? text : text.split(/\r*\n/);
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
					cursorPos: {
						line: pos.line,
						column: pos.column
					},
					preCursorPos: {
						line: pos.line,
						column: pos.column
					}
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
		text = text.split(/\r*\n/);
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
				let bracket = _getBracket.call(this);
				let tabNum = _getTab.call(this, nowLineText, bracket);
				if (tabNum) {
					let tabStr = _getTabStr.call(this, tabNum);
					text[1].text = tabStr + text[1].text.trimLeft();
					text[1].tabNum = tabNum;
					if (bracket && lineObj.text[cursorPos.column] === bracket[1]) { //括号中间换行
						let item = {
							lineId: this.lineId++,
							text: _getTabStr.call(this, tabNum - 1),
							html: '',
							width: 0,
							tabNum: tabNum - 1,
							tokens: null,
							folds: null,
							states: null,
							stateFold: null
						}
						this.lineIdMap.set(item.lineId, item);
						text.push(item);
					}
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
		this.setLineWidth(text);
		this.contentChanged();
		this.editor.tabData.status !== '!!' && this.editor.differ.run();
		let historyObj = {
			type: Util.HISTORY_COMMAND.DELETE,
			cursorPos: Object.assign({}, newPos),
			preCursorPos: Object.assign({}, cursorPos)
		};
		return historyObj;

		function _getTab(text, plus) {
			let tabNum = 0;
			//该行有内容
			let spaceNum = /^\s+/.exec(text);
			if (spaceNum) {
				tabNum = /\t+/.exec(spaceNum[0]);
				tabNum = (tabNum && tabNum[0].length) || 0;
				tabNum = tabNum + Math.ceil((spaceNum[0].length - tabNum) / this.editor.tabSize);
			}
			tabNum += plus ? 1 : 0;
			return tabNum;
		}

		function _getTabStr(tabNum) {
			let tabStr = '';
			for (let i = 0; i < tabNum; i++) {
				if (this.editor.indent === 'tab') {
					tabStr += '\t';
				} else {
					tabStr += this.editor.space;
				}
			}
			return tabStr;
		}

		function _getBracket() {
			let sourceConfigData = this.getConfigData(cursorPos);
			let brackets = sourceConfigData && sourceConfigData.brackets || [];
			for (let i = 0; i < brackets.length; i++) {
				if (brackets[i][0] === lineObj.text[cursorPos.column - 1]) {
					return brackets[i];
				}
			}
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
		let originCursorPosList = [];
		let afterCursorPosList = null;
		let historyJoinAble = true;
		if (command) {
			rangeList = command.map(item => {
				let obj = {
					start: item.preCursorPos,
					end: item.cursorPos,
				};
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
					originCursorPosList.push(range);
					historyJoinAble = false;
				} else {
					rangeList.push(item);
					originCursorPosList.push(item);
				}
			});
		}
		historyArr = this._deleteMultiContent({
			rangeOrCursorList: rangeList,
			delDirect,
			justDeleteRange,
			command
		});
		if (command) {
			if (command.originCursorPosList) {
				this.addCursorList(command.originCursorPosList);
			} else if (command.afterCursorPosList) {
				this.addCursorList(command.afterCursorPosList);
			}
			historyArr.serial = command.serial;
			historyArr.afterCursorPosList = command.afterCursorPosList;
			historyArr.originCursorPosList = command._originCursorPosList;
			historyArr._originCursorPosList = command.originCursorPosList;
			this.editor.history.updateHistory(historyArr);
		} else {
			if (historyArr.length > 0) {
				afterCursorPosList = historyArr.map((item) => {
					return {
						...item.cursorPos
					};
				});
				historyArr.originCursorPosList = originCursorPosList;
				historyArr.afterCursorPosList = afterCursorPosList;
				historyArr.historyJoinAble = historyJoinAble;
				this.editor.history.pushHistory(historyArr);
				this.addCursorList(afterCursorPosList);
			} else {
				this.editor.cursor.setCursorPos(rangeList[0]);
			}
		}
		if(this.editor.cursor.multiCursorPos.size) {
			this.editor.scrollToLine(this.editor.nowCursorPos.line, this.editor.nowCursorPos.column, true);
		}
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
			if (justDeleteRange ||
				delDirect === 'left' && pos.line === 1 && pos.column === 0 ||
				delDirect === 'right' && pos.line === this.htmls.length && pos.column === this.htmls.peek().text.length) {
				// 在只有一个光标的情况下，在编辑器头部向左删除或者在编辑器尾部向右删除时，操作无效
				if (rangeOrCursorList.length > 1) {
					historyArr.push({
						type: Util.HISTORY_COMMAND.INSERT,
						cursorPos: {
							line: pos.line,
							column: pos.column
						}
					});
				}
			} else {
				historyObj = this._deleteContent(pos, delDirect);
				lineDelta += historyObj.preCursorPos.line - historyObj.cursorPos.line;
				columnDelta += historyObj.preCursorPos.column - historyObj.cursorPos.column;
				prePos = historyObj.cursorPos;
				historyArr.push(historyObj);
			}
		}

		function _deleteRangePos(rangePos) {
			let start = {
				...rangePos.start
			};
			let end = {
				...rangePos.end
			};
			let pos = {
				start,
				end
			};
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
					cursorPos: {
						line: start.line,
						column: start.column
					}
				}
			} else {
				historyObj = this._deleteContent(pos, delDirect);
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
				this.editor.selecter.addRange({
					start: item.start,
					end: item.end,
					active: true
				});
				this.editor.cursor.addCursorPos(item.ending === 'left' ? item.start : item.end);
			} else {
				this.editor.cursor.addCursorPos(item);
			}
		}
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
			let start = null,
				end = null;
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
					end = {
						line: item.line,
						column: item.column
					};
					start = this.editor.cursor.moveCursor(item, delDirect, true, true);
				} else {
					start = {
						line: item.line,
						column: item.column
					};
					end = this.editor.cursor.moveCursor(item, delDirect, true, true);
				}
				if (preRange && Util.comparePos(preRange.end, start) >= 0) {
					if (!preRange.ending) {
						preRange.end = end;
					}
				} else if (Util.comparePos(end, start) > 0) {
					preRange = {
						start: start,
						end: end
					};
					rangeList.push(preRange);
				}
			}
			originCursorPosList.push({
				line: item.line,
				column: item.column
			});
		});
		if (rangeList.length) {
			historyArr = this._deleteMultiContent({
				rangeOrCursorList: rangeList,
				delDirect
			});
			historyArr.originCursorPosList = originCursorPosList;
			this.addCursorList(historyArr.map((item) => {
				return item.cursorPos
			}));
			this.editor.history.pushHistory(historyArr);
		}
	}
	contentChanged() {
		this.allText = '';
		EventBus.$emit('editor-content-change', {
			id: this.editor.editorId,
			path: this.editor.tabData.path
		});
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
					start: {
						line: range.start.line,
						column: range.start.column
					},
					end: {
						line: range.end.line,
						column: range.end.column
					},
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
	getConfigData(cursorPos) {
		let token = _getNearToken.call(this, cursorPos);
		let language = Util.getLanguageById(this.editor.language);
		let grammarData = language && globalData.grammars[language.scopeName];
		let sourceConfigData = language && globalData.sourceConfigMap[language.scopeName];
		if (token && grammarData && token.scope) {
			let scopeNames = token.scope.match(grammarData.scopeNamesReg);
			if (scopeNames) {
				// 一种语言中可能包含多种内嵌语言，优先处理内嵌语言
				for (let i = scopeNames.length - 1; i >= 0; i--) {
					if (globalData.sourceConfigMap[scopeNames[i]]) {
						sourceConfigData = globalData.sourceConfigMap[scopeNames[i]];
						break;
					}
				}
			}
		}
		return sourceConfigData;

		function _getNearToken(cursorPos) {
			let line = cursorPos.line;
			let tokens = this.htmls[line - 1].tokens || [];
			for (let i = 0; i < tokens.length; i++) {
				if (tokens[i].startIndex <= cursorPos.column &&
					tokens[i].endIndex >= cursorPos.column) {
					return tokens[i];
				}
			}
			while (--line >= 1) {
				tokens = this.htmls[line - 1].tokens;
				if (!tokens) {
					break;
				}
				if (tokens.length) {
					return tokens.peek();
				}
			}
			line = cursorPos.line;
			while (++line <= this.htmls.length) {
				tokens = this.htmls[line - 1].tokens;
				if (!tokens) {
					break;
				}
				if (tokens.length) {
					return tokens[0];
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
			let range = this.editor.selecter.getActiveRangeByCursorPos(item) ||
				this.editor.fSelecter.getActiveRangeByCursorPos(item);
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
		if (cut && text.length) {
			let originCursorPosList = this.getOriginCursorPosList();
			let historyArr = this._deleteMultiContent({
				rangeOrCursorList: ranges
			});
			historyArr.originCursorPosList = originCursorPosList;
			historyArr.afterCursorPosList = historyArr.map((item) => {
				return item.cursorPos
			});
			this.editor.history.pushHistory(historyArr);
			this.addCursorList(historyArr.afterCursorPosList);
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