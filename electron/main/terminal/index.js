const { ipcMain } = require('electron');
const os = require('os');
const pty = require('node-pty');
const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

class Terminal {
	constructor(contents) {
		this.contents = contents;
		this.terminals = {};
		this.initEvent();
	}
	initEvent() {
		ipcMain.on('terminal-write', (e, data) => {
			if (this.terminals[data.id]) {
				this.terminals[data.id].write(data.text);
			}
		});
		ipcMain.on('terminal-resize', (e, data) => {
			if (this.terminals[data.id]) {
				this.terminals[data.id].resize(data.cols, data.rows);
			}
		});
		ipcMain.on('terminal-add', (e, data) => {
			this.addTerminal(data);
		});
		ipcMain.on('terminal-destroy', (e, data) => {
			if (this.terminals[data.id]) {
				this.terminals[data.id].kill();
				this.terminals[data.id] = undefined;
			}
		});
	}
	addTerminal(option) {
		option = Object.assign({}, option);
		this.terminals[option.id] = pty.spawn(shell, [], {
			name: 'xterm-' + option.id,
			cols: option.cols || 100,
			rows: option.rows || 10,
			cwd: option.cwd || process.env.HOME,
			env: { ...process.env, LANG: "zh_CN.UTF-8" }, // 生产环境LANG可能为空，导致乱码
		});
		this.terminals[option.id].setEncoding('utf8');
		this.terminals[option.id].onData(data => {
			this.contents.send('terminal-data', {
				id: option.id,
				text: data,
			});
		});
	}
}

module.exports = {
	Terminal: Terminal,
};
