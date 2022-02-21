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
            'multiCursorPos',
            'nowCursorPos',
            'cursor',
            'selecter',
            'history',
            'searchWord',
            'openSearch',
            'renderSelectedBg',
        ]);
        Util.defineProperties(this, context, [
            'htmls',
            'insertContent',
            'deleteContent',
            'moveLineUp',
            'moveLineDown',
            'copyLineUp',
            'copyLineDown',
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
                case 68: //ctrl+shift+d
                    this.copyLineUp();
                    break;
            }
            return false;
        } else if (e.altKey && e.shiftKey) {
            e.preventDefault();
            switch (e.keyCode) {
                case 40:
                    this.copyLineDown();
                    break;
            }
        } else if (e.ctrlKey) {
            switch (e.keyCode) {
                case 37: //left arrow
                    _moveCursor('left', true);
                    this.selecter.clearRange();
                    this.renderSelectedBg();
                    break;
                case 39: //right arrow
                    _moveCursor('right', true);
                    this.selecter.clearRange();
                    this.renderSelectedBg();
                    break;
                case 65: //ctrl+a,全选
                    e.preventDefault();
                    let end = {
                        line: this.htmls.length,
                        column: this.htmls.peek().text.length
                    };
                    this.selecter.setSelectedRange({
                        line: 1,
                        column: 0
                    }, end);
                    this.setEditorData('forceCursorView', false);
                    this.cursor.setCursorPos(end);
                    this.renderSelectedBg();
                    break;
                case 68: //ctrl+d，搜素
                    e.preventDefault();
                    this.searchWord();
                    break;
                case 70: //ctrl+f，搜素
                    e.preventDefault();
                    this.openSearch();
                    break;
                case 90: //ctrl+z，撤销
                case 122:
                    e.preventDefault();
                    this.history.undo();
                    break;
                case 89: //ctrl+y，重做
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
                    this.selecter.clearRange();
                    this.renderSelectedBg();
                    break;
                case 38: //up arrow
                    _moveCursor('up');
                    this.selecter.clearRange();
                    this.renderSelectedBg();
                    break;
                case 39: //right arrow
                    _moveCursor('right');
                    this.selecter.clearRange();
                    this.renderSelectedBg();
                    break;
                case 40: //down arrow
                    _moveCursor('down');
                    this.selecter.clearRange();
                    this.renderSelectedBg();
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
            if (!that.selecter.checkCursorSelected(that.nowCursorPos)) {
                that.multiCursorPos.map((cursorPos) => {
                    that.cursor.moveCursor(cursorPos, direct, wholeWord);
                });
            }
        }
    }
}