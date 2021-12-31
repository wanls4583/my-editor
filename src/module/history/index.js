/*
 * @Author: lisong
 * @Date: 2021-12-31 15:11:27
 * @Description: 
 */
import Util from '@/common/util';
export default class {
    constructor(editor, context) {
        this.context = context;
        this.initProperties(editor, context);
    }
    initProperties(editor, context) {
        let taht = this;
        _initProperties(editor, ['insertContent', 'deleteContent', 'setCursorPos', 'setSelectedRange']);
        _initProperties(context, ['history']);

        function _initProperties(context, properties) {
            let result = {};
            properties.map((property) => {
                result[property] = {
                    get: function () {
                        if (typeof context[property] == 'function') {
                            return context[property].bind(context);
                        } else {
                            return context[property];
                        }
                    }
                }
            });
            Object.defineProperties(taht, result);
        }
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
        switch (command.type) {
            case Util.command.DELETE:
                this.setSelectedRange(command.start, command.end);
                this.deleteContent(Util.keyCode.BACKSPACE, true);
                break;
            case Util.command.INSERT:
                this.setCursorPos(command.cursorPos.line, command.cursorPos.column);
                this.insertContent(command.text, true);
                break;
        }
    }
    // 添加历史记录
    pushHistory(command) {
        var lastCommand = this.history[this.history.index - 1];
        while (this.history.length > this.history.index) {
            this.history.pop();
        }
        // 两次操作可以合并
        if (lastCommand && lastCommand.type == command.type && Date.now() - this.pushHistoryTime < 2000) {
            if (
                lastCommand.type == Util.command.DELETE &&
                command.end.line == command.start.line &&
                Util.comparePos(lastCommand.end, command.start) == 0) {
                lastCommand.end = command.end;
            } else if (
                lastCommand.type == Util.command.INSERT &&
                command.preCursorPos.line == command.cursorPos.line &&
                Util.comparePos(lastCommand.cursorPos, command.preCursorPos) == 0
            ) {
                lastCommand.text = command.text + lastCommand.text;
                lastCommand.cursorPos = command.cursorPos;
            } else {
                this.history.push(command);
            }
        } else {
            this.history.push(command);
        }
        this.history.index = this.history.length;
        this.pushHistoryTime = Date.now();
    }
    // 更新历史记录
    updateHistory(index, command) {
        this.history[index - 1] = command;
    }
}