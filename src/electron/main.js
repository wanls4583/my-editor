/*
 * @Author: lisong
 * @Date: 2022-03-09 09:58:18
 * @Description: 
 */
const {
    BrowserWindow,
    app,
    Menu
} = require('electron');

const main = require('@electron/remote/main');
const wins = {};

function createWindow(name, url, type) {
    const win = new BrowserWindow({
        frame: false,
        show: false,
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
    Menu.setApplicationMenu(null); //去掉默认菜单和快捷键
    initEvent();
    createWindow('', 'http://localhost:8080/#/home', 'remote').show();
})

function initEvent() {
    app.on('activate', function () {
        // if (BrowserWindow.getAllWindows().length === 0) createWindow()
    });
    app.on('window-all-closed', function () {
        if (process.platform !== 'darwin') app.quit()
    });
}