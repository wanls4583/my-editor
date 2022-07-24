import EventBus from '@/event';
import globalData from '../../data/globalData';

export const editorKeyMap = {
	'Ctrl+Shift+Enter': {
		command: 'insertEmptyLineUp',
		when: 'editorFocus'
	},
	'Ctrl+Shift+ArrowLeft': {
		command: 'selectWordLeft',
		when: 'editorFocus'
	},
	'Ctrl+Shift+ArrowRight': {
		command: 'selectWordRight',
		when: 'editorFocus'
	},
	'Ctrl+Shift+ArrowUp': {
		command: 'moveLineUp',
		when: 'editorFocus'
	},
	'Ctrl+Shift+ArrowDown': {
		command: 'moveLineDown',
		when: 'editorFocus'
	},
	'Ctrl+Shift+KeyD': {
		command: 'copyLineUp',
		when: 'editorFocus'
	},
	'Ctrl+Shift+KeyH': {
		command: 'formatCode',
		when: 'editorFocus'
	},
	'Ctrl+Shift+KeyK': {
		command: 'deleteLine',
		when: 'editorFocus'
	},
	'Ctrl+Shift+KeyL': {
		command: 'addCursorLineEnds',
		when: 'editorFocus'
	},
	'Ctrl+Shift+Slash': {
		command: 'toggleBlockComment',
		when: 'editorFocus'
	},
	'Ctrl+Alt+ArrowUp': {
		command: 'addCursorAbove',
		when: 'editorFocus'
	},
	'Ctrl+Alt+ArrowDown': {
		command: 'addCursorBelow',
		when: 'editorFocus'
	},
	'Alt+Shift+ArrowDown': {
		command: 'copyLineDown',
		when: 'editorFocus'
	},
	'Ctrl+Enter': {
		command: 'insertEmptyLineDown',
		when: 'editorFocus'
	},
	'Ctrl+ArrowLeft': {
		command: 'moveCursorWordLeft',
		when: 'editorFocus'
	},
	'Ctrl+ArrowRight': {
		command: 'moveCursorWordRight',
		when: 'editorFocus'
	},
	'Ctrl+KeyA': {
		command: 'selectAll',
		when: 'editorFocus'
	},
	'Ctrl+KeyD': {
		command: 'searchWordDown',
		when: 'editorFocus'
	},
	'Ctrl+KeyF': {
		command: 'openSearch',
		when: 'editorFocus'
	},
	'Ctrl+KeyH': {
		command: 'openReplace',
		when: 'editorFocus'
	},
	'Ctrl+KeyZ': {
		command: 'undo',
		when: 'editorFocus'
	},
	'Ctrl+KeyY': {
		command: 'redo',
		when: 'editorFocus'
	},
	'Ctrl+Delete': {
		command: 'deleteRightWord',
		when: 'editorFocus'
	},
	'Ctrl+Backspace': {
		command: 'deleteLeftWord',
		when: 'editorFocus'
	},
	'Ctrl+BracketRight': {
		command: 'addAnIndent',
		when: 'editorFocus'
	},
	'Ctrl+BracketLeft': {
		command: 'removeAnIndent',
		when: 'editorFocus'
	},
	'Ctrl+Slash': {
		command: 'toggleLineComment',
		when: 'editorFocus'
	},
	'Shift+Tab': {
		command: 'tabRemoveAnIndent',
		when: 'editorFocus'
	},
	'Shift+ArrowLeft': {
		command: 'selectLeft',
		when: 'editorFocus'
	},
	'Shift+ArrowRight': {
		command: 'selectRight',
		when: 'editorFocus'
	},
	'Shift+ArrowUp': {
		command: 'selectUp',
		when: 'editorFocus'
	},
	'Shift+ArrowDown': {
		command: 'selectDown',
		when: 'editorFocus'
	},
	'Shift+KeyD': {
		command: 'searchWordUp',
		when: 'editorFocus'
	},
	'Tab': {
		command: 'insertTab',
		when: 'editorFocus'
	},
	'ArrowLeft': {
		command: 'moveCursorLeft',
		when: 'editorFocus'
	},
	'ArrowRight': {
		command: 'moveCursorRight',
		when: 'editorFocus'
	},
	'ArrowUp': {
		command: 'moveCursorUp',
		when: 'editorFocus'
	},
	'ArrowDown': {
		command: 'moveCursorDown',
		when: 'editorFocus'
	},
	'End': {
		command: 'moveCursorEnd',
		when: 'editorFocus'
	},
	'Home': {
		command: 'moveCursorHome',
		when: 'editorFocus'
	},
	'Enter': {
		command: 'insertEnter',
		when: 'editorFocus'
	},
	'Delete': {
		command: 'deleteContentRight',
		when: 'editorFocus'
	},
	'Backspace': {
		command: 'deleteContentLeft',
		when: 'editorFocus'
	},
}

