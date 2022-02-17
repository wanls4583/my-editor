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
            'moveLineUp',
            'moveLineDown',
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
        let commandType = command.type || (command instanceof Array ? command[0].type : command.type);
        this.cursor.clearCursorPos();
        switch (commandType) {
            case Util.command.DELETE:
                if (command instanceof Array) {
                    var list = command.map((command) => {
                        return {
                            start: command.preCursorPos,
                            end: command.cursorPos
                        };
                    });
                    this.deleteContent(Util.keyCode.BACKSPACE, list, true);
                } else {
                    this.deleteContent(Util.keyCode.BACKSPACE, {
                        start: command.preCursorPos,
                        end: command.cursorPos
                    }, true);
                }
                break;
            case Util.command.INSERT:
                if (command instanceof Array) {
                    var text = [];
                    var cursorPos = [];
                    command.slice().reverse().map((command) => {
                        text.push(command.text);
                        cursorPos.push(command.cursorPos);
                    });
                    this.insertContent(text, cursorPos, {
                        keyCode: command[0].keyCode
                    });
                } else {
                    this.insertContent(command.text, Object.assign({}, command.cursorPos), {
                        keyCode: command.keyCode
                    });
                }
                break;
            case Util.command.MOVEUP:
                command = command instanceof Array ? command : [command]
                this.moveLineUp(command.map((item) => {
                    return item.cursorPos;
                }), true);
                break;
            case Util.command.MOVEDOWN:
                command = command instanceof Array ? command : [command]
                this.moveLineDown(command.map((item) => {
                    return item.cursorPos;
                }), true);
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
            if (_checkSameOp(lastCommand) && _checkSameOp(command) &&
                _combCheck(lastCommand[0], command[0])) {
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

        function _checkSameOp(commandList) {
            for (let i = 1; i < commandList.length; i++) {
                if (commandList[i].type !== commandList[i - 1].type) {
                    return false;
                }
            }
            return true;
        }

        function _combCheck(lastCommand, command) {
            // 检测是否为连续插入或连续删除
            if (lastCommand && lastCommand.type == command.type &&
                (lastCommand.type == Util.command.DELETE || lastCommand.type === Util.command.INSERT) &&
                command.preCursorPos.line == command.cursorPos.line &&
                Util.comparePos(lastCommand.cursorPos, command.preCursorPos) == 0 &&
                Date.now() - that.pushHistoryTime < 2000) {
                return true;
            }
        }

        // 检查两次操作是否可以合并
        function _combCommand(lastCommand, command) {
            if (lastCommand.type === Util.command.DELETE) {
                lastCommand.cursorPos.line += command.cursorPos.line - command.preCursorPos.line;
                lastCommand.cursorPos.column += command.cursorPos.column - command.preCursorPos.column;
            } else {
                lastCommand.cursorPos = command.cursorPos;
                if (command.keyCode === Util.keyCode.DELETE) {
                    lastCommand.text = lastCommand.text + command.text;
                } else {
                    lastCommand.text = command.text + lastCommand.text;
                }
            }
        }
    }
    // 更新历史记录
    updateHistory(index, command) {
        if (command instanceof Array) {
            command.map((item, _index) => {
                item.keyCode = this.history[index - 1][_index].keyCode;
            });
        } else {
            command.keyCode = this.history[index - 1].keyCode;
        }
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