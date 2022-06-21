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
		this.folds = new Btree(comparator);
		this.editorFunObj = {};
		this.initProperties(editor, context);
	}
	initProperties(editor, context) {
		Util.defineProperties(this.editorFunObj, editor, ['unFold']);
		Util.defineProperties(this, editor, ['selecter']);
		Util.defineProperties(this, context, ['htmls']);
	}
	onInsertContentAfter(preCursorPos, cursorPos) {
		let folds = this.folds.toArray();
		let afterIndex = Infinity;
		// 历史记录中操作光标在折叠区，需要先展开
		for (let i = 0; i < folds.length; i++) {
			let fold = folds[i];
			if (fold.start.line < preCursorPos.line) {
				if (fold.end.line > preCursorPos.line) {
					this.editorFunObj.unFold(fold.start.line);
				}
			} else {
				afterIndex = i;
				break;
			}
		}
		if (cursorPos.line > preCursorPos.line) {
			if (folds[afterIndex] && folds[afterIndex].start.line === preCursorPos.line) {
				this.editorFunObj.unFold(preCursorPos.line);
				afterIndex++;
			}
			// 更新后面的行号
			for (let i = afterIndex; i < folds.length; i++) {
				folds[i].start.line += cursorPos.line - preCursorPos.line;
				folds[i].end.line += cursorPos.line - preCursorPos.line;
			}
		}
	}
	onDeleteContentAfter(preCursorPos, cursorPos) {
		let folds = this.folds.toArray();
		let afterIndex = Infinity;
		for (let i = 0; i < folds.length; i++) {
			let fold = folds[i];
			let starLine = fold.start.line;
			let endLine = fold.end.line;
			if (starLine <= preCursorPos.line) {
				if (starLine < preCursorPos.line) {
					if ((starLine >= cursorPos.line && starLine < preCursorPos.line) || (starLine < cursorPos.line && endLine > cursorPos.line)) {
						this.editorFunObj.unFold(starLine);
					}
				} else {
					if (preCursorPos.line > cursorPos.line) {
						this.editorFunObj.unFold(starLine);
					}
				}
			} else {
				afterIndex = i;
				break;
			}
		}
		if (preCursorPos.line > cursorPos.line) {
			// 更新后面的行号
			for (let i = afterIndex; i < folds.length; i++) {
				folds[i].start.line += cursorPos.line - preCursorPos.line;
				folds[i].end.line += cursorPos.line - preCursorPos.line;
			}
		}
	}
	// 折叠行
	foldLine(line) {
		let resultFold = this.getRangeFold(line);
		if (resultFold) {
			// 避免交叉折叠
			for (let line = resultFold.start.line + 1; line < resultFold.end.line; line++) {
				let fold = this.getFoldByLine(line);
				if (fold) {
					if (fold.end.line > resultFold.end.line) {
						this.editorFunObj.unFold(line);
					}
				}
			}
			this.folds.insert(resultFold);
		}
		return resultFold;
	}
	// 展开折叠行
	unFold(line) {
		let fold = this.getFoldByLine(line);
		fold && this.folds.delete(fold);
		return fold;
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
		let it = this.folds.search(
			line,
			(a, b) => {
				return a - b.start.line;
			},
			true
		);
		if (it) {
			let fold = it.prev();
			if (fold && fold.start.line < line && fold.end.line > line) {
				return this.getLineInFold(fold.start.line) || fold;
			}
		}
		return false;
	}
	/**
	 * 获取折叠范围
	 * @param {Number} line 行号
	 * @param {Boolean} foldIconCheck 检测是否显示折叠图标
	 */
	getRangeFold(line, foldIconCheck) {
		let stack = [];
		let startLine = line;
		let lineObj = this.htmls[startLine - 1];
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
			if (startFold.type === Util.constData.LINE_COMMENT) {
				let endLine = startLine;
				let fold = null;
				line = startLine + 1;
				while (line <= this.htmls.length) {
					let lineObj = this.htmls[line - 1];
					let text = lineObj.text.trimLeft();
					let startIndex = lineObj.text.length - text.length;
					let _fold = lineObj.folds && lineObj.folds[0];
					if (_fold && _fold.type === Util.constData.LINE_COMMENT && _fold.startIndex === startIndex) {
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
		while (line <= this.htmls.length && (!foldIconCheck || line - startFold.line <= 1)) {
			let lineObj = this.htmls[line - 1];
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
		cursorPos = { line: cursorPos.line, column: cursorPos.column };
		globalData.scheduler.removeTask(this.getBracketMatchTask);
		_getBracket.call(this, cursorPos, [], cursorPos.line, callback);

		function _getBracket(cursorPos, stack, line, callback) {
			let startFold = null;
			let count = 0;
			let startTime = Date.now();
			while (line >= 1) {
				let folds = this.htmls[line - 1].folds;
				if (!folds) {
					return callback(null);
				}
				for (let i = folds.length - 1; i >= 0; i--) {
					let fold = folds[i];
					// 跳过标签名
					if (fold.type === Util.constData.TAG) {
						continue;
					} else if (fold.side > 0 && (line < cursorPos.line || fold.endIndex < cursorPos.column)) {
						stack.push(fold);
					} else if (fold.side < 0 && (line < cursorPos.line || fold.startIndex <= cursorPos.column)) {
						let exsitEnd = false;
						if (stack.length) {
							for (let i = stack.length - 1; i >= 0; i--) {
								if (stack[i].side + fold.side === 0) {
									stack.splice(i, 1);
									exsitEnd = true;
									break;
								}
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
				if (count >= 100 || Date.now() - startTime > 2) {
					break;
				}
			}
			// 最多向上检查5000行
			if (line >= 1 && cursorPos.line - line < 5000) {
				this.getBracketMatchTask = globalData.scheduler.addTask(
					() => {
						_getBracket.call(this, cursorPos, stack, line, callback);
					},
					{ delay: 2 }
				);
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
