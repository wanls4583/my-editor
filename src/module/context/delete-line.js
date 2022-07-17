import Util from '@/common/util';

export default class {
    constructor(editor, context) {
        this.editor = editor;
        this.context = context;
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
						column: this.context.htmls[range.end.line - 1].text.length
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
					end = { line: item.line, column: this.context.htmls[item.line - 1].text.length };
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
		historyArr = this.context._deleteMultiContent({ rangeOrCursorList: cursorPosList });
		historyArr.forEach((item, index) => {
			let column = columns[index];
			if (column > this.context.htmls[item.cursorPos.line - 1].text.length) {
				column = this.context.htmls[item.cursorPos.line - 1].text.length;
			}
			afterCursorPosList.push({ line: item.cursorPos.line, column: column });
		});
		historyArr.originCursorPosList = originCursorPosList;
        historyArr.originScrollTop = this.editor.scrollTop;
		historyArr.afterCursorPosList = afterCursorPosList;
		this.context.addCursorList(afterCursorPosList);
		this.editor.history.pushHistory(historyArr);
	}
}