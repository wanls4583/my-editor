import Scheduler from '../common/scheduler';
import Enum from './enum';
import Util from '../common/util';

const App = nw.App;
const fs = window.require('fs');
const path = window.require('path');
const dirname = App.startPath;
const userPath = App.dataPath;
const homePath =
	process.env.HOME ||
	process.env.HOMEDRIVE &&
	process.env.HOMEPATH &&
	path.join(process.env.HOMEDRIVE, process.env.HOMEPATH)
	|| userPath;


const nowTheme = {
	value: 'Monokai',
	type: 'dark',
	path: path.join(dirname, 'main/extensions/theme-monokai/themes/monokai-color-theme.json')
};
const nowIconTheme = {
	value: 'material-icon-theme',
	path: path.join(dirname, 'main/extensions/theme-material-icon/dist/material-icons.json')
};
const views = { terminal: false, minimap: true, sidebar: true, statusbar: true };
const skipSearchDirs = /[\\\/](node_modules|dist|\.git|\.vscode|\.idea|\.DS_Store)(?=[\\\/]|$)/;
const skipSearchFiles = /^npm-debug.log|^yarn-debug.log|^yarn-error.log|^pnpm-debug.log|\.suo|\.ntvs|\.njsproj|\.sln|\.sw/;
const defaultWordPattern = '(-?\\d*\\.\\d\\w*)|([^\\`\\~\\!\\@\\%\\^\\&\\*\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\\'\\"\\,\\.\\<\\>/\\?\\s]+)';
const fileTreePath = path.join(userPath, 'userData/file_tree.my');
const configPath = path.join(userPath, 'userData/config.my');
const cachePath = path.join(userPath, 'userData/cache');
const tabPath = path.join(userPath, 'userData/tab.my');
const terminalTabPath = path.join(userPath, 'userData/tab_terminal.my');

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
	skipSearchDirs: skipSearchDirs,
	skipSearchFiles: skipSearchFiles,
	defaultWordPattern: defaultWordPattern,
	nowTheme: nowTheme,
	nowIconTheme: nowIconTheme,
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

if (fs.existsSync(configPath)) {
	try {
		// 加载全局配置
		let data = Util.loadJsonFileSync(configPath);
		Object.assign(globalData.nowTheme, data.nowTheme);
		Object.assign(globalData.nowIconTheme, data.nowIconTheme);
		Object.assign(globalData.views, data.views);
		globalData.zoomLevel = data.zoomLevel || 0;
	} catch (e) {
		console.log(e);
	}
}

export default globalData;