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
        Util.defineProperties(this, editor, ['insertContent', 'deleteContent', 'clearCursorPos', 'addCursorPos', 'setSelectedRange']);
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
        this.clearCursorPos();
        switch (commandType) {
            case Util.command.DELETE:
                if (command instanceof Array) {

                    let list = command.slice().reverse().map((command) => {
                        return {
                            start: command.start,
                            end: command.end
                        };
                    });
                    this.deleteContent(Util.keyCode.BACKSPACE, list);
                } else {
                    this.deleteContent(Util.keyCode.BACKSPACE, {
                        start: command.start,
                        end: command.end
                    });
                }
                break;
            case Util.command.INSERT:
                if (command instanceof Array) {
                    let text = [];
                    let cursorPos = [];
                    command.slice().reverse().map((command) => {
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
        if (lastCommand instanceof Array &&
            command instanceof Array &&
            lastCommand.length === command &&
            Date.now() - this.pushHistoryTime < 2000) {
            let pass = true;
            for (let i = 0; i < lastCommand.length; i++) {
                if (!_combCommand(lastCommand[i], command[i], true)) {
                    pass = false;
                    break;
                }
            }
            if (pass) {
                for (let i = 0; i < lastCommand.length; i++) {
                    _combCommand(lastCommand[i], command[i]);
                }
            } else {
                this.history.push(command);
            }
        } else if (!_combCommand(lastCommand, command)) {
            this.history.push(command);
        }
        this.history.index = this.history.length;
        this.pushHistoryTime = Date.now();

        // 检查两次操作是否可以合并
        function _combCommand(lastCommand, command, check) {
            if (lastCommand && lastCommand.type &&
                lastCommand.type == command.type &&
                Date.now() - that.pushHistoryTime < 2000) {
                if (
                    lastCommand.type == Util.command.DELETE &&
                    command.end.line == command.start.line &&
                    Util.comparePos(lastCommand.end, command.start) == 0) {
                    if (!check) {
                        lastCommand.end = command.end;
                    }
                } else if (
                    lastCommand.type == Util.command.INSERT &&
                    command.preCursorPos.line == command.cursorPos.line &&
                    Util.comparePos(lastCommand.cursorPos, command.preCursorPos) == 0
                ) {
                    if (!check) {
                        lastCommand.text = command.text + lastCommand.text;
                        lastCommand.cursorPos = command.cursorPos;
                    }
                } else {
                    return false;
                }
            } else {
                return false;
            }
            return true;
        }
    }
    // 更新历史记录
    updateHistory(index, command) {
        this.history[index - 1] = command;
    }
}