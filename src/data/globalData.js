import Scheduler from '../common/scheduler';
import Enum from './enum';
import Util from '../common/util';

const remote = window.require('@electron/remote');
const fs = window.require('fs');
const path = window.require('path');
const dirname = remote.app.getAppPath();

const nowTheme = {
	value: 'Monokai',
	type: 'dark',
	path: path.join(dirname, 'main/extensions/theme-monokai/themes/monokai-color-theme.json')
};
const nowIconTheme = {
	value: 'material-icon-theme',
	path: path.join(dirname, 'main/extensions/theme-material-icon/dist/material-icons.json')
};
const prettierOptions = {
	arrowParens: 'always',
	bracketSameLine: false,
	bracketSpacing: false,
	embeddedLanguageFormatting: 'auto',
	htmlWhitespaceSensitivity: 'css',
	insertPragma: false,
	jsxSingleQuote: false,
	printWidth: 200,
	proseWrap: 'preserve',
	quoteProps: 'as-needed',
	requirePragma: false,
	semi: true,
	singleQuote: false,
	tabWidth: 4,
	trailingComma: 'none',
	useTabs: true,
	vueIndentScriptAndStyle: false
};
const prettierParsers = {
	xml: 'html',
	html: 'html',
	vue: 'vue',
	css: 'css',
	less: 'less',
	scss: 'scss',
	yaml: 'yaml',
	json: 'json',
	dart: 'babel',
	markdown: 'markdown',
	shellscript: 'babel',
	javascript: 'babel',
	javascriptreact: 'babel',
	typescript: 'typescript',
	typescriptreact: 'typescript',
	coffeescript: 'typescript'
};
const skipSearchDirs = /[\\\/](node_modules|dist|\.git|\.vscode|\.idea|\.DS_Store)(?=[\\\/]|$)/;
const skipSearchFiles = /^npm-debug.log|^yarn-debug.log|^yarn-error.log|^pnpm-debug.log|\.suo|\.ntvs|\.njsproj|\.sln|\.sw/;
const defaultWordPattern = '(-?\\d*\\.\\d\\w*)|([^\\`\\~\\!\\@\\%\\^\\&\\*\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\\'\\"\\,\\.\\<\\>/\\?\\s]+)';
const fileTreePath = path.join(remote.app.getPath('userData'), 'userData/file-tree.my');
const configPath = path.join(remote.app.getPath('userData'), 'userData/config.my');
const cachePath = path.join(remote.app.getPath('userData'), 'userData/cache');
const tabPath = path.join(remote.app.getPath('userData'), 'userData/tab.my');
let zoomLevel = 0;
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
	fileTreePath: fileTreePath,
	cachePath: cachePath,
	tabPath: tabPath,
	zoomLevel: zoomLevel,
	skipSearchDirs: skipSearchDirs,
	skipSearchFiles: skipSearchFiles,
	defaultWordPattern: defaultWordPattern,
	nowTheme: nowTheme,
	nowIconTheme: nowIconTheme,
	prettierOptions: prettierOptions,
	prettierParsers: prettierParsers,
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
	$mainWin: null
};
