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
			e.preventDefault();
			switch (e.keyCode) {
				case 37: //ctrl+shift+left
					this.editor.selecter.select('left', true);
					break;
				case 38: //ctrl+shift+up
					this.context.moveLineUp();
					break;
				case 39: //ctrl+shift+right
					this.editor.selecter.select('right', true);
					break;
				case 40: //ctrl+shift+down
					this.context.moveLineDown();
					break;
				case 68: //ctrl+shift+D
					this.context.copyLineUp();
					break;
				case 72: //ctrl+shift+H
					EventBus.$emit('editor-format', globalData.nowEditorId);
					break;
				case 75: //ctrl+shift+K
					this.context.deleteLine();
					break;
				case 76: //ctrl+alt+L
					e.preventDefault();
					this.editor.cursor.addCursorLineEnds();
					break;
			}
			return false;
		} else if (e.ctrlKey && e.altKey) {
			switch (e.keyCode) {
				case 38: //ctrl+alt+up
					e.preventDefault();
					this.editor.cursor.addCursorAbove();
					break;
				case 40: //ctrl+alt+down
					e.preventDefault();
					this.editor.cursor.addCursorBelow();
					break;
			}
		} else if (e.altKey && e.shiftKey) {
			switch (e.keyCode) {
				case 40: //alt+shift+down
					e.preventDefault();
					this.context.copyLineDown();
					break;
			}
		} else if (e.ctrlKey) {
			switch (e.keyCode) {
				case 37: //left arrow
					_moveCursor.call(this, 'left', true);
					break;
				case 39: //right arrow
					_moveCursor.call(this, 'right', true);
					break;
				case 65: //ctrl+A,全选
					e.preventDefault();
					this.editor.selecter.selectAll();
					break;
				case 68: //ctrl+D，搜素
					e.preventDefault();
					this.editor.searchWord('down');
					break;
				case 70: //ctrl+F，搜素
					e.preventDefault();
					this.editor.openSearch();
					break;
				case 72: //ctrl+H，搜素替换
					e.preventDefault();
					this.editor.openSearch(true);
					break;
				case 83: //ctrl+s 保存
					EventBus.$emit('file-save', { id: this.editor.editorId });
					break;
				case 90: //ctrl+Z，撤销
				case 122:
					e.preventDefault();
					this.editor.history.undo();
					break;
				case 89: //ctrl+Y，重做
				case 121:
					e.preventDefault();
					this.editor.history.redo();
					break;
			}
		} else if (e.shiftKey) {
			switch (e.keyCode) {
				case 37: //left arrow
					this.editor.selecter.select('left');
					break;
				case 38: //up arrow
					this.editor.selecter.select('up');
					break;
				case 39: //right arrow
					this.editor.selecter.select('right');
					break;
				case 40: //down arrow
					this.editor.selecter.select('down');
					break;
			}
		} else {
			switch (e.keyCode) {
				case 9: //tab键
					e.preventDefault();
					this.editor.autocomplete.emmet();
					break;
				case 37: //left arrow
					_moveCursor.call(this, 'left');
					break;
				case 35: //end键
					_moveCursor.call(this, 'end');
					break;
				case 36: //home键
					_moveCursor.call(this, 'home');
					break;
				case 38: //up arrow
					if (this.editor.autoTipList && this.editor.autoTipList.length) {
						this.editor.prevAutoTip();
					} else {
						_moveCursor.call(this, 'up');
					}
					break;
				case 39: //right arrow
					_moveCursor.call(this, 'right');
					break;
				case 40: //down arrow
					if (this.editor.autoTipList && this.editor.autoTipList.length) {
						this.editor.nextAutoTip();
					} else {
						_moveCursor.call(this, 'down');
					}
					break;
				case 13:
				case 100: //enter
					if (this.editor.autoTipList && this.editor.autoTipList.length) {
						e.preventDefault();
						this.editor.selectAutoTip();
					}
					break;
				case Util.KEYCODE.DELETE: //delete
					this.context.deleteContent(Util.KEYCODE.DELETE);
					this.editor.autocomplete.search();
					break;
				case Util.KEYCODE.BACKSPACE: //backspace
					this.context.deleteContent(Util.KEYCODE.BACKSPACE);
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
