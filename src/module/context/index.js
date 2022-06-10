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
};

class Context {
	constructor(editor) {
		this.lineId = 1;
		this.serial = 1;
		this.initProperties(editor);
		this.reset();
	}
	initProperties(editor) {
		Util.defineProperties(this, editor, [
			'editorId',
			'path',
			'language',
			'tabSize',
			'nowCursorPos',
			'maxLine',
			'maxWidthObj',
			'cursor',
			'history',
			'tokenizer',
			'lint',
			'folder',
			'selecter',
			'searcher',
			'fSelecter',
			'fSearcher',
			'autocomplete',
			'render',
			'unFold',
			'setNowCursorPos',
			'setErrors',
			'setAutoTip',
			'getStrWidth',
		]);
		this.setEditorData = (prop, value) => {
			editor.setData(prop, value);
		};
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
			stateFold: null,
		});
		this.lineIdMap.set(this.htmls[0].lineId, this.htmls[0]);
	}
	setData(prop, value) {
		if (typeof this[prop] === 'function') {
			return;
		}
		this[prop] = value;
	}
	destory() {
		cancelIdleCallback(this.setLineWidthTimer);
	}
	insertContent(text, command) {
		let historyArr = null;
		let cursorPosList = [];
		let serial = false;
		if (!command) {
			// 如果有选中区域，需要先删除选中区域
			if (this.selecter.activedRanges.size) {
				let _historyArr = this.deleteContent();
				// 连续操作标识
				_historyArr.serial = this.serial++;
				serial = _historyArr.serial;
			}
			cursorPosList = this.cursor.multiCursorPos.toArray();
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
			this.history.pushHistory(historyArr);
		} else {
			// 撤销或重做操作后，更新历史记录
			this.history.updateHistory(historyArr);
			historyArr.serial = command.serial;
		}
		this.setNowCursorPos(this.cursor.multiCursorPos.get(0));
		this.fSearcher.refreshSearch();
		return historyArr;
	}
	_insertMultiContent(text, cursorPosList, command) {
		let prePos = null;
		let historyObj = null;
		let historyArr = [];
		let texts = text instanceof Array ? text : text.split(/\r\n|\n/);
		let lineDelta = 0;
		let columnDelta = 0;
		this.cursor.clearCursorPos();
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
				column: cursorPos.column,
			};
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
				this.cursor.addCursorPos(historyObj.cursorPos);
			} else {
				this.cursor.addCursorPos(historyObj.preCursorPos);
			}
			if (active) {
				this.selecter.addRange({
					start: historyObj.preCursorPos,
					end: historyObj.cursorPos,
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
				stateFold: null,
			};
			this.lineIdMap.set(item.lineId, item);
			return item;
		});
		if (text.length > 1) {
			// 换行对齐
			if (!text[0].text && alignmentTab) {
				let tabStr = _getTabStr.call(this, nowLineText, this.folder.getRangeFold(cursorPos.line, true));
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
		this.setEditorData('maxLine', this.htmls.length);
		this.lint.onInsertContentAfter(cursorPos.line, newPos.line);
		this.tokenizer.onInsertContentAfter(cursorPos.line, newPos.line);
		this.folder.onInsertContentAfter(Object.assign({}, cursorPos), Object.assign({}, newPos));
		this.setLineWidth(text);
		this.setErrors([]);
		this.setAutoTip(null);
		this.render(true);
		EventBus.$emit('editor-content-change', { id: this.editorId, path: this.path });
		let historyObj = {
			type: Util.command.DELETE,
			cursorPos: Object.assign({}, newPos),
			preCursorPos: Object.assign({}, cursorPos),
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
				tabNum = tabNum + Math.ceil((spaceNum[0].length - tabNum) / this.tabSize);
			}
			tabNum += plus ? 1 : 0;
			for (let i = 0; i < tabNum; i++) {
				tabStr += '\t';
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
					active: item.active,
				};
				return obj;
			});
		} else {
			this.cursor.multiCursorPos.forEach(item => {
				let range = this.selecter.getRangeByCursorPos(item);
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
			historyArr.length && this.history.pushHistory(historyArr);
		} else {
			// 撤销或重做操作后，更新历史记录
			historyArr.serial = command.serial;
			this.history.updateHistory(historyArr);
			historyArr.forEach(item => {
				this.cursor.addCursorPos(item.cursorPos);
			});
		}
		this.setNowCursorPos(this.cursor.multiCursorPos.get(0));
		this.searcher.clearSearch();
		this.fSearcher.refreshSearch();
		return historyArr;
	}
	_deleteMultiContent(rangeList, keyCode) {
		let that = this;
		let historyArr = [];
		let historyObj = null;
		let prePos = null;
		let lineDelta = 0;
		let columnDelta = 0;
		this.cursor.clearCursorPos();
		rangeList.forEach(item => {
			if (item.start && item.end) {
				_deleteRangePos(item);
			} else {
				_deleteCursorPos(item);
			}
		});
		return historyArr;

		function _deleteCursorPos(cursorPos) {
			let pos = {
				line: cursorPos.line,
				column: cursorPos.column,
			};
			pos.line -= lineDelta;
			if (prePos && pos.line === prePos.line) {
				pos.column -= columnDelta;
			} else {
				columnDelta = 0;
			}
			historyObj = that._deleteContent(pos, keyCode);
			historyObj.text && historyArr.push(historyObj);
			prePos = historyObj.cursorPos;
			lineDelta += historyObj.preCursorPos.line - prePos.line;
			columnDelta += historyObj.preCursorPos.column - prePos.column;
			that.cursor.addCursorPos({
				line: prePos.line,
				column: prePos.column,
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
			historyObj = that._deleteContent(rangePos, keyCode);
			historyObj.text && historyArr.push(historyObj);
			prePos = historyObj.cursorPos;
			lineDelta += historyObj.preCursorPos.line - prePos.line;
			columnDelta += historyObj.preCursorPos.column - prePos.column;
			that.cursor.addCursorPos({
				line: prePos.line,
				column: prePos.column,
			});
		}
	}
	// 删除内容
	_deleteContent(cursorPos, keyCode) {
		let range = null;
		let margin = keyCode === Util.keyCode.DELETE ? 'left' : 'right';
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
			if (start.line == 1 && end.line == this.maxLine) {
				//全选删除
				rangeUuid = [this.maxWidthObj.lineId];
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
		} else if (Util.keyCode.DELETE == keyCode) {
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
						column: 0,
					};
				}
			} else {
				deleteText = text[cursorPos.column];
				text = text.slice(0, cursorPos.column) + text.slice(cursorPos.column + 1);
				originPos = {
					line: cursorPos.line,
					column: cursorPos.column + 1,
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
		startObj.width = this.getStrWidth(startObj.text);
		startObj.tabNum = -1;
		startObj.html = '';
		startObj.tokens = null;
		startObj.folds = null;
		startObj.states = null;
		startObj.stateFold = null;
		this.setEditorData('maxLine', this.htmls.length);
		this.lint.onDeleteContentAfter(originPos.line, newPos.line);
		this.tokenizer.onDeleteContentAfter(originPos.line, newPos.line);
		this.folder.onDeleteContentAfter(Object.assign({}, originPos), Object.assign({}, newPos));
		this.setErrors([]);
		this.setAutoTip(null);
		this.render(true);
		EventBus.$emit('editor-content-change', { id: this.editorId, path: this.path });
		// 更新最大文本宽度
		if (startObj.width >= this.maxWidthObj.width) {
			this.setEditorData('maxWidthObj', {
				lineId: startObj.lineId,
				text: startObj.text,
				width: startObj.width,
			});
		} else if (rangeUuid.indexOf(this.maxWidthObj.lineId) > -1) {
			this.setMaxWidth();
		}
		let historyObj = {
			type: Util.command.INSERT,
			cursorPos: Object.assign({}, newPos),
			preCursorPos: Object.assign({}, originPos),
			text: deleteText,
			keyCode: keyCode,
			margin: margin,
			active: range && range.active,
		};
		return historyObj;
	}
	// 获取最大宽度
	setMaxWidth() {
		let that = this;
		let index = 0;
		let startTime = Date.now();
		let maxWidthObj = {
			line: this.htmls[0].lineId,
			width: 0,
		};
		clearTimeout(this.setMaxWidthTimer);
		_setMaxWidth();

		function _setMaxWidth() {
			while (index < that.htmls.length) {
				let item = that.htmls[index];
				if (item.width > maxWidthObj.width) {
					maxWidthObj = {
						lineId: item.lineId,
						text: item.text,
						width: item.width,
					};
				}
				index++;
				if (Date.now() - startTime > 20) {
					break;
				}
			}
			if (index < that.htmls.length) {
				that.setMaxWidthTimer = setTimeout(() => {
					_setMaxWidth();
				}, 20);
			} else {
				that.setEditorData('maxWidthObj', maxWidthObj);
			}
		}
	}
	/**
	 * 设置每行文本的宽度
	 * @param {Array} texts
	 */
	setLineWidth(texts) {
		let that = this;
		let index = 0;
		let maxWidthObj = this.maxWidthObj;
		globalData.scheduler.removeTask(this.setLineWidthTask);
		_setLineWidth();

		function _setLineWidth() {
			let startTime = Date.now();
			let count = 0;
			let limit = 5;
			while (index < texts.length) {
				let lineObj = texts[index];
				if (that.lineIdMap.has(lineObj.lineId)) {
					let width = that.getStrWidth(lineObj.text);
					lineObj.width = width;
					if (width > maxWidthObj.width) {
						maxWidthObj = {
							lineId: lineObj.lineId,
							text: lineObj.text,
							width: width,
						};
					}
				}
				index++;
				count++;
				if (count >= limit && Date.now() - startTime >= 5) {
					break;
				}
			}
			that.setEditorData('maxWidthObj', maxWidthObj);
			if (index < texts.length) {
				that.setLineWidthTask = globalData.scheduler.addTask(() => {
					_setLineWidth();
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
			searchConifg = this.searcher.getConfig();
			cursorPosList = [];
			// 过滤光标，去除上下相邻的光标
			this.cursor.multiCursorPos.toArray().forEach(item => {
				let range = this.selecter.getRangeByCursorPos(item); //当前光标处于活动区域边界
				let pass = true;
				let line = range ? range.start.line : item.line;
				if (prePos) {
					let preLine = prePos.end ? prePos.end.line : prePos.line;
					if (preLine + 1 === line || preLine === line) {
						//和之前的光标冲突，移除当前光标所处的活动区域
						range && this.selecter.removeRange(range);
						pass = false;
					}
				}
				if (pass) {
					var enLine = (range && range.end.line) || line;
					if ((line === 1 && direct === 'up') || (enLine === this.maxLine && direct === 'down')) {
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
			historyPosList.push(range ? this.selecter.clone(range, ['margin']) : Object.assign({}, pos));
			index++;
		}
		if (!historyPosList.length) {
			return;
		}
		this.searcher.clearSearch();
		this.cursor.clearCursorPos();
		// 恢复活动区域和光标
		historyPosList.forEach(item => {
			if (item.start) {
				this.cursor.addCursorPos(item.margin === 'left' ? item.start : item.end);
				this.selecter.addRange(item);
			} else {
				this.cursor.addCursorPos(item);
			}
		});
		let historyObj = {
			type: direct === 'down' ? Util.command.MOVEUP : Util.command.MOVEDOWN,
			cursorPos: historyPosList,
			searchConifg: searchConifg, // 记录搜索配置
		};
		if (!command) {
			// 新增历史记录
			this.history.pushHistory(historyObj);
			this.searcher.refreshSearch(searchConifg);
		} else {
			// 撤销或重做操作后，更新历史记录
			this.history.updateHistory(historyObj);
			this.searcher.refreshSearch(command.searchConifg);
		}
		this.fSearcher.refreshSearch();
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
			column: 0,
		};
		let end = {
			line: downLine,
			column: this.htmls[downLine - 1].text.length,
		};
		this._deleteContent({
			start: start,
			end: end,
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
			searchConifg = this.searcher.getConfig();
			originList = [];
			// 过滤重叠光标和活动区域
			this.cursor.multiCursorPos.toArray().forEach(item => {
				let range = this.selecter.getRangeByCursorPos(item);
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
			historyPosList.push(originPos.start ? this.selecter.clone(originPos, ['margin']) : Object.assign({}, originPos));
		});
		this.searcher.clearSearch();
		this.cursor.clearCursorPos();
		// 恢复活动区域和光标
		historyPosList.forEach(item => {
			if (item.start) {
				this.cursor.addCursorPos(item.margin === 'left' ? item.start : item.end);
				this.selecter.addRange(item);
			} else {
				this.cursor.addCursorPos(item);
			}
		});
		let historyObj = {
			type: direct === 'down' ? Util.command.DELETE_COPY_DOWN : Util.command.DELETE_COPY_UP,
			cursorPos: historyPosList,
			searchConifg: searchConifg, // 记录搜索配置
		};
		if (!command) {
			// 新增历史记录
			this.history.pushHistory(historyObj);
			this.searcher.refreshSearch(searchConifg);
		} else {
			// 撤销或重做操作后，更新历史记录
			this.history.updateHistory(historyObj);
			this.searcher.refreshSearch(command.searchConifg);
		}
		this.fSearcher.refreshSearch();
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
				if (downLine < this.maxLine) {
					downLine++;
					endColumn = 0;
				}
			} else {
				startColumn = this.htmls[upLine - 1].text.length;
			}
			range = {
				start: { line: upLine, column: startColumn },
				end: { line: downLine, column: endColumn },
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
			historyPosList.push(originPos.start ? this.selecter.clone(originPos, ['margin']) : Object.assign({}, originPos));
		});
		this.searcher.clearSearch();
		this.cursor.clearCursorPos();
		// 恢复活动区域和光标
		historyPosList.forEach(item => {
			if (item.start) {
				this.cursor.addCursorPos(item.margin === 'left' ? item.start : item.end);
				this.selecter.addRange(item);
			} else {
				this.cursor.addCursorPos(item);
			}
		});
		let historyObj = {
			type: direct === 'down' ? Util.command.COPY_UP : Util.command.COPY_DOWN,
			cursorPos: historyPosList,
			searchConifg: command.searchConifg,
		};
		this.history.updateHistory(historyObj);
		this.searcher.refreshSearch(command.searchConifg);
		this.fSearcher.refreshSearch();
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
		this.searcher.clearSearch();
		this.cursor.clearCursorPos();
		originList.forEach(item => {
			if (item.start) {
				this.cursor.addCursorPos(item.margin === 'left' ? item.start : item.end);
				this.selecter.addRange(item);
			} else {
				this.cursor.addCursorPos(item);
			}
		});
		let historyObj = {
			type: Util.command.DELETE_LINE,
			cursorPos: originList,
			searchConifg: searchConifg,
		};
		// 撤销或重做操作后，更新历史记录
		this.history.updateHistory(historyObj);
		this.searcher.refreshSearch(command.searchConifg);
		this.fSearcher.refreshSearch();
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
			searchConifg = this.searcher.getConfig();
			this.cursor.multiCursorPos.forEach(item => {
				let range = this.selecter.getRangeByCursorPos(item);
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
				if (downLine < this.maxLine) {
					downLine++;
					endColumn = 0;
				}
			} else {
				startColumn = this.htmls[upLine - 1].text.length;
			}
			range = {
				start: { line: upLine, column: startColumn },
				end: { line: downLine, column: endColumn },
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
		this.searcher.clearSearch();
		this.cursor.clearCursorPos();
		historyPosList.forEach(item => {
			this.cursor.addCursorPos(item);
		});
		let historyObj = {
			type: Util.command.INSERT_LINE,
			cursorPos: originList,
			text: texts,
			searchConifg: searchConifg,
		};
		if (!command) {
			// 新增历史记录
			this.history.pushHistory(historyObj);
		} else {
			// 撤销或重做操作后，更新历史记录
			this.history.updateHistory(historyObj);
			this.searcher.refreshSearch(command.searchConifg);
		}
		this.fSearcher.refreshSearch();
	}
	replace(texts, ranges) {
		let historyArr = null;
		let serial = this.serial++;
		historyArr = this._deleteMultiContent(ranges);
		historyArr.serial = serial;
		this.history.pushHistory(historyArr);
		historyArr = this._insertMultiContent(texts, this.cursor.multiCursorPos.toArray());
		historyArr.serial = serial;
		this.history.pushHistory(historyArr);
		return this.fSearcher.refreshSearch();
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
			this.autocomplete.search();
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
			this.cursor.multiCursorPos.forEach(cursorPos => {
				let range = null;
				range = {
					start: { line: cursorPos.line, column: cursorPos.column - word.length },
					end: { line: cursorPos.line, column: cursorPos.column },
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
					let multiCursorPos = this.cursor.multiCursorPos.toArray();
					for (let i = multiCursorPos.length - 1; i >= 0; i--) {
						let cursorPos = _getDeltaPos.call(this, deltaArr, multiCursorPos[i]);
						this.cursor.updateCursorPos(multiCursorPos[i], cursorPos.line, cursorPos.column);
					}
				}
			} else if (tip.type === Enum.TOKEN_TYPE.ATTR_NAME) {
				//选中标签属性后，光标移动端""内
				this.cursor.multiCursorPos.forEach(item => {
					this.cursor.moveCursor(item, 'left');
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
				column: column,
			};
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
			if (end.line <= this.maxLine) {
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
		this.cursor.multiCursorPos.forEach(item => {
			let range = this.selecter.getRangeByCursorPos(item);
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
					column: this.htmls[item.line - 2].text.length,
				};
			} else {
				start = {
					line: item.line,
					column: 0,
				};
			}
			range = {
				start: start,
				end: {
					line: item.line,
					column: this.htmls[item.line - 1].text.length,
				},
			};
			ranges.push(range);
			prePos = item;
		});
		ranges.forEach(item => {
			let str = this.getRangeText(item.start, item.end);
			text = str[0] === '\n' ? (text += str) : (text += '\n' + str);
		});
		if (cut) {
			this.history.pushHistory(this._deleteMultiContent(ranges));
			this.searcher.clearSearch();
			this.fSearcher.refreshSearch();
		}
		return text.slice(1);
	}
	getAllText() {
		return this.htmls
			.map(item => {
				return item.text;
			})
			.join('\n');
	}
}
Context.contexts = {};

export default Context;
