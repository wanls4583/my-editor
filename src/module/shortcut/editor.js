/*
 * @Author: lisong
 * @Date: 2022-02-18 16:13:15
 * @Description:
 */
import Util from '@/common/util';
import EventBus from '@/event';
import globalData from '../../data/globalData';

export default class {
	constructor(editor, context) {
		this.editor = editor;
		this.context = context;
	}
	onKeydown(e) {
		if (e.ctrlKey && e.shiftKey) {
			switch (e.code) {
				case 'Enter':
					e.preventDefault();
					e.stopPropagation();
					this.context.insertEmptyLineUp();
					break;
				case 'ArrowLeft': //ctrl+shift+left
					e.preventDefault();
					e.stopPropagation();
					this.editor.selecter.select('left', true);
					break;
				case 'ArrowUp': //ctrl+shift+up
					e.preventDefault();
					e.stopPropagation();
					this.context.moveLineUp();
					break;
				case 'ArrowRight': //ctrl+shift+right
					e.preventDefault();
					e.stopPropagation();
					this.editor.selecter.select('right', true);
					break;
				case 'ArrowDown': //ctrl+shift+down
					e.preventDefault();
					e.stopPropagation();
					this.context.moveLineDown();
					break;
				case 'KeyD': //ctrl+shift+D
					e.preventDefault();
					e.stopPropagation();
					this.context.copyLineUp();
					break;
				case 'KeyH': //ctrl+shift+H
					e.preventDefault();
					e.stopPropagation();
					EventBus.$emit('editor-format', globalData.nowEditorId);
					break;
				case 'KeyK': //ctrl+shift+K
					e.preventDefault();
					e.stopPropagation();
					this.context.deleteLine();
					break;
				case 'KeyL': //ctrl+alt+L
					e.preventDefault();
					e.stopPropagation();
					this.editor.cursor.addCursorLineEnds();
					break;
			}
			return false;
		} else if (e.ctrlKey && e.altKey) {
			switch (e.code) {
				case 'ArrowUp': //ctrl+alt+up
					e.preventDefault();
					e.stopPropagation();
					this.editor.cursor.addCursorAbove();
					break;
				case 'ArrowDown': //ctrl+alt+down
					e.preventDefault();
					e.stopPropagation();
					this.editor.cursor.addCursorBelow();
					break;
			}
		} else if (e.altKey && e.shiftKey) {
			switch (e.code) {
				case 'ArrowDown': //alt+shift+down
					e.preventDefault();
					e.stopPropagation();
					this.context.copyLineDown();
					break;
			}
		} else if (e.ctrlKey) {
			switch (e.code) {
				case 'Enter':
					e.preventDefault();
					e.stopPropagation();
					this.context.insertEmptyLineDown();
					break;
				case 'ArrowLeft': //left arrow
					e.preventDefault();
					e.stopPropagation();
					_moveCursor.call(this, 'left', true);
					break;
				case 'ArrowRight': //right arrow
					e.preventDefault();
					e.stopPropagation();
					_moveCursor.call(this, 'right', true);
					break;
				case 'KeyA': //ctrl+A,全选
					e.preventDefault();
					e.stopPropagation();
					this.editor.selecter.selectAll();
					break;
				case 'KeyD': //ctrl+D，搜素
					e.preventDefault();
					e.stopPropagation();
					this.editor.searchWord('down');
					break;
				case 'KeyF': //ctrl+F，搜素
					e.preventDefault();
					e.stopPropagation();
					this.editor.openSearch();
					break;
				case 'KeyH': //ctrl+H，搜素替换
					e.preventDefault();
					e.stopPropagation();
					this.editor.openSearch(true);
					break;
				case 'KeyZ': //ctrl+Z，撤销
					e.preventDefault();
					e.stopPropagation();
					this.editor.history.undo();
					break;
				case 'KeyY': //ctrl+Y，重做
					e.preventDefault();
					e.stopPropagation();
					this.editor.history.redo();
					break;
				case 'Delete': //delete
					e.preventDefault();
					e.stopPropagation();
					this.context.deleteWord('right');
					this.editor.autocomplete.search();
					break;
				case 'Backspace': //backspace
					e.preventDefault();
					e.stopPropagation();
					this.context.deleteWord('left');
					this.editor.autocomplete.search();
					break;
				case 'BracketRight':
					e.preventDefault();
					e.stopPropagation();
					this.context.addAnIndent();
					break;
				case 'BracketLeft':
					e.preventDefault();
					e.stopPropagation();
					this.context.removeAnIndent();
					break;
			}
		} else if (e.shiftKey) {
			switch (e.code) {
				case 'ArrowLeft': //left arrow
					e.preventDefault();
					e.stopPropagation();
					this.editor.selecter.select('left');
					break;
				case 'ArrowUp': //up arrow
					e.preventDefault();
					e.stopPropagation();
					this.editor.selecter.select('up');
					break;
				case 'ArrowRight': //right arrow
					e.preventDefault();
					e.stopPropagation();
					this.editor.selecter.select('right');
					break;
				case 'ArrowDown': //down arrow
					e.preventDefault();
					e.stopPropagation();
					this.editor.selecter.select('down');
					break;
				case 'KeyD': //shift+D，搜素
					e.preventDefault();
					e.stopPropagation();
					this.editor.searchWord('up');
					break;
			}
		} else {
			switch (e.code) {
				case 'Tab': //tab键
					e.preventDefault();
					e.stopPropagation();
					this.editor.autocomplete.emmet();
					break;
				case 'ArrowLeft': //left arrow
					e.preventDefault();
					e.stopPropagation();
					_moveCursor.call(this, 'left');
					break;
				case 'End': //end键
					e.preventDefault();
					e.stopPropagation();
					_moveCursor.call(this, 'end');
					break;
				case 'Home': //home键
					e.preventDefault();
					e.stopPropagation();
					_moveCursor.call(this, 'home');
					break;
				case 'ArrowUp': //up arrow
					e.preventDefault();
					e.stopPropagation();
					if (this.editor.autoTipList && this.editor.autoTipList.length) {
						this.editor.prevAutoTip();
					} else {
						_moveCursor.call(this, 'up');
					}
					break;
				case 'ArrowRight': //right arrow
					e.preventDefault();
					e.stopPropagation();
					_moveCursor.call(this, 'right');
					break;
				case 'ArrowDown': //down arrow
					e.preventDefault();
					e.stopPropagation();
					if (this.editor.autoTipList && this.editor.autoTipList.length) {
						this.editor.nextAutoTip();
					} else {
						_moveCursor.call(this, 'down');
					}
					break;
				case 'Enter':
					if (this.editor.autoTipList && this.editor.autoTipList.length) {
						e.preventDefault();
						e.stopPropagation();
						this.editor.selectAutoTip();
					}
					break;
				case 'Delete': //delete
					e.preventDefault();
					e.stopPropagation();
					this.context.deleteContent('right');
					this.editor.autocomplete.search();
					break;
				case 'Backspace': //backspace
					e.preventDefault();
					e.stopPropagation();
					this.context.deleteContent('left');
					this.editor.autocomplete.search();
					break;
			}
		}

		function _moveCursor(direct, wholeWord) {
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
	}
}
