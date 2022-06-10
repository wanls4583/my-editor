import Scheduler from '../common/scheduler';
import Enum from './enum';

const remote = window.require('@electron/remote');
const path = window.require('path');
const dirname = remote.app.getAppPath();

const skipSearchDirs = /[\\\/](node_modules|dist|\.git|\.vscode|\.idea|\.DS_Store)(?=[\\\/]|$)/;
const skipSearchFiles = /^npm-debug.log|^yarn-debug.log|^yarn-error.log|^pnpm-debug.log|\.suo|\.ntvs|\.njsproj|\.sln|\.sw/;
const defaultWordPattern = '(-?\\d*\\.\\d\\w*)|([^\\`\\~\\!\\@\\%\\^\\&\\*\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\\'\\"\\,\\.\\<\\>/\\?\\s]+)';
const nowTheme = {
	value: 'Monokai',
	type: 'dark',
	path: path.join(dirname, 'main/extensions/theme-monokai/themes/monokai-color-theme.json'),
};
const nowIconTheme = {
	value: 'material-icon-theme',
	path: path.join(dirname, 'main/extensions/theme-material-icon/dist/material-icons.json'),
};

const globalData = {
	scheduler: new Scheduler(),
	enum: Enum,
	dirname: dirname,
	zoomLevel: 0,
	scopeIdMap: {},
	scopeReg: null,
	colors: {},
	nowIconData: {},
	themes: [],
	iconThemes: [],
	languageList: [],
	scopeFileList: [],
	scopeTokenList: [],
	grammars: {},
	sourceWordMap: {},
	fileTree: [],
	fileStatus: {},
	fileDiff: {},
	terminalList: [],
	editorList: [],
	nowEditorId: null,
	nowFileItem: null,
	$mainWin: null,
	skipSearchDirs: skipSearchDirs,
	skipSearchFiles: skipSearchFiles,
	defaultWordPattern: defaultWordPattern,
	nowTheme: nowTheme,
	nowIconTheme: nowIconTheme,
};

export default globalData;
