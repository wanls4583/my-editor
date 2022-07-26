import EventBus from '@/event';
import globalData from '@/data/globalData';

export const editorComands = [
	{
		key: 'Ctrl+Shift+Enter',
		command: 'insertEmptyLineUp',
		when: 'editorFocus'
	},
	{
		key: 'Ctrl+Shift+Left',
		command: 'selectWordLeft',
		when: 'editorFocus'
	},
	{
		key: 'Ctrl+Shift+Right',
		command: 'selectWordRight',
		when: 'editorFocus'
	},
	{
		name: 'Move Line Up',
		key: 'Ctrl+Shift+Up',
		command: 'moveLineUp',
		when: 'editorFocus'
	},
	{
		name: 'Move Line Down',
		key: 'Ctrl+Shift+Down',
		command: 'moveLineDown',
		when: 'editorFocus'
	},
	{
		name: 'Copy Line Up',
		key: 'Ctrl+Shift+D',
		command: 'copyLineUp',
		when: 'editorFocus'
	},
	{
		key: 'Ctrl+Shift+H',
		command: 'formatCode',
		when: 'editorFocus'
	},
	{
		name: 'Delete Line',
		key: 'Ctrl+Shift+K',
		command: 'deleteLine',
		when: 'editorFocus'
	},
	{
		name: 'Add Cursor to Line Ends',
		key: 'Ctrl+Shift+L',
		command: 'addCursorLineEnds',
		when: 'editorFocus'
	},
	{
		key: 'Ctrl+Shift+/',
		command: 'toggleBlockComment',
		when: 'editorFocus'
	},
	{
		name: 'Add Cursor Above',
		key: 'Ctrl+Alt+Up',
		command: 'addCursorAbove',
		when: 'editorFocus'
	},
	{
		name: 'Add Cursor Below',
		key: 'Ctrl+Alt+Down',
		command: 'addCursorBelow',
		when: 'editorFocus'
	},
	{
		name: 'Copy Line Down',
		key: 'Alt+Shift+Down',
		command: 'copyLineDown',
		when: 'editorFocus'
	},
	{
		key: 'Ctrl+Enter',
		command: 'insertEmptyLineDown',
		when: 'editorFocus'
	},
	{
		key: 'Ctrl+Left',
		command: 'moveCursorWordLeft',
		when: 'editorFocus'
	},
	{
		key: 'Ctrl+Right',
		command: 'moveCursorWordRight',
		when: 'editorFocus'
	},
	{
		name: 'Select All',
		key: 'Ctrl+A',
		command: 'selectAll',
		when: 'editorFocus'
	},
	{
		name: 'Add Next Occurence',
		key: 'Ctrl+D',
		command: 'searchWordDown',
		when: 'editorFocus'
	},
	{
		name: 'Find',
		key: 'Ctrl+F',
		command: 'openSearch',
		when: 'editorFocus'
	},
	{
		name: 'Replace',
		key: 'Ctrl+H',
		command: 'openReplace',
		when: 'editorFocus'
	},
	{
		name: 'Undo',
		key: 'Ctrl+Z',
		command: 'undo',
		when: 'editorFocus'
	},
	{
		name: 'Redo',
		key: 'Ctrl+Y',
		command: 'redo',
		when: 'editorFocus'
	},
	{
		key: 'Ctrl+Delete',
		command: 'deleteRightWord',
		when: 'editorFocus'
	},
	{
		key: 'Ctrl+Backspace',
		command: 'deleteLeftWord',
		when: 'editorFocus'
	},
	{
		key: 'Ctrl+]',
		command: 'addAnIndent',
		when: 'editorFocus'
	},
	{
		key: 'Ctrl+[',
		command: 'removeAnIndent',
		when: 'editorFocus'
	},
	{
		key: 'Ctrl+/',
		command: 'toggleLineComment',
		when: 'editorFocus'
	},
	{
		key: 'Shift+Capslock',
		command: 'tabRemoveAnIndent',
		when: 'editorFocus'
	},
	{
		key: 'Shift+Left',
		command: 'selectLeft',
		when: 'editorFocus'
	},
	{
		key: 'Shift+Right',
		command: 'selectRight',
		when: 'editorFocus'
	},
	{
		key: 'Shift+Up',
		command: 'selectUp',
		when: 'editorFocus'
	},
	{
		key: 'Shift+Down',
		command: 'selectDown',
		when: 'editorFocus'
	},
	{
		name: 'Add Previous Occurence',
		key: 'Shift+D',
		command: 'searchWordUp',
		when: 'editorFocus'
	},
	{
		key: 'Capslock',
		command: 'insertTab',
		when: 'editorFocus'
	},
	{
		key: 'Left',
		command: 'moveCursorLeft',
		when: 'editorFocus'
	},
	{
		key: 'Right',
		command: 'moveCursorRight',
		when: 'editorFocus'
	},
	{
		key: 'Up',
		command: 'moveCursorUp',
		when: 'editorFocus'
	},
	{
		key: 'Down',
		command: 'moveCursorDown',
		when: 'editorFocus'
	},
	{
		key: 'End',
		command: 'moveCursorEnd',
		when: 'editorFocus'
	},
	{
		key: 'Home',
		command: 'moveCursorHome',
		when: 'editorFocus'
	},
	{
		key: 'Enter',
		command: 'insertEnter',
		when: 'editorFocus'
	},
	{
		key: 'Delete',
		command: 'deleteContentRight',
		when: 'editorFocus'
	},
	{
		key: 'Backspace',
		command: 'deleteContentLeft',
		when: 'editorFocus'
	},
]

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