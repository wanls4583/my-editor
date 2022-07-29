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
			case Util.HISTORY_COMMAND.TAB_TO_SPACE:
				this.context.convertTabToSpace(command);
				break;
			case Util.HISTORY_COMMAND.SPACE_TO_TAB:
				this.context.convertSpaceToTab(command);
				break;
		}
	}
	// 添加历史记录
	pushHistory(commandList) {
		while (this.history.length > this.history.index) {
			this.history.pop();
		}
		let lastCommands = this.history[this.history.index - 1];
		commandList = this.sortComand(commandList);
		if (!commandList.length) {
			return;
		}
		if (
			lastCommands &&
			lastCommands.historyJoinAble &&
			commandList.historyJoinAble &&
			commandList.length === lastCommands.length &&
			Date.now() - this.pushHistoryTime < 2000 &&
			_combCheck.call(this, lastCommands[0], commandList[0])
		) {
			for (let i = 0; i < lastCommands.length; i++) {
				_combCommand(lastCommands[i], commandList[i]);
			}
			lastCommands.afterCursorPosList = commandList.afterCursorPosList;
		} else {
			this.history.push(commandList);
		}
		this.history.index = this.history.length;
		this.pushHistoryTime = Date.now();

		// 检测是否为连续插入或连续删除
		function _combCheck(lastCommand, command) {
			if (
				lastCommand.type === command.type &&
				lastCommand.preCursorPos &&
				lastCommand.preCursorPos.line === command.cursorPos.line
			) {
				if (lastCommand.type == Util.HISTORY_COMMAND.DELETE) {
					if (Util.comparePos(lastCommand.cursorPos, command.preCursorPos) === 0) {
						return true;
					}
				} else if (lastCommand.type == Util.HISTORY_COMMAND.INSERT) {
					if (lastCommand.delDirect === command.delDirect) {
						if (Util.comparePos(lastCommand.cursorPos, command.preCursorPos) === 0 ||
							Util.comparePos(lastCommand.cursorPos, command.cursorPos) === 0) {
							return true;
						}
					}
				}
			}
		}

		// 合并两次操作
		function _combCommand(lastCommand, command) {
			if (lastCommand.type === Util.HISTORY_COMMAND.DELETE) {
				command.preCursorPos.column -=  lastCommand.cursorPos.column - lastCommand.preCursorPos.column;
				lastCommand.preCursorPos = command.preCursorPos;
				lastCommand.cursorPos = command.cursorPos;
			} else {
				lastCommand.cursorPos = command.cursorPos;
				if (command.delDirect === 'right') {
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
				item.delDirect = this.history[index - 1][_index].delDirect;
			});
		} else {
			command.delDirect = this.history[index - 1].delDirect;
		}
		this.history[index - 1] = this.sortComand(command);
	}
	sortComand(command) {
		command.sort((a, b) => {
			a = a.cursorPos;
			b = b.cursorPos;
			if (a.line === b.line) {
				return a.column - b.column;
			}
			return a.line - b.line;
		});
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
