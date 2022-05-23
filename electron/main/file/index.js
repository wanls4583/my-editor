const { ipcMain } = require('electron');
const fs = require('fs');

class FileOp {
	constructor(contents) {
		this.contents = contents;
		this.initEvent();
	}
	initEvent() {
		ipcMain.on('file-copy', (e, filePaths) => {
			this.copyFileToClip(filePaths);
		});
		ipcMain.on('file-cut', (e, filePaths) => {
			this.cutFileToClip(filePaths);
		});
	}
	copyToClip(filePaths) {
		const clipboard = require('clipboard-files');
		filePaths = filePaths.filter(file => {
			return fs.existsSync(file);
		});
		clipboard.writeFiles(filePaths);
	}
	copyFileToClip(filePaths) {
		try {
			this.copyToClip();
			this.contents.send('file-copyed', filePaths);
		} catch (e) {
			this.contents.send('file-copy-fail', filePaths);
		}
	}
	cutFileToClip(filePaths) {
		try {
			this.copyToClip();
			this.contents.send('file-cuted', filePaths);
		} catch (e) {
			this.contents.send('file-cut-fail', filePaths);
		}
	}
}

module.exports = {
	FileOp: FileOp,
};
