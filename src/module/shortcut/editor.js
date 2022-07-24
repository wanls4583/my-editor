/*
 * @Author: lisong
 * @Date: 2022-02-18 16:13:15
 * @Description:
 */
import Command from './default-shortcut';

export default class {
	constructor(editor, context) {
		this.editor = editor;
		this.context = context;
		this.commandObj = new Command();
		this.prevKey = '';
	}
	onKeydown(e) {
		let keys = [];
		let key = e.code;
		let command = '';
		if (e.altKey) {
			keys.push('alt');
		}
		if (e.ctrlKey) {
			keys.push('control');
		}
		if (e.shiftKey) {
			keys.push('shift');
		}
		if (keys.indexOf(key) == -1) {
			keys.push(key);
			key = keys.join('+');
			command = this.commandObj.findCommand(key);
			if (!command && this.prevKey) {
				command = this.commandObj.findCommand(this.prevKey + ' ' + key)
			}
			if (command) {
				this.commandObj.doComand(command);
				e.stopPropagation();
				e.preventDefault();
			} else {
				this.prevKey = key;
			}
		}
	}
}