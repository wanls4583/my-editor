/*
 * @Author: lisong
 * @Date: 2021-12-31 15:11:27
 * @Description: 
 */
import Util from '@/common/Util';
export default class {
    constructor(editor, context) {
        this.initProperties(editor, context);
    }
    initProperties(editor, context) {
        Util.defineProperties(this, editor, [
            'cursor',
            'insertContent',
            'deleteContent',
            'setSelectedRange'
        ]);
        Util.defineProperties(this, context, ['history']);
    }
    // 撤销操作
    undo() {
        if (this.history.index > 0) {
            let command = this.history[this.history.index - 1];
            this.doCommand(command);
            this.history.index--;
        }
    }
    // 重做操作
    redo() {
        if (this.history.index < this.history.length) {
            let command = this.history[this.history.index];
            this.history.index++;
            this.doCommand(command);
        }
    }
    // 操作命令
    doCommand(command) {
        let commandType = command instanceof Array ? command[0].type : command.type;
        this.cursor.clearCursorPos();
        switch (commandType) {
            case Util.command.DELETE:
                if (command instanceof Array) {
                    let list = command.slice().reverse().map((command) => {
                        return {
                            start: command.preCursorPos,
                            end: command.cursorPos
                        };
                    });
                    this.deleteContent(Util.keyCode.BACKSPACE, list);
                } else {
                    this.deleteContent(Util.keyCode.BACKSPACE, {
                        start: command.preCursorPos,
                        end: command.cursorPos
                    });
                }
                break;
            case Util.command.INSERT:
                if (command instanceof Array) {
                    let text = [];
                    let cursorPos = [];
                    command.map((command) => {
                        text.push(command.text);
                        cursorPos.push(command.cursorPos);
                    });
                    this.insertContent(text, cursorPos);
                } else {
                    this.insertContent(command.text, Object.assign({}, command.cursorPos));
                }
                break;
        }
    }
    // 添加历史记录
    pushHistory(command) {
        while (this.history.length > this.history.index) {
            this.history.pop();
        }
        let that = this;
        let lastCommand = this.history[this.history.index - 1];
        command = this.sortComand(command);
        if (lastCommand instanceof Array &&
            command instanceof Array &&
            lastCommand.length === command.length &&
            Date.now() - this.pushHistoryTime < 2000) {
            if (_combCheck(lastCommand[0], command[0])) {
                let commandItem = command[0];
                if (commandItem.type === Util.command.DELETE) {
                    lastCommand.map((_commandItem) => {
                        _updateAfter(_commandItem.preCursorPos, commandItem.preCursorPos, commandItem.cursorPos);
                    });
                }
                for (let i = 0; i < lastCommand.length; i++) {
                    _combCommand(lastCommand[i], command[i]);
                }
            } else {
                this.history.push(command);
            }
        } else if (_combCheck(lastCommand, command)) {
            _combCommand(lastCommand, command);
        } else {
            this.history.push(command);
        }
        this.history.index = this.history.length;
        this.pushHistoryTime = Date.now();

        function _combCheck(lastCommand, command) {
            if (lastCommand && lastCommand.type &&
                lastCommand.type == command.type &&
                command.preCursorPos.line == command.cursorPos.line &&
                Util.comparePos(lastCommand.cursorPos, command.preCursorPos) == 0 &&
                Date.now() - that.pushHistoryTime < 2000) {
                return true;
            }
        }

        // 检查两次操作是否可以合并
        function _combCommand(lastCommand, command, lineHead) {
            if (lastCommand.type === Util.command.DELETE) {
                lastCommand.cursorPos = command.cursorPos;
            } else {
                lastCommand.text = command.text + lastCommand.text;
                lastCommand.cursorPos.line += command.cursorPos.line - command.preCursorPos.line;
                lastCommand.cursorPos.column += command.cursorPos.column - command.preCursorPos.column;
            }
        }

        function _updateAfter(item, preCursorPos, cursorPos) {
            if (item.line > preCursorPos.line) {
                item.line += cursorPos.line - preCursorPos.line;
            } else if (item.line === preCursorPos.line && item.column > preCursorPos.column) {
                item.line += cursorPos.line - preCursorPos.line;
                item.column += cursorPos.column - preCursorPos.column;
            }
        }
    }
    // 更新历史记录
    updateHistory(index, command) {
        this.history[index - 1] = this.sortComand(command);
    }
    sortComand(command) {
        if (command instanceof Array) {
            command.sort((a, b) => {
                a = a.cursorPos;
                b = b.cursorPos;
                if (a.line === b.line) {
                    return a.column - b.column;
                }
                return a.line - b.line;
            });
        }
        return command;
    }
}