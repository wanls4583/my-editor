/*
 * @Author: lisong
 * @Date: 2021-12-31 14:42:01
 * @Description:
 */
import Util from '@/common/util';
import Btree from '@/common/btree';
import globalData from '@/data/globalData';

const comparator = function (a, b) {
	return a.start.line - b.start.line;
};

const singleTag = ['br', 'hr', 'area', 'base', 'img', 'input', 'link', 'meta', 'basefont', 'param', 'col', 'frame', 'embed', 'keygen', 'source'];
const singleTagMap = {};
singleTag.forEach(tag => {
	singleTagMap[tag] = true;
});

export default class {
	constructor(editor, context) {
		this.editor = editor;
		this.context = context;
		this.folds = new Btree(comparator);
	}
	destroy() {
		this.editor = null;
		this.context = null;
		this.folds.empty();
	}
	onInsertContentAfter(preCursorPos, cursorPos) {
		let it = this.folds.search(preCursorPos.line, (a, b) => {
			return a - b.start.line;
		}, true);
		if (it) {
			let addFolds = [];
			let delFolds = [];
			let children = [];
			let deltaLine = cursorPos.line - preCursorPos.line;
			let fold = it.prev();
			if (fold && fold.end.line > preCursorPos.line) {
				delFolds.push(fold);
				children.push(...fold.children);
				fold = it.prev();
			}
			if (deltaLine) {
				it.reset();
				fold = it.next();
				if (fold && fold.start.line === preCursorPos.line) {
					delFolds.push(fold);
					children.push(...fold.children);
				} else {
					it.reset();
				}
				this.updateAfterFoldLine(it, cursorPos.line - preCursorPos.line);
			}
			let filter = (fold) => {
				let pass = true;
				if (fold.start.line < preCursorPos.line) {
					if (fold.end.line > preCursorPos.line) {
						addFolds.push(...this.filterChildren(fold.children, filter));
						pass = false;
					}
				} else if (deltaLine) {
					if (fold.start.line === preCursorPos.line) {
						addFolds.push(...this.filterChildren(fold.children, filter));
						pass = false;
					} else {
						fold.start.line += deltaLine;
						fold.end.line += deltaLine;
						fold.children = this.updateChildLine(fold.children, deltaLine);
					}
				}
				return pass;
			}
			addFolds.push(...this.filterChildren(children, filter));
			if (delFolds.length) {
				for (let i = 0; i < delFolds.length; i++) {
					this.folds.delete(delFolds[i])
				}
				for (let i = 0; i < addFolds.length; i++) {
					this.folds.insert(addFolds[i]);
				}
				this.editor.setContentHeight();
			}
		}
	}
	onDeleteContentAfter(preCursorPos, cursorPos) {
		let it = this.folds.search(preCursorPos.line, (a, b) => {
			return a - b.start.line;
		}, true);
		if (it) {
			let addFolds = [];
			let delFolds = [];
			let children = [];
			let fold = it.prev();
			let deltaLine = cursorPos.line - preCursorPos.line;
			while (fold && fold.end.line > cursorPos.line) {
				delFolds.push(fold);
				children.push(...fold.children);
				fold = it.prev();
			}
			if (deltaLine) {
				it.reset();
				fold = it.next();
				if (fold && fold.start.line > preCursorPos.line) {
					it.reset();
				}
				this.updateAfterFoldLine(it, deltaLine);
			}
			let filter = (fold) => {
				let pass = true;
				if (fold.start.line < preCursorPos.line) {
					if (fold.end.line > cursorPos.line) {
						addFolds.push(...this.filterChildren(fold.children, filter));
						pass = false;
					}
				} else if (deltaLine) {
					fold.start.line += deltaLine;
					fold.end.line += deltaLine;
					fold.children = this.updateChildLine(fold.children, deltaLine);
				}
				return pass;
			}
			addFolds.push(...this.filterChildren(children, filter));
			if (delFolds.length) {
				for (let i = 0; i < delFolds.length; i++) {
					this.folds.delete(delFolds[i])
				}
				for (let i = 0; i < addFolds.length; i++) {
					this.folds.insert(addFolds[i]);
				}
				this.editor.setContentHeight();
			}
		}
	}
	// 折叠行
	foldLine(line) {
		let resultFold = this.getRangeFold(line);
		if (resultFold) {
			let it = this.folds.search(line + 1, (a, b) => {
				return a - b.start.line;
			}, true);
			let delFolds = [];
			let children = [];
			let fold = null;
			if (it) {
				while (fold = it.next()) {
					if (fold.start.line < resultFold.end.line) {
						if (fold.end.line <= resultFold.end.line) {
							// 存储子折叠，展开时重新insert
							children.push(fold);
						} else {
							// 避免交叉折叠
							delFolds.push(fold);
						}
					} else {
						break;
					}
				}
			}
			resultFold.children = children;
			for (let i = 0; i < delFolds.length; i++) {
				this.folds.delete(delFolds[i]);
			}
			for (let i = 0; i < children.length; i++) {
				this.folds.delete(children[i]);
			}
			this.folds.insert(resultFold);
			this.editor.setContentHeight();
		}
		return resultFold;
	}
	// 展开折叠行
	unFold(line) {
		let fold = this.getFoldByLine(line);
		if (fold) {
			let children = fold.children || [];
			this.folds.delete(fold);
			for (let i = 0; i < children.length; i++) {
				this.folds.insert(children[i]);
			}
			this.editor.setContentHeight();
		}
		return fold;
	}
	// 展开包裹了line的折叠
	unFoldWithLine(line) {
		let delFolds = [];
		let it = this.folds.search(line, (a, b) => {
			return a - b.start.line;
		}, true);
		if (it) {
			let fold = it.prev();
			let children = [];
			if (fold && fold.start.line < line && fold.end.line > line) {
				delFolds.push(fold);
				children.push(...fold.children);
				fold = it.prev();
			}
			children = this.filterChildren(children, (fold) => {
				if (fold.start.line < line && fold.end.line > line) {
					return false;
				}
				return true;
			});
			if (delFolds.length) {
				for (let i = 0; i < delFolds.length; i++) {
					this.folds.delete(delFolds[i])
				}
				for (let i = 0; i < children.length; i++) {
					this.folds.insert(children[i]);
				}
				this.editor.setContentHeight();
			}

		}
		return !!delFolds.length;
	}
	updateAfterFoldLine(it, deltaLine) {
		let fold = null;
		while (fold = it.next()) {
			fold.start.line += deltaLine;
			fold.end.line += deltaLine;
			this.updateChildLine(fold.children, deltaLine);
		}
	}
	updateChildLine(children, deltaLine) {
		for (let i = 0; i < children.length; i++) {
			let fold = children[i];
			fold.start.line += deltaLine;
			fold.end.line += deltaLine;
			this.updateChildLine(fold.children, deltaLine);
		}
	}
	filterChildren(children, filter) {
		let list = children.filter((fold) => {
			if (fold.children.length) {
				fold.children = this.filterChildren(fold.children, filter);
			}
			return filter(fold);
		});
		return list;
	}
	getFoldByLine(line) {
		let it = this.folds.search(line, (a, b) => {
			return a - b.start.line;
		});
		return it && it.next();
	}
	/**
	 * 检测行是否在折叠区域内【折叠后隐藏的行】
	 * @param {Number} line 行号
	 */
	getLineInFold(line) {
		let result = false;
		let it = this.folds.search(line, (a, b) => {
			return a - b.start.line;
		}, true);
		if (it) {
			let fold = it.prev();
			while (fold && fold.start.line < line && fold.end.line > line) {
				result = fold;
				fold = it.prev();
			}
		}
		return result;
	}
	/**
	 * 获取折叠范围
	 * @param {Number} line 行号
	 * @param {Boolean} foldIconCheck 检测是否显示折叠图标
	 */
	getRangeFold(line, foldIconCheck) {
		let stack = [];
		let startLine = line;
		let lineObj = this.context.htmls[startLine - 1];
		let startFold = null;
		if (lineObj.folds && lineObj.folds.length) {
			for (let i = 0; i < lineObj.folds.length; i++) {
				let fold = lineObj.folds[i];
				if (fold.side <= 0) {
					stack.push(fold);
				} else if (fold.side > 0) {
					for (let i = stack.length - 1; i >= 0; i--) {
						if (stack[i].side + fold.side === 0) {
							stack.splice(i, 1);
							break;
						}
					}
				}
			}
		}
		if (stack.length) {
			let foldStartText = '';
			startFold = stack.peek();
			startFold = Object.assign({ line: startLine }, startFold);
			foldStartText = lineObj.text.slice(startFold.startIndex, startFold.endIndex);
			// 单标签没有折叠
			if (singleTagMap[foldStartText]) {
				return false;
			}
			// 单行注释
			if (startFold.type === Util.CONST_DATA.LINE_COMMENT) {
				let endLine = startLine;
				let fold = null;
				line = startLine + 1;
				while (line <= this.context.htmls.length) {
					let lineObj = this.context.htmls[line - 1];
					let text = lineObj.text.trimLeft();
					let startIndex = lineObj.text.length - text.length;
					let _fold = lineObj.folds && lineObj.folds[0];
					if (_fold && _fold.type === Util.CONST_DATA.LINE_COMMENT && _fold.startIndex === startIndex) {
						endLine = line;
						fold = _fold;
						if (foldIconCheck && endLine - startLine > 1) {
							return true;
						}
						line++;
					} else {
						break;
					}
				}
				if (foldIconCheck) {
					return endLine - startLine > 1;
				} else {
					return {
						start: startFold,
						end: Object.assign({ line: endLine }, fold),
					};
				}
			}
			return this.getRangeFoldByStartFold(startFold, foldIconCheck);
		}
		return false;
	}
	getRangeFoldByStartFold(startFold, foldIconCheck) {
		let line = startFold.line;
		let stack = [];
		let resultFold = null;
		while (line <= this.context.htmls.length && (!foldIconCheck || line - startFold.line <= 1)) {
			let lineObj = this.context.htmls[line - 1];
			if (lineObj.folds && lineObj.folds.length) {
				for (let i = 0; i < lineObj.folds.length; i++) {
					let fold = lineObj.folds[i];
					if (line === startFold.line && fold.startIndex <= startFold.startIndex) {
						continue;
					}
					if (fold.side === startFold.side) {
						stack.push(fold);
					} else if (startFold.side + fold.side === 0) {
						if (stack.length === 0) {
							resultFold = {
								start: startFold,
								end: Object.assign({ line: line }, fold),
							};
							return foldIconCheck ? line - startFold.line > 1 : resultFold;
						} else {
							stack.pop();
						}
					}
				}
			}
			line++;
		}
		return foldIconCheck ? line - startFold.line > 1 : resultFold;
	}
	/**
	 * 获取当前光标所处的范围
	 * @param {Object} cursorPos
	 * @param {Function} callback
	 */
	getBracketMatch(cursorPos, callback) {
		let task = {};
		cursorPos = { line: cursorPos.line, column: cursorPos.column };
		globalData.scheduler.removeTask(task.task);
		_getBracket.call(this, cursorPos, [], cursorPos.line, callback);
		return task;

		function _getBracket(cursorPos, stack, line, callback) {
			let startFold = null;
			let count = 0;
			let startTime = Date.now();
			while (line >= 1) {
				let folds = this.context.htmls[line - 1].folds;
				if (!folds) {
					return callback(null);
				}
				for (let i = folds.length - 1; i >= 0; i--) {
					let fold = folds[i];
					// 跳过标签名
					// if (fold.type === Util.CONST_DATA.TAG) {
					// 	continue;
					// }
					if (fold.side > 0 && (line < cursorPos.line || fold.endIndex < cursorPos.column)) {
						stack.push(fold);
					} else if (fold.side < 0 && (line < cursorPos.line || fold.startIndex <= cursorPos.column)) {
						let exsitEnd = false;
						while (stack.length) {
							if (stack.pop().side + fold.side === 0) {
								exsitEnd = true;
								break;
							}
						}
						if (!exsitEnd) {
							startFold = Object.assign({ line: line }, fold);
							startFold = this.getRangeFoldByStartFold(startFold);
							callback(startFold);
							return;
						}
					}
				}
				line--;
				count++;
				if (count >= 10 || Date.now() - startTime > 1) {
					break;
				}
			}
			// 最多向上检查5000行
			if (line >= 1 && cursorPos.line - line < 5000) {
				task.task = globalData.scheduler.addTask(() => {
					_getBracket.call(this, cursorPos, stack, line, callback);
				});
			}
		}
	}
	// 根据相对行号获取真实行号(折叠后行号会改变)
	getRealLine(line) {
		let i = 0;
		let lineCount = 1;
		let realLine = 1;
		let folds = this.folds.toArray();
		while (i < folds.length && lineCount < line) {
			let fold = folds[i];
			if (lineCount + fold.start.line - realLine < line) {
				lineCount += fold.start.line + 1 - realLine;
				realLine = fold.end.line;
			} else {
				break;
			}
			i++;
			while (i < folds.length && folds[i].end.line <= fold.end.line) {
				//多级折叠
				i++;
			}
		}
		realLine += line - lineCount;
		return realLine;
	}
	// 根据真实行号获取相对行号
	getRelativeLine(line) {
		let relLine = line;
		let i = 0;
		let folds = this.folds.toArray();
		while (i < folds.length) {
			let fold = folds[i];
			if (line >= fold.end.line) {
				relLine -= fold.end.line - fold.start.line - 1;
			} else {
				break;
			}
			i++;
			while (i < folds.length && folds[i].end.line <= fold.end.line) {
				//多级折叠
				i++;
			}
		}
		return relLine;
	}
}
