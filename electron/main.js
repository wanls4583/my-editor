/*
 * @Author: lisong
 * @Date: 2022-03-09 09:58:18
 * @Description:
 */
const {
	BrowserWindow,
	Menu,
	app,
	protocol
} = require('electron');
const main = require('@electron/remote/main');
const path = require('path');
const Terminal = require('./main/terminal').Terminal;
const FileOp = require('./main/file').FileOp;
const wins = {};

let mainWin = null;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
	app.quit();
} else {
	app.on('second-instance', (event, commandLine, workingDirectory) => {
		// 当运行第二个实例时,将会聚焦到myWindow这个窗口
		if (mainWin) {
			if (mainWin.isMinimized()) {
				mainWin.restore();
			}
			mainWin.webContents.send('file-open-with', commandLine);
			mainWin.focus();
		}
	})
}

app.whenReady().then(() => {
	initProtocol();
	initEvent();
	main.initialize();
	Menu.setApplicationMenu(null); //屏蔽默认快捷键
	if (process.argv[2] === 'development') {
		mainWin = createWindow('main', 'http://localhost:8080/', 'remote');
	} else {
		mainWin = createWindow('main', 'render/index.html');
	}
	mainWin.terminal = new Terminal(mainWin.webContents);
	mainWin.fileOp = new FileOp(mainWin.webContents);
	mainWin.show();
}).catch(err => {
	console.log(err);
});

function createWindow(name, url, type, parent) {
	const win = new BrowserWindow({
		transparent: true,
		frame: false,
		show: false,
		parent: parent,
		webPreferences: {
			nodeIntegration: true,
			enableRemoteModule: true,
			contextIsolation: false,
		},
	});
	win.maximize(); //最大化
	main.enable(win.webContents);
	wins[name] = win;
	if (type === 'remote') {
		win.loadURL(url);
	} else {
		win.loadFile(url);
	}
	if (process.argv[2] === 'development') {
		win.webContents.openDevTools();
	}
	return win;
}

function initEvent() {
	app.on('window-all-closed', function() {
		if (process.platform !== 'darwin') app.quit();
	});
}

function initProtocol() {
	protocol.registerFileProtocol('my-file', (request, callback) => {
		const url = request.url.substr('my-file://'.length);
		callback(decodeURI(path.normalize(url)));
	});
}