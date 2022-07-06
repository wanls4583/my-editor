import TerminalEvent from './terminal';
import EditorEvent from './editor';
import FileEvent from './file';
import ThemeEvent from './theme';
import GitEvent from './git';

export default class {
	constructor() {
		this.init();
	}
	init() {
		this.terminalEvent = new TerminalEvent();
		this.editorEvent = new EditorEvent();
		this.fileEvent = new FileEvent();
		this.themeEvent = new ThemeEvent();
		this.gitEvent = new GitEvent();
	}
}