export class EditorComand {
	constructor() { }
	insertEmptyLineUp() {
		this.context.insertEmptyLineUp();
	}
	selectWordLeft() {
		this.editor.selecter.select('left', true);
	}
	selectWordRight() {
		this.editor.selecter.select('right', true);
	}
	selectLeft() {
		this.editor.selecter.select('left');
	}
	selectRight() {
		this.editor.selecter.select('right');
	}
	selectUp() {
		this.editor.selecter.select('up');
	}
	selectDown() {
		this.editor.selecter.select('down');
	}
	moveLineUp() {
		this.context.moveLineUp();
	}
	moveLineDown() {
		this.context.moveLineDown();
	}
	copyLineUp() {
		this.context.copyLineUp();
	}
	formatCode() {
		EventBus.$emit('editor-format', globalData.nowEditorId);
	}
	deleteLine() {
		this.context.deleteLine();
	}
	addCursorLineEnds() {
		this.editor.cursor.addCursorLineEnds();
	}
	toggleBlockComment() {
		this.context.toggleBlockComment();
	}
	addCursorAbove() {
		this.editor.cursor.addCursorAbove();
	}
	addCursorBelow() {
		this.editor.cursor.addCursorBelow();
	}
	copyLineDown() {
		this.context.copyLineDown();
	}
	insertEmptyLineDown() {
		this.context.insertEmptyLineDown();
	}
	moveCursorWordLeft() {
		this._moveCursor('left', true);
	}
	moveCursorWordRight() {
		this._moveCursor('right', true);
	}
	moveCursorLeft() {
		this._moveCursor('left');
	}
	moveCursorRight() {
		this._moveCursor('right');
	}
	moveCursorUp() {
		if (this.editor.autoTipList && this.editor.autoTipList.length) {
			this.editor.prevAutoTip();
		} else {
			this._moveCursor('up');
		}
	}
	moveCursorDown() {
		if (this.editor.autoTipList && this.editor.autoTipList.length) {
			this.editor.nextAutoTip();
		} else {
			this._moveCursor('down');
		}
	}
	moveCursorHome() {
		this._moveCursor('home');
	}
	moveCursorEnd() {
		this._moveCursor('end');
	}
	_moveCursor(direct, wholeWord) {
		//ctrl+d后，第一次移动光标只是取消选中状态
		if (!this.editor.selecter.getRangeByCursorPos(this.editor.nowCursorPos)) {
			this.editor.cursor.multiCursorPos.forEach(cursorPos => {
				this.editor.cursor.moveCursor(cursorPos, direct, wholeWord);
			});
		}
		this.editor.setAutoTip(null); //取消自动提示
		this.editor.searcher.clearSearch();
		this.editor.fSearcher.clearActive();
	}
	selectAll() {
		this.editor.selecter.selectAll();
	}
	searchWordDown() {
		this.editor.searchWord('down');
	}
	searchWordUp() {
		this.editor.searchWord('up');
	}
	openSearch() {
		this.editor.openSearch();
	}
	openReplace() {
		this.editor.openSearch(true);
	}
	undo() {
		this.editor.history.undo();
	}
	redo() {
		this.editor.history.redo();
	}
	deleteRightWord() {
		this.context.deleteWord('right');
		this.editor.autocomplete.search();
	}
	deleteLeftWord() {
		this.context.deleteWord('left');
		this.editor.autocomplete.search();
	}
	addAnIndent() {
		this.context.addAnIndent();
	}
	removeAnIndent() {
		this.context.removeAnIndent();
	}
	toggleLineComment() {
		this.context.toggleLineComment();
	}
	insertTab() {
		if (this.editor.autoTipList && this.editor.autoTipList.length) {
			this.editor.selectAutoTip();
		} else if (this.editor.selecter.getActiveRangeByCursorPos(this.editor.nowCursorPos)) {
			this.context.addAnIndent();
		} else if (this.editor.indent === 'space' && /^\s*$/.exec(lineObj.text.slice(0, this.editor.nowCursorPos.column))) {
			this.context.insertContent(this.editor.space);
		} else {
			this.context.insertContent('\t');
		}
	}
	insertEnter() {
		if (this.editor.autoTipList && this.editor.autoTipList.length) {
			this.editor.selectAutoTip();
		} else {
			this.context.insertContent('\n');
		}
	}
	deleteContentRight() {
		this.context.deleteContent('right');
		this.editor.autocomplete.search();
	}
	deleteContentLeft() {
		this.context.deleteContent('left');
		this.editor.autocomplete.search();
	}
}