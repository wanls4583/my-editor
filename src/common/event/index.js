import EventBus from '@/event';
import TerminalEvent from './terminal';
import EditorEvent from './editor';
import FileEvent from './file';

const remote = window.require('@electron/remote');

export default class {
	constructor(win) {
		this.init(win);
	}
	init(win) {
		EventBus.$on('reveal-in-file-explorer', path => {
			if (path) {
				remote.shell.showItemInFolder(path);
			}
		});
		this.terminalEvent = new TerminalEvent(win);
		this.editorEvent = new EditorEvent(win);
		this.fileEvent = new FileEvent(win);
	}
}
