/*
 * @Author: lisong
 * @Date: 2022-02-18 16:13:15
 * @Description:
 */
import EventBus from '@/event';

export const menuBarKeyMap = {
	'Ctrl+KeyK Ctrl+KeyO': {
		command: 'openFolder'
	},
	'Ctrl+KeyN': {
		command: 'newFile'
	},
	'Ctrl+KeyO': {
		command: 'openFile'
	},
}

export class MenuBarCommand {
	constructor() { }
	openFolder() {
		EventBus.$emit('folder-open');
	}
	newFile() {
		EventBus.$emit('file-open');
	}
	openFile() {
		EventBus.$emit('file-open', null, true);
	}
}