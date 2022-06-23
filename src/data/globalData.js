import Scheduler from '../common/scheduler';
import Enum from './enum';
import Util from '../common/util';

const remote = window.require('@electron/remote');
const fs = window.require('fs');
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
let zoomLevel = 0;
let configPath = path.join(remote.app.getPath('userData'), 'config.my');
if (fs.existsSync(configPath)) {
	try {
		// 加载全局配置
		let data = Util.loadJsonFileSync(configPath);
		Object.assign(nowTheme, data.nowTheme);
		Object.assign(nowIconTheme, data.nowIconTheme);
		zoomLevel = data.zoomLevel || 0;
	} catch (e) {
		console.log(e);
	}
}

export default {
	scheduler: new Scheduler(),
	enum: Enum,
	dirname: dirname,
	configPath: configPath,
	zoomLevel: zoomLevel,
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
