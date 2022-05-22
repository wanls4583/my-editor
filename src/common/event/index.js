import EventBus from '@/event';
import TerminalEvent from './terminal';
import EditorEvent from './editor';
import FileEvent from './file';

const remote = window.require('@electron/remote');

export default class {
	constructor() {
		this.init();
	}
	init() {
		EventBus.$on('reveal-in-file-explorer', path => {
			if (path) {
				remote.shell.showItemInFolder(path);
			}
		});
		this.terminalEvent = new TerminalEvent();
		this.editorEvent = new EditorEvent();
		this.fileEvent = new FileEvent();
	}
}
