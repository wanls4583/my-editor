/*
 * @Author: lisong
 * @Date: 2022-03-09 09:58:18
 * @Description: 
 */
const {
    BrowserWindow,
    app,
    Menu,
} = require('electron');
const main = require('@electron/remote/main');
const wins = {};

let mainWin = null;

global.shareObject = {
    globalData: {
        contexts: {}
    }
}

function createWindow(name, url, type, parent) {
    const win = new BrowserWindow({
        frame: true,
        show: false,
        parent: parent,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
            contextIsolation: false
        }
    });
    win.maximize() //最大化
    main.enable(win.webContents);
    wins[name] = win;
    if (type === 'remote') {
        win.loadURL(url);
    } else {
        win.loadFile(url);
    }
    win.webContents.openDevTools();
    return win;
}
app.whenReady().then(() => {
    main.initialize();
    // Menu.setApplicationMenu(null); //去掉默认菜单和快捷键
    mainWin = createWindow('main', 'http://localhost:8080/', 'remote');
    mainWin.show();
    initEvent();
}).catch((err) => {
    console.log(err);
});

function initEvent() {
    app.on('activate', function () {
        // if (BrowserWindow.getAllWindows().length === 0) createWindow()
    });
    app.on('window-all-closed', function () {
        if (process.platform !== 'darwin') app.quit()
    });
}