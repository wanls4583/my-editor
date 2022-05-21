/*
 * @Author: lisong
 * @Date: 2022-03-09 09:58:18
 * @Description:
 */
const { BrowserWindow, app, protocol } = require('electron');
const main = require('@electron/remote/main');
const path = require('path');
const Terminal = require('./main/terminal').Terminal;
const wins = {};

let mainWin = null;

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

app.whenReady()
	.then(() => {
		initProtocol();
		main.initialize();
		if (process.argv[2] === 'development') {
			mainWin = createWindow('main', 'http://localhost:8080/', 'remote');
		} else {
			mainWin = createWindow('main', 'render/index.html');
		}
		mainWin.show();
		mainWin.terminal = new Terminal(mainWin.webContents);
		initEvent();
	})
	.catch(err => {
		console.log(err);
	});

function initEvent() {
	app.on('activate', function () {
		// if (BrowserWindow.getAllWindows().length === 0) createWindow()
	});
	app.on('window-all-closed', function () {
		if (process.platform !== 'darwin') app.quit();
	});
}

function initProtocol() {
	protocol.registerFileProtocol('my-file', (request, callback) => {
		const url = request.url.substr('my-file://'.length);
		callback(decodeURI(path.normalize(url)));
	});
}
