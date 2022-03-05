/*
 * @Author: lisong
 * @Date: 2022-02-18 16:13:15
 * @Description: 
 */
import Util from '@/common/Util';

export default class {
    constructor(editor, context) {
        this.initProperties(editor, context);
    }
    initProperties(editor, context) {
        Util.defineProperties(this, editor, [
            'nowCursorPos',
            'cursor',
            'selecter',
            'searcher',
            'fSearcher',
            'history',
            'searchWord',
            'openSearch',
        ]);
        Util.defineProperties(this, context, [
            'htmls',
            'insertContent',
            'deleteContent',
            'moveLineUp',
            'moveLineDown',
            'copyLineUp',
            'copyLineDown',
            'deleteLine'
        ]);
        this.setEditorData = (prop, value) => {
            editor.setData(prop, value);
        }
    }
    onKeyDown(e) {
        let that = this;
        if (e.ctrlKey && e.shiftKey) {
            e.preventDefault();
            switch (e.keyCode) {
                case 37: //ctrl+shift+left
                    this.selecter.select('left', true);
                    break;
                case 38: //ctrl+shift+up
                    this.moveLineUp();
                    break;
                case 39: //ctrl+shift+right
                    this.selecter.select('right', true);
                    break;
                case 40: //ctrl+shift+down
                    this.moveLineDown();
                    break;
                case 68: //ctrl+shift+D
                    this.copyLineUp();
                    break;
                case 75: //ctrl+shift+K
                    this.deleteLine();
                    break;
                case 76: //ctrl+alt+L
                    e.preventDefault();
                    this.cursor.addCursorLineEnds();
                    break;
            }
            return false;
        } else if (e.ctrlKey && e.altKey) {
            switch (e.keyCode) {
                case 38: //ctrl+alt+up
                    e.preventDefault();
                    this.cursor.addCursorAbove();
                    break;
                case 40: //ctrl+alt+down
                    e.preventDefault();
                    this.cursor.addCursorBelow();
                    break;
            }
        } else if (e.altKey && e.shiftKey) {
            switch (e.keyCode) {
                case 40: //alt+shift+down
                    e.preventDefault();
                    this.copyLineDown();
                    break;
            }
        } else if (e.ctrlKey) {
            switch (e.keyCode) {
                case 37: //left arrow
                    _moveCursor('left', true);
                    break;
                case 39: //right arrow
                    _moveCursor('right', true);
                    break;
                case 65: //ctrl+A,全选
                    e.preventDefault();
                    this.selecter.selectAll();
                    break;
                case 68: //ctrl+D，搜素
                    e.preventDefault();
                    this.searchWord();
                    break;
                case 70: //ctrl+F，搜素
                    e.preventDefault();
                    this.openSearch();
                    break;
                case 72: //ctrl+H，搜素替换
                    e.preventDefault();
                    this.openSearch(true);
                    break;
                case 90: //ctrl+Z，撤销
                case 122:
                    e.preventDefault();
                    this.history.undo();
                    break;
                case 89: //ctrl+Y，重做
                case 121:
                    e.preventDefault();
                    this.history.redo();
                    break;
            }
        } else if (e.shiftKey) {
            switch (e.keyCode) {
                case 37: //left arrow
                    this.selecter.select('left');
                    break;
                case 38: //up arrow
                    this.selecter.select('up');
                    break;
                case 39: //right arrow
                    this.selecter.select('right');
                    break;
                case 40: //down arrow
                    this.selecter.select('down');
                    break;
            }
        } else {
            switch (e.keyCode) {
                case 9: //tab键
                    e.preventDefault();
                    this.insertContent('\t');
                    break;
                case 37: //left arrow
                    _moveCursor('left');
                    break;
                case 35: //end键
                    _moveCursor('end');
                    break;
                case 36: //home键
                    _moveCursor('home');
                    break;
                case 38: //up arrow
                    _moveCursor('up');
                    break;
                case 39: //right arrow
                    _moveCursor('right');
                    break;
                case 40: //down arrow
                    _moveCursor('down');
                    break;
                case Util.keyCode.DELETE: //delete
                    this.deleteContent(Util.keyCode.DELETE);
                    break;
                case Util.keyCode.BACKSPACE: //backspace
                    this.deleteContent(Util.keyCode.BACKSPACE);
                    break;
            }
        }

        function _moveCursor(direct, wholeWord) {
            //ctrl+d后，第一次移动光标只是取消选中状态
            if (!that.selecter.getRangeByCursorPos(that.nowCursorPos)) {
                that.cursor.multiCursorPos.forEach((cursorPos) => {
                    that.cursor.moveCursor(cursorPos, direct, wholeWord);
                });
            }
            that.searcher.clearSearch();
            that.fSearcher.clearNow();
        }
    }
}