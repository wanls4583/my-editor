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
	endTag: /(?=\<\/)/
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
	}
	insertContent(text, command) {
		let historyArr = null;
		let cursorPosList = [];
		let serial = false;
		if (!command) {
			// 如果有选中区域，需要先删除选中区域
			if (this.editor.selecter.activedRanges.size) {
				let _historyArr = this.deleteContent();
				// 连续操作标识
				_historyArr.serial = this.serial++;
				serial = _historyArr.serial;
			}
			cursorPosList = this.editor.cursor.multiCursorPos.toArray();
		} else {
			command.forEach(item => {
				// 多个插入的光标可能相同，这里不能先添加光标
				cursorPosList.push(item.cursorPos);
			});
		}
		historyArr = this._insertMultiContent(text, cursorPosList, command);
		historyArr.serial = serial;
		if (!command) {
			// 新增历史记录
			this.editor.history.pushHistory(historyArr);
		} else {
			// 撤销或重做操作后，更新历史记录
			historyArr.serial = command.serial;
			historyArr.length && this.editor.history.updateHistory(historyArr);
		}
		this.editor.setNowCursorPos(this.editor.cursor.multiCursorPos.get(0));
		this.editor.fSearcher.refreshSearch();
		return historyArr;
	}
	_insertMultiContent(text, cursorPosList, command) {
		let prePos = null;
		let historyObj = null;
		let historyArr = [];
		let texts = text instanceof Array ? text : text.split(/\r\n|\n/);
		let lineDelta = 0;
		let columnDelta = 0;
		this.editor.cursor.clearCursorPos();
		if (text === '\n') {
			texts = ['\n'];
		}
		cursorPosList.forEach((cursorPos, index) => {
			let _text = texts.length === cursorPosList.length ? texts[index] : text;
			let commandObj = (command && command[index]) || {};
			let margin = commandObj.margin || 'right';
			let active = commandObj.active || false;
			let pos = {
				line: cursorPos.line,
				column: cursorPos.column
			};
			if (!text) {
				return;
			}
			pos.line += lineDelta;
			if (prePos && pos.line === prePos.line) {
				pos.column += columnDelta;
			} else {
				columnDelta = 0;
			}
			historyObj = this._insertContent(_text, pos, !command);
			historyArr.push(historyObj);
			prePos = historyObj.cursorPos;
			historyObj.margin = margin;
			historyObj.active = active;
			lineDelta += historyObj.cursorPos.line - historyObj.preCursorPos.line;
			columnDelta += historyObj.cursorPos.column - historyObj.preCursorPos.column;
			if (margin === 'right') {
				this.editor.cursor.addCursorPos(historyObj.cursorPos);
			} else {
				this.editor.cursor.addCursorPos(historyObj.preCursorPos);
			}
			if (active) {
				this.editor.selecter.addRange({
					start: historyObj.preCursorPos,
					end: historyObj.cursorPos
				});
			}
		});
		return historyArr;
	}
	// 插入内容
	_insertContent(text, cursorPos, alignmentTab) {
		let lineObj = this.htmls[cursorPos.line - 1];
		let nowLineText = lineObj.text;
		let newPos = Object.assign({}, cursorPos);
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
			if (!text[0].text && alignmentTab) {
				let tabStr = _getTabStr.call(this, nowLineText, this.editor.folder.getRangeFold(cursorPos.line, true));
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
		this.setLineWidth(text);
		this.editor.setErrors([]);
		this.editor.setAutoTip(null);
		this.editor.render(true);
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
	deleteContent(keyCode, command) {
		let historyArr = [];
		let rangeList = [];
		if (command) {
			rangeList = command.map(item => {
				let obj = {
					start: item.preCursorPos,
					end: item.cursorPos,
					margin: item.margin,
					active: item.active
				};
				return obj;
			});
		} else {
			this.editor.cursor.multiCursorPos.forEach(item => {
				let range = this.editor.selecter.getRangeByCursorPos(item);
				if (range) {
					if (Util.comparePos(range.start, item) === 0) {
						range.margin = 'left';
					} else {
						range.margin = 'right';
					}
					rangeList.push(range);
				} else {
					rangeList.push(item);
				}
			});
		}
		historyArr = this._deleteMultiContent(rangeList, keyCode);
		if (!command) {
			// 新增历史记录
			historyArr.length && this.editor.history.pushHistory(historyArr);
		} else {
			// 撤销或重做操作后，更新历史记录
			historyArr.serial = command.serial;
			this.editor.history.updateHistory(historyArr);
			historyArr.forEach(item => {
				this.editor.cursor.addCursorPos(item.cursorPos);
			});
		}
		this.editor.setNowCursorPos(this.editor.cursor.multiCursorPos.get(0));
		this.editor.searcher.clearSearch();
		this.editor.fSearcher.refreshSearch();
		return historyArr;
	}
	_deleteMultiContent(rangeList, keyCode) {
		let historyArr = [];
		let historyObj = null;
		let prePos = null;
		let lineDelta = 0;
		let columnDelta = 0;
		this.editor.cursor.clearCursorPos();
		rangeList.forEach(item => {
			if (item.start && item.end) {
				_deleteRangePos.call(this, item);
			} else {
				_deleteCursorPos.call(this, item);
			}
		});
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
			historyObj = this._deleteContent(pos, keyCode);
			historyObj.text && historyArr.push(historyObj);
			prePos = historyObj.cursorPos;
			lineDelta += historyObj.preCursorPos.line - prePos.line;
			columnDelta += historyObj.preCursorPos.column - prePos.column;
			this.editor.cursor.addCursorPos({
				line: prePos.line,
				column: prePos.column
			});
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
			historyObj = this._deleteContent(rangePos, keyCode);
			historyObj.text && historyArr.push(historyObj);
			prePos = historyObj.cursorPos;
			lineDelta += historyObj.preCursorPos.line - prePos.line;
			columnDelta += historyObj.preCursorPos.column - prePos.column;
			this.editor.cursor.addCursorPos({
				line: prePos.line,
				column: prePos.column
			});
		}
	}
	// 删除内容
	_deleteContent(cursorPos, keyCode) {
		let range = null;
		let margin = keyCode === Util.KEYCODE.DELETE ? 'left' : 'right';
		cursorPos.moveWidth = 0; //去除上下移动光标的初始宽度记录
		if (cursorPos.start && cursorPos.end) {
			//删除范围内的内容
			range = cursorPos;
			cursorPos = range.end;
			margin = range.margin;
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
		} else if (Util.KEYCODE.DELETE == keyCode) {
			// 向后删除一个字符
			if (cursorPos.column == text.length) {
				// 光标处于行尾
				if (cursorPos.line < this.htmls.length) {
					this.lineIdMap.delete(this.htmls[cursorPos.line].lineId);
					text = startObj.text + this.htmls[cursorPos.line].text;
					this.htmls.splice(cursorPos.line, 1);
					deleteText = '\n';
					originPos = {
						line: cursorPos.line - 1,
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
		this.editor.render(true);
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
			keyCode: keyCode,
			margin: margin,
			active: range && range.active
		};
		return historyObj;
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
	moveLineUp(command) {
		this.moveLine(command, 'up');
	}
	moveLineDown(command) {
		this.moveLine(command, 'down');
	}
	moveLine(command, direct) {
		let cursorPosList = [];
		let historyPosList = [];
		let index = 0;
		let prePos = null;
		let searchConifg = null;
		if (command) {
			searchConifg = command.searchConifg;
			cursorPosList = command.cursorPos;
		} else {
			searchConifg = this.editor.searcher.getConfig();
			cursorPosList = [];
			// 过滤光标，去除上下相邻的光标
			this.editor.cursor.multiCursorPos.toArray().forEach(item => {
				let range = this.editor.selecter.getRangeByCursorPos(item); //当前光标处于活动区域边界
				let pass = true;
				let line = range ? range.start.line : item.line;
				if (prePos) {
					let preLine = prePos.end ? prePos.end.line : prePos.line;
					if (preLine + 1 === line || preLine === line) {
						//和之前的光标冲突，移除当前光标所处的活动区域
						range && this.editor.selecter.removeRange(range);
						pass = false;
					}
				}
				if (pass) {
					var enLine = (range && range.end.line) || line;
					if ((line === 1 && direct === 'up') || (enLine === this.editor.maxLine && direct === 'down')) {
						pass = false;
					} else {
						if (range) {
							range.margin = Util.comparePos(range.start, item) === 0 ? 'left' : 'right';
							prePos = range;
						} else {
							prePos = item;
						}
						cursorPosList.push(prePos);
					}
				}
			});
		}
		while (index < cursorPosList.length) {
			let pos = cursorPosList[index];
			let range = pos.start ? pos : null;
			this._moveLine(pos, direct);
			//移动光标和选区
			let delta = direct === 'down' ? 1 : -1;
			if (range) {
				//更新选中区域坐标
				range.start.line = range.start.line + delta;
				range.end.line = range.end.line + delta;
			} else {
				// 更新光标坐标
				pos.line = pos.line + delta;
			}
			historyPosList.push(range ? this.editor.selecter.clone(range, ['margin']) : Object.assign({}, pos));
			index++;
		}
		if (!historyPosList.length) {
			return;
		}
		this.editor.searcher.clearSearch();
		this.editor.cursor.clearCursorPos();
		// 恢复活动区域和光标
		historyPosList.forEach(item => {
			if (item.start) {
				this.editor.cursor.addCursorPos(item.margin === 'left' ? item.start : item.end);
				this.editor.selecter.addRange(item);
			} else {
				this.editor.cursor.addCursorPos(item);
			}
		});
		let historyObj = {
			type: direct === 'down' ? Util.HISTORY_COMMAND.MOVEUP : Util.HISTORY_COMMAND.MOVEDOWN,
			cursorPos: historyPosList,
			searchConifg: searchConifg // 记录搜索配置
		};
		if (!command) {
			// 新增历史记录
			this.editor.history.pushHistory(historyObj);
			this.editor.searcher.refreshSearch(searchConifg);
		} else {
			// 撤销或重做操作后，更新历史记录
			this.editor.history.updateHistory(historyObj);
			this.editor.searcher.refreshSearch(command.searchConifg);
		}
		this.editor.fSearcher.refreshSearch();
	}
	_moveLine(cursorPos, direct) {
		let range = cursorPos.start ? cursorPos : null;
		let upLine = 0;
		let downLine = 0;
		let text = '';
		// 当前光标处于选中区域边界
		if (range) {
			text = this.htmls
				.slice(range.start.line - 1, range.end.line)
				.map(item => {
					return item.text;
				})
				.join('\n');
			if (direct === 'down') {
				upLine = range.start.line;
				downLine = range.end.line + 1;
				text = this.htmls[downLine - 1].text + '\n' + text;
			} else {
				upLine = range.start.line - 1;
				downLine = range.end.line;
				text = text + '\n' + this.htmls[upLine - 1].text;
			}
		} else {
			upLine = cursorPos.line - (direct === 'down' ? 0 : 1);
			downLine = upLine + 1;
			text = this.htmls[downLine - 1].text + '\n' + this.htmls[upLine - 1].text;
		}
		let start = {
			line: upLine,
			column: 0
		};
		let end = {
			line: downLine,
			column: this.htmls[downLine - 1].text.length
		};
		this._deleteContent({
			start: start,
			end: end
		});
		this._insertContent(text, start);
	}
	// 向上复制一行
	copyLineUp(command) {
		this.copyLine(command, 'up');
	}
	// 向下复制一行
	copyLineDown(command) {
		this.copyLine(command, 'down');
	}
	copyLine(command, direct) {
		let originList = [];
		let cursorPosList = [];
		let historyPosList = [];
		let prePos = null;
		let texts = [];
		let searchConifg = null;
		if (command) {
			searchConifg = command.searchConifg;
			originList = command.cursorPos;
		} else {
			searchConifg = this.editor.searcher.getConfig();
			originList = [];
			// 过滤重叠光标和活动区域
			this.editor.cursor.multiCursorPos.toArray().forEach(item => {
				let range = this.editor.selecter.getRangeByCursorPos(item);
				let line = (range && range.start.line) || item.line;
				let pass = true;
				if (prePos) {
					let preLine = prePos.end ? prePos.end.line : prePos.line;
					if (preLine === line) {
						pass = false;
					}
				}
				if (pass) {
					if (range) {
						range.margin = Util.comparePos(range.start, item) === 0 ? 'left' : 'right';
						prePos = range;
					} else {
						prePos = item;
					}
					originList.push(prePos);
				}
			});
		}
		originList.forEach(item => {
			let line = 0;
			let text = '';
			if (item.end) {
				line = item.start.line - 1;
				text = this.htmls
					.slice(item.start.line - 1, item.end.line)
					.map(item => {
						return item.text;
					})
					.join('\n');
			} else {
				line = item.line - 1;
				text = this.htmls[item.line - 1].text;
			}
			line = line < 1 ? 1 : line;
			text = '\n' + text;
			texts.push(text);
			cursorPosList.push({ line: line, column: this.htmls[line - 1].text.length });
		});
		this._insertMultiContent(texts, cursorPosList).forEach((item, index) => {
			let line = 0;
			let originPos = originList[index];
			line = item.cursorPos.line;
			if (direct === 'down') {
				line = line + (originPos.start ? originPos.end.line - originPos.start.line + 1 : 1);
			}
			if (originPos.start) {
				let delta = originPos.end.line - originPos.start.line;
				originPos.end.line = line;
				originPos.start.line = line - delta;
			} else {
				originPos.line = line;
			}
			historyPosList.push(originPos.start ? this.editor.selecter.clone(originPos, ['margin']) : Object.assign({}, originPos));
		});
		this.editor.searcher.clearSearch();
		this.editor.cursor.clearCursorPos();
		// 恢复活动区域和光标
		historyPosList.forEach(item => {
			if (item.start) {
				this.editor.cursor.addCursorPos(item.margin === 'left' ? item.start : item.end);
				this.editor.selecter.addRange(item);
			} else {
				this.editor.cursor.addCursorPos(item);
			}
		});
		let historyObj = {
			type: direct === 'down' ? Util.HISTORY_COMMAND.DELETE_COPY_DOWN : Util.HISTORY_COMMAND.DELETE_COPY_UP,
			cursorPos: historyPosList,
			searchConifg: searchConifg // 记录搜索配置
		};
		if (!command) {
			// 新增历史记录
			this.editor.history.pushHistory(historyObj);
			this.editor.searcher.refreshSearch(searchConifg);
		} else {
			// 撤销或重做操作后，更新历史记录
			this.editor.history.updateHistory(historyObj);
			this.editor.searcher.refreshSearch(command.searchConifg);
		}
		this.editor.fSearcher.refreshSearch();
	}
	// 删除上面一行
	deleteCopyLineUp(command) {
		this.deleteCopyLine(command, 'up');
	}
	// 删除下面一行
	deleteCopyLineDown(command) {
		this.deleteCopyLine(command, 'down');
	}
	deleteCopyLine(command, direct) {
		let originList = [];
		let cursorPosList = [];
		let historyPosList = [];
		originList = command.cursorPos;
		originList.forEach(item => {
			let upLine = 0;
			let downLine = 0;
			let range = null;
			let startColumn = 0;
			let endColumn = 0;
			if (item.end) {
				upLine = item.start.line - 1;
				downLine = item.end.line;
			} else {
				upLine = item.line - 1;
				downLine = item.line;
			}
			endColumn = this.htmls[downLine - 1].text.length;
			if (upLine < 1) {
				upLine = 1;
				if (downLine < this.editor.maxLine) {
					downLine++;
					endColumn = 0;
				}
			} else {
				startColumn = this.htmls[upLine - 1].text.length;
			}
			range = {
				start: { line: upLine, column: startColumn },
				end: { line: downLine, column: endColumn }
			};
			cursorPosList.push(range);
		});
		this._deleteMultiContent(cursorPosList).forEach((item, index) => {
			let originPos = originList[index];
			if (originPos.start) {
				let delta = originPos.end.line - originPos.start.line;
				if (direct === 'up') {
					originPos.start.line = item.cursorPos.line + (originPos.start.line === 1 ? 0 : 1);
					originPos.end.line = originPos.start.line + delta;
				} else {
					originPos.end.line = item.cursorPos.line;
					originPos.start.line = originPos.end.line - delta;
				}
			} else {
				if (direct === 'up') {
					originPos.line = item.cursorPos.line + (originPos.line === 1 ? 0 : 1);
				} else {
					originPos.line = item.cursorPos.line;
				}
			}
			historyPosList.push(originPos.start ? this.editor.selecter.clone(originPos, ['margin']) : Object.assign({}, originPos));
		});
		this.editor.searcher.clearSearch();
		this.editor.cursor.clearCursorPos();
		// 恢复活动区域和光标
		historyPosList.forEach(item => {
			if (item.start) {
				this.editor.cursor.addCursorPos(item.margin === 'left' ? item.start : item.end);
				this.editor.selecter.addRange(item);
			} else {
				this.editor.cursor.addCursorPos(item);
			}
		});
		let historyObj = {
			type: direct === 'down' ? Util.HISTORY_COMMAND.COPY_UP : Util.HISTORY_COMMAND.COPY_DOWN,
			cursorPos: historyPosList,
			searchConifg: command.searchConifg
		};
		this.editor.history.updateHistory(historyObj);
		this.editor.searcher.refreshSearch(command.searchConifg);
		this.editor.fSearcher.refreshSearch();
	}
	// 插入当前行
	insertLine(command) {
		let searchConifg = command.searchConifg;
		let originList = command.cursorPos;
		let texts = command.text;
		let cursorPosList = [];
		originList.forEach(item => {
			let line = item.start ? item.start.line - 1 : item.line - 1;
			line = line < 1 ? 1 : line;
			cursorPosList.push({ line: line, column: this.htmls[line - 1].text.length });
		});
		this._insertMultiContent(texts, cursorPosList);
		this.editor.searcher.clearSearch();
		this.editor.cursor.clearCursorPos();
		originList.forEach(item => {
			if (item.start) {
				this.editor.cursor.addCursorPos(item.margin === 'left' ? item.start : item.end);
				this.editor.selecter.addRange(item);
			} else {
				this.editor.cursor.addCursorPos(item);
			}
		});
		let historyObj = {
			type: Util.HISTORY_COMMAND.DELETE_LINE,
			cursorPos: originList,
			searchConifg: searchConifg
		};
		// 撤销或重做操作后，更新历史记录
		this.editor.history.updateHistory(historyObj);
		this.editor.searcher.refreshSearch(command.searchConifg);
		this.editor.fSearcher.refreshSearch();
	}
	// 删除当前行
	deleteLine(command) {
		let originList = [];
		let cursorPosList = [];
		let historyPosList = [];
		let prePos = null;
		let texts = [];
		let searchConifg = null;
		if (command) {
			searchConifg = command.searchConifg;
			originList = command.cursorPos;
		} else {
			searchConifg = this.editor.searcher.getConfig();
			this.editor.cursor.multiCursorPos.forEach(item => {
				let range = this.editor.selecter.getRangeByCursorPos(item);
				let line = (range && range.start.line) || item.line;
				let pass = true;
				if (prePos) {
					let preLine = prePos.end ? prePos.end.line : prePos.line;
					if (preLine === line) {
						pass = false;
					}
				}
				if (pass) {
					if (range) {
						range.margin = Util.comparePos(range.start, item) === 0 ? 'left' : 'right';
						prePos = range;
					} else {
						prePos = item;
					}
					originList.push(prePos);
				}
			});
		}
		originList.forEach(item => {
			let upLine = 0;
			let downLine = 0;
			let range = null;
			let startColumn = 0;
			let endColumn = 0;
			if (item.end) {
				upLine = item.start.line - 1;
				downLine = item.end.line;
			} else {
				upLine = item.line - 1;
				downLine = item.line;
			}
			endColumn = this.htmls[downLine - 1].text.length;
			if (upLine < 1) {
				upLine = 1;
				if (downLine < this.editor.maxLine) {
					downLine++;
					endColumn = 0;
				}
			} else {
				startColumn = this.htmls[upLine - 1].text.length;
			}
			range = {
				start: { line: upLine, column: startColumn },
				end: { line: downLine, column: endColumn }
			};
			texts.push(this.getRangeText(range.start, range.end));
			cursorPosList.push(range);
		});
		this._deleteMultiContent(cursorPosList).forEach((item, index) => {
			let originPos = originList[index];
			let line = item.cursorPos.line;
			let column = originList[index].column;
			if (originPos.start) {
				column = originPos.margin === 'left' ? originPos.start.column : originPos.end.column;
			}
			column = column > this.htmls[line - 1].text.length ? this.htmls[line - 1].text.length : column;
			historyPosList.push({ line: line, column: column });
		});
		this.editor.searcher.clearSearch();
		this.editor.cursor.clearCursorPos();
		historyPosList.forEach(item => {
			this.editor.cursor.addCursorPos(item);
		});
		let historyObj = {
			type: Util.HISTORY_COMMAND.INSERT_LINE,
			cursorPos: originList,
			text: texts,
			searchConifg: searchConifg
		};
		if (!command) {
			// 新增历史记录
			this.editor.history.pushHistory(historyObj);
		} else {
			// 撤销或重做操作后，更新历史记录
			this.editor.history.updateHistory(historyObj);
			this.editor.searcher.refreshSearch(command.searchConifg);
		}
		this.editor.fSearcher.refreshSearch();
	}
	// 文件变动，重写加载文件内容
	reload(text) {
		let range = {
			start: { line: 1, column: 0 },
			end: { line: this.htmls.length, column: this.htmls.peek().text.length }
		};
		this.editor.searcher.clearSearch();
		this.replace(text, [range]);
	}
	replace(texts, ranges) {
		let historyArr = null;
		let serial = this.serial++;
		historyArr = this._deleteMultiContent(ranges);
		historyArr.serial = serial;
		historyArr.length && this.editor.history.pushHistory(historyArr);
		historyArr = this._insertMultiContent(texts, this.editor.cursor.multiCursorPos.toArray());
		historyArr.serial = serial;
		historyArr.length && this.editor.history.pushHistory(historyArr);
		return this.editor.fSearcher.refreshSearch();
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
			this.editor.render();
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
			this.editor.render();
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
	contentChanged() {
		this.allText = '';
		EventBus.$emit('editor-content-change', { id: this.editor.editorId, path: this.editor.tabData.path });
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
			let historyArr = this._deleteMultiContent(ranges);
			historyArr.length && this.editor.history.pushHistory(historyArr);
			this.editor.searcher.clearSearch();
			this.editor.fSearcher.refreshSearch();
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
