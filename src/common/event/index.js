import EventBus from '@/event';
import TerminalEvent from './terminal';
import EditorEvent from './editor';
import FileEvent from './file';
import ThemeEvent from './theme';

const remote = window.require('@electron/remote');

export default class {
	constructor() {
		this.init();
	}
	init() {
		this.terminalEvent = new TerminalEvent();
		this.editorEvent = new EditorEvent();
		this.fileEvent = new FileEvent();
		this.themeEvent = new ThemeEvent();
	}
}
