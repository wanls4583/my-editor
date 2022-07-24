import EventBus from '@/event';
import globalData from '@/data/globalData';

export const editorKeyMap = {
	'Ctrl+Shift+Enter': {
		command: 'insertEmptyLineUp',
		when: 'editorFocus'
	},
	'Ctrl+Shift+Left': {
		command: 'selectWordLeft',
		when: 'editorFocus'
	},
	'Ctrl+Shift+Right': {
		command: 'selectWordRight',
		when: 'editorFocus'
	},
	'Ctrl+Shift+Up': {
		command: 'moveLineUp',
		when: 'editorFocus'
	},
	'Ctrl+Shift+Down': {
		command: 'moveLineDown',
		when: 'editorFocus'
	},
	'Ctrl+Shift+D': {
		command: 'copyLineUp',
		when: 'editorFocus'
	},
	'Ctrl+Shift+H': {
		command: 'formatCode',
		when: 'editorFocus'
	},
	'Ctrl+Shift+K': {
		command: 'deleteLine',
		when: 'editorFocus'
	},
	'Ctrl+Shift+L': {
		command: 'addCursorLineEnds',
		when: 'editorFocus'
	},
	'Ctrl+Shift+/': {
		command: 'toggleBlockComment',
		when: 'editorFocus'
	},
	'Ctrl+Alt+Up': {
		command: 'addCursorAbove',
		when: 'editorFocus'
	},
	'Ctrl+Alt+Down': {
		command: 'addCursorBelow',
		when: 'editorFocus'
	},
	'Alt+Shift+Down': {
		command: 'copyLineDown',
		when: 'editorFocus'
	},
	'Ctrl+Enter': {
		command: 'insertEmptyLineDown',
		when: 'editorFocus'
	},
	'Ctrl+Left': {
		command: 'moveCursorWordLeft',
		when: 'editorFocus'
	},
	'Ctrl+Right': {
		command: 'moveCursorWordRight',
		when: 'editorFocus'
	},
	'Ctrl+A': {
		command: 'selectAll',
		when: 'editorFocus'
	},
	'Ctrl+D': {
		command: 'searchWordDown',
		when: 'editorFocus'
	},
	'Ctrl+F': {
		command: 'openSearch',
		when: 'editorFocus'
	},
	'Ctrl+H': {
		command: 'openReplace',
		when: 'editorFocus'
	},
	'Ctrl+Z': {
		command: 'undo',
		when: 'editorFocus'
	},
	'Ctrl+Y': {
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
	'Ctrl+]': {
		command: 'addAnIndent',
		when: 'editorFocus'
	},
	'Ctrl+[': {
		command: 'removeAnIndent',
		when: 'editorFocus'
	},
	'Ctrl+/': {
		command: 'toggleLineComment',
		when: 'editorFocus'
	},
	'Shift+Tab': {
		command: 'tabRemoveAnIndent',
		when: 'editorFocus'
	},
	'Shift+Left': {
		command: 'selectLeft',
		when: 'editorFocus'
	},
	'Shift+Right': {
		command: 'selectRight',
		when: 'editorFocus'
	},
	'Shift+Up': {
		command: 'selectUp',
		when: 'editorFocus'
	},
	'Shift+Down': {
		command: 'selectDown',
		when: 'editorFocus'
	},
	'Shift+D': {
		command: 'searchWordUp',
		when: 'editorFocus'
	},
	'Tab': {
		command: 'insertTab',
		when: 'editorFocus'
	},
	'Left': {
		command: 'moveCursorLeft',
		when: 'editorFocus'
	},
	'Right': {
		command: 'moveCursorRight',
		when: 'editorFocus'
	},
	'Up': {
		command: 'moveCursorUp',
		when: 'editorFocus'
	},
	'Down': {
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