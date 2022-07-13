/*
 * @Author: lisong
 * @Date: 2021-12-31 15:11:27
 * @Description:
 */
import Util from '@/common/util';
import EventBus from '@/event';
export default class {
	constructor(editor, context) {
		this.editor = editor;
		this.context = context;
		this.history = [];
		this.history.index = 0;
	}
	destroy() {
		this.editor = null;
		this.context = null;
		this.history = [];
	}
	// 撤销操作
	undo() {
		if (this.history.index > 0) {
			let command = this.history[this.history.index - 1];
			this.doCommand(command);
			this.history.index--;
			if (command.serial) {
				//连续操作标识
				let _command = this.history[this.history.index - 1];
				_command && _command.serial === command.serial && this.undo();
			}
			if (this.history.index === this.savedIndex) {
				EventBus.$emit('editor-saved', this.editor.editorId);
			}
		}
	}
	// 重做操作
	redo() {
		if (this.history.index < this.history.length) {
			let command = this.history[this.history.index];
			this.history.index++;
			this.doCommand(command);
			if (command.serial) {
				//连续操作标识
				let _command = this.history[this.history.index];
				_command && _command.serial === command.serial && this.redo();
			}
			if (this.history.index === this.savedIndex) {
				EventBus.$emit('editor-saved', this.editor.editorId);
			}
		}
	}
	// 操作命令
	doCommand(command) {
		let commandType = command.type || (command instanceof Array ? command[0].type : command.type);
		switch (commandType) {
			case Util.HISTORY_COMMAND.DELETE:
				this.editor.cursor.clearCursorPos();
				this.context.deleteContent('left', command);
				break;
			case Util.HISTORY_COMMAND.INSERT:
				this.editor.cursor.clearCursorPos();
				if (command instanceof Array) {
					var text = [];
					command.forEach(item => {
						text.push(item.text);
					});
					this.context.insertContent(text, command);
				} else {
					this.context.insertContent(command.text, command);
				}
				break;
			case Util.HISTORY_COMMAND.DELETE_LINE:
				this.editor.cursor.clearCursorPos();
				this.context.deleteLine(command);
				break;
			case Util.HISTORY_COMMAND.INSERT_LINE:
				this.editor.cursor.clearCursorPos();
				this.context.insertLine(command);
				break;
			case Util.HISTORY_COMMAND.MOVEUP:
				this.editor.cursor.clearCursorPos();
				this.context.moveLineUp(command);
				break;
			case Util.HISTORY_COMMAND.MOVEDOWN:
				this.editor.cursor.clearCursorPos();
				this.context.moveLineDown(command);
				break;
			case Util.HISTORY_COMMAND.COPY_DOWN:
				this.editor.cursor.clearCursorPos();
				this.context.copyLineDown(command);
				break;
			case Util.HISTORY_COMMAND.DELETE_COPY_DOWN:
				this.editor.cursor.clearCursorPos();
				this.context.deleteCopyLineDown(command);
				break;
			case Util.HISTORY_COMMAND.COPY_UP:
				this.editor.cursor.clearCursorPos();
				this.context.copyLineUp(command);
				break;
			case Util.HISTORY_COMMAND.DELETE_COPY_UP:
				this.editor.cursor.clearCursorPos();
				this.context.deleteCopyLineUp(command);
				break;
			case Util.HISTORY_COMMAND.REPLACE:
				this.editor.cursor.clearCursorPos();
				this.context.replace(command.text, command.cursorPos, command);
				break;
			case Util.HISTORY_COMMAND.TAB_TO_SPACE:
				this.context.convertTabToSpace(command);
				break;
			case Util.HISTORY_COMMAND.SPACE_TO_TAB:
				this.context.convertSpaceToTab(command);
				break;
		}
	}
	// 添加历史记录
	pushHistory(command, historyJoinAble) {
		while (this.history.length > this.history.index) {
			this.history.pop();
		}
		let lastCommand = this.history[this.history.index - 1];
		command = this.sortComand(command);
		if (command instanceof Array && !command.length) {
			return;
		}
		if(historyJoinAble) {
			if (lastCommand instanceof Array && command instanceof Array && lastCommand.length === command.length && Date.now() - this.pushHistoryTime < 2000) {
				if (_checkSameOp(lastCommand) && _checkSameOp(command) && _combCheck.call(this, lastCommand[0], command[0])) {
					for (let i = 0; i < lastCommand.length; i++) {
						_combCommand(lastCommand[i], command[i]);
					}
				} else {
					this.history.push(command);
				}
			} else if (_combCheck.call(this, lastCommand, command)) {
				_combCommand(lastCommand, command);
			} else {
				this.history.push(command);
			}
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
			if (
				(command.type == Util.HISTORY_COMMAND.DELETE || command.type == Util.HISTORY_COMMAND.INSERT) &&
				lastCommand &&
				lastCommand.type == command.type &&
				lastCommand.preCursorPos.line == command.cursorPos.line &&
				Date.now() - this.pushHistoryTime < 2000
			) {
				if (lastCommand.type == Util.HISTORY_COMMAND.DELETE) {
					if (Util.comparePos(lastCommand.cursorPos, command.preCursorPos) == 0) {
						return true;
					}
				}
				if (lastCommand.type == Util.HISTORY_COMMAND.INSERT) {
					if (Util.comparePos(lastCommand.cursorPos, command.preCursorPos) == 0 || Util.comparePos(lastCommand.cursorPos, command.cursorPos) == 0) {
						return true;
					}
				}
			}
		}

		// 检查两次操作是否可以合并
		function _combCommand(lastCommand, command) {
			if (lastCommand.type === Util.HISTORY_COMMAND.DELETE) {
				command.preCursorPos.column -= lastCommand.cursorPos.column - lastCommand.preCursorPos.column;
				lastCommand.preCursorPos = command.preCursorPos;
				lastCommand.cursorPos = command.cursorPos;
			} else {
				lastCommand.cursorPos = command.cursorPos;
				if (command.direct === 'right') {
					lastCommand.text = lastCommand.text + command.text;
				} else {
					lastCommand.text = command.text + lastCommand.text;
				}
			}
		}
	}
	// 更新历史记录
	updateHistory(command) {
		let index = this.history.index;
		if (command instanceof Array) {
			command.forEach((item, _index) => {
				item.direct = this.history[index - 1][_index].direct;
			});
		} else {
			command.direct = this.history[index - 1].direct;
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
	save() {
		this.savedIndex = this.history.index;
	}
	clear() {
		this.history.empty();
		this.history.index = 0;
		this.savedIndex = 0;
	}
}
