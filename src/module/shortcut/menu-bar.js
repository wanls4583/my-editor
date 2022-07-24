/*
 * @Author: lisong
 * @Date: 2022-02-18 16:13:15
 * @Description:
 */
import EventBus from '@/event';

export const menuBarKeyMap = {
	'Ctrl+K Ctrl+O': {
		command: 'openFolder'
	},
	'Ctrl+N': {
		command: 'newFile'
	},
	'Ctrl+O': {
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