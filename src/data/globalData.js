import Scheduler from '../common/scheduler';
import Enum from './enum';
import Util from '../common/util';

const remote = window.require('@electron/remote');
const fs = window.require('fs');
const path = window.require('path');
const dirname = remote.app.getAppPath();
const homePath = remote.app.getPath('home');
const userPath = remote.app.getPath('userData');

const nowTheme = {
	value: 'Monokai',
	type: 'dark',
	path: path.join(dirname, 'main/extensions/theme-monokai/themes/monokai-color-theme.json')
};
const nowIconTheme = {
	value: 'material-icon-theme',
	path: path.join(dirname, 'main/extensions/theme-material-icon/dist/material-icons.json')
};
const views = {
	terminal: false,
	minimap: true,
	sidebar: true,
	statusbar: true
};
const skipSearchDirs = /[\\\/](node_modules|dist|\.git|\.vscode|\.idea|\.DS_Store)(?=[\\\/]|$)/;
const skipSearchFiles = /^npm-debug.log|^yarn-debug.log|^yarn-error.log|^pnpm-debug.log|\.suo|\.ntvs|\.njsproj|\.sln|\.sw/;
const defaultWordPattern = '(-?\\d*\\.\\d\\w*)|([^\\`\\~\\!\\@\\%\\^\\&\\*\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\\'\\"\\,\\.\\<\\>/\\?\\s]+)';
const fileTreePath = path.join(userPath, 'userData/file_tree.my');
const configPath = path.join(userPath, 'userData/config.my');
const cachePath = path.join(userPath, 'userData/cache');
const tabPath = path.join(userPath, 'userData/tab.my');
const terminalTabPath = path.join(userPath, 'userData/tab_terminal.my');
const shortcutPath = path.join(userPath, 'userData/shortcut.my');

const globalData = {
	scheduler: new Scheduler(),
	enum: Enum,
	dirname: dirname,
	homePath: homePath,
	configPath: configPath,
	fileTreePath: fileTreePath,
	cachePath: cachePath,
	tabPath: tabPath,
	terminalTabPath: terminalTabPath,
	shortcutPath: shortcutPath,
	skipSearchDirs: skipSearchDirs,
	skipSearchFiles: skipSearchFiles,
	defaultWordPattern: defaultWordPattern,
	nowTheme: nowTheme,
	nowIconTheme: nowIconTheme,
	multiKeyCode: 'ctrl',
	views: views,
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
	sourceConfigMap: {},
	sourceWordMap: {},
	fileTree: [],
	openedFileList: [],
	fileStatus: {},
	dirStatus: {},
	fileDiff: {},
	terminalList: [],
	editorList: [],
	nowEditorId: null,
	nowFileItem: null,
	$mainWin: null,
};

try {
	// 加载全局配置
	if (fs.existsSync(configPath)) {
		let data = Util.loadJsonFileSync(configPath);
		if (data.nowTheme && data.nowTheme.__proto__.constructor === Object) {
			globalData.nowTheme = data.nowTheme;
		}
		if (data.nowIconTheme && data.nowIconTheme.__proto__.constructor === Object) {
			globalData.nowIconTheme = data.nowIconTheme;
		}
		if (data.views && data.views.__proto__.constructor === Object) {
			globalData.views = data.views;
		}
		globalData.zoomLevel = Number(data.zoomLevel) || 0;
		globalData.multiKeyCode = data.multiKeyCode;
		globalData.multiKeyCode = globalData.multiKeyCode === 'ctrl' ? 'ctrl' : 'alt';
	}
} catch (e) {
	console.log(e);
}

export default globalData;