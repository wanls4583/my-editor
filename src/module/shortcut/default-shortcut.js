import EventBus from '@/event';
import globalData from '../../data/globalData';

const editorKeyMap = {
    'control+shift+Enter': {
        command: 'insertEmptyLineUp',
        when: 'editorFocus'
    },
    'control+shift+ArrowLeft': {
        command: 'selectWordLeft',
        when: 'editorFocus'
    },
    'control+shift+ArrowRight': {
        command: 'selectWordRight',
        when: 'editorFocus'
    },
    'control+shift+ArrowUp': {
        command: 'moveLineUp',
        when: 'editorFocus'
    },
    'control+shift+ArrowDown': {
        command: 'moveLineDown',
        when: 'editorFocus'
    },
    'control+shift+KeyD': {
        command: 'copyLineUp',
        when: 'editorFocus'
    },
    'control+shift+KeyH': {
        command: 'formatCode',
        when: 'editorFocus'
    },
    'control+shift+KeyK': {
        command: 'deleteLine',
        when: 'editorFocus'
    },
    'control+shift+KeyL': {
        command: 'addCursorLineEnds',
        when: 'editorFocus'
    },
    'control+shift+Slash': {
        command: 'toggleBlockComment',
        when: 'editorFocus'
    },
    'alt+control+ArrowUp': {
        command: 'addCursorAbove',
        when: 'editorFocus'
    },
    'alt+control+ArrowDown': {
        command: 'addCursorBelow',
        when: 'editorFocus'
    },
    'alt+shift+ArrowDown': {
        command: 'copyLineDown',
        when: 'editorFocus'
    },
    'control+Enter': {
        command: 'insertEmptyLineDown',
        when: 'editorFocus'
    },
    'control+ArrowLeft': {
        command: 'moveCursorWordLeft',
        when: 'editorFocus'
    },
    'control+ArrowRight': {
        command: 'moveCursorWordRight',
        when: 'editorFocus'
    },
    'control+KeyA': {
        command: 'selectAll',
        when: 'editorFocus'
    },
    'control+KeyD': {
        command: 'searchWordDown',
        when: 'editorFocus'
    },
    'control+KeyF': {
        command: 'openSearch',
        when: 'editorFocus'
    },
    'control+KeyH': {
        command: 'openReplace',
        when: 'editorFocus'
    },
    'control+KeyZ': {
        command: 'undo',
        when: 'editorFocus'
    },
    'control+KeyY': {
        command: 'redo',
        when: 'editorFocus'
    },
    'control+Delete': {
        command: 'deleteRightWord',
        when: 'editorFocus'
    },
    'control+Backspace': {
        command: 'deleteLeftWord',
        when: 'editorFocus'
    },
    'control+BracketRight': {
        command: 'addAnIndent',
        when: 'editorFocus'
    },
    'control+BracketLeft': {
        command: 'removeAnIndent',
        when: 'editorFocus'
    },
    'control+Slash': {
        command: 'toggleLineComment',
        when: 'editorFocus'
    },
    'shift+Tab': {
        command: 'tabRemoveAnIndent',
        when: 'editorFocus'
    },
    'shift+ArrowLeft': {
        command: 'selectLeft',
        when: 'editorFocus'
    },
    'shift+ArrowRight': {
        command: 'selectRight',
        when: 'editorFocus'
    },
    'shift+ArrowUp': {
        command: 'selectUp',
        when: 'editorFocus'
    },
    'shift+ArrowDown': {
        command: 'selectDown',
        when: 'editorFocus'
    },
    'shift+KeyD': {
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

class Command {
    constructor() {
        this.keyMap = {};
        this.initKeyMap();
    }
    initKeyMap() {
        for (let key in editorKeyMap) {
            this.keyMap[key] = this.keyMap[key] || [];
            this.keyMap[key].push(editorKeyMap[key]);
        }
    }
    findCommand(key) {
        let arr = this.keyMap[key];
        if (arr) {
            let editor = globalData.$mainWin.getNowEditor();
            for (let i = 0; i < arr.length; i++) {
                let command = arr[i];
                if (editor.cursorFocus) {
                    if (command.when === 'editorFocus') {
                        return command;
                    }
                } else {
                    return command;
                }
            }
        }
    }
    doComand(command) {
        let editor = globalData.$mainWin.getNowEditor();
        let context = globalData.$mainWin.getNowContext();
        if (this[command.command] && editor && context) {
            this.editor = editor;
            this.context = context;
            this[command.command]();
        }
    }
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

export default Command