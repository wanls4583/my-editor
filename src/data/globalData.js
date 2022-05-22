const require = window.require || window.parent.require || function () {};
const remote = require('@electron/remote');
const path = require('path');
const dirname = remote.app.getAppPath();

const globalData = {
	dirname: dirname,
	scopeIdMap: {},
	scopeReg: null,
	colors: {},
	nowTheme: {
		value: 'Monokai',
		type: 'dark',
		path: path.join(dirname, 'main/extensions/theme-monokai/themes/monokai-color-theme.json'),
	},
	// nowIconTheme: {
	//     value: 'vs-seti',
	//     path: path.join(dirname, 'main/extensions/theme-seti/icons/vs-seti-icon-theme.json'),
	// },
	nowIconTheme: {
		value: 'material-icon-theme',
		path: path.join(dirname, 'main/extensions/theme-material-icon/dist/material-icons.json'),
	},
	nowIconData: {},
	themes: [],
	iconThemes: [],
	languageList: [],
	scopeFileList: [],
	scopeTokenList: [],
	grammars: {},
	sourceWordMap: {},
	defaultWordPattern: '(-?\\d*\\.\\d\\w*)|([^\\`\\~\\!\\@\\%\\^\\&\\*\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\\'\\"\\,\\.\\<\\>/\\?\\s]+)',
	fileTree: [],
	skipSearchDirs: /[\\\/](node_modules|dist|\.git|\.vscode|\.idea|\.DS_Store)(?=[\\\/]|$)/,
	skipSearchFiles: /^npm-debug.log|^yarn-debug.log|^yarn-error.log|^pnpm-debug.log|\.suo|\.ntvs|\.njsproj|\.sln|\.sw/,
	terminalList: [],
	editorList: [],
	nowFileItem: null,
	$mainWin: null,
};

export default globalData;
