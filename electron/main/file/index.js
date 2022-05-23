const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

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
		ipcMain.on('file-paste', (e, destPath) => {
			this.pasteFile(destPath);
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
			this.copyToClip(filePaths);
			this.contents.send('file-copyed', filePaths);
		} catch (e) {
			this.contents.send('file-copy-fail', filePaths);
		}
	}
	cutFileToClip(filePaths) {
		try {
			this.copyToClip(filePaths);
			this.contents.send('file-cuted', filePaths);
		} catch (e) {
			this.contents.send('file-cut-fail', filePaths);
		}
	}
	pasteFile(destPath) {
		const clipboard = require('clipboard-files');
		const fse = require('fs-extra');
		if (!fs.existsSync(destPath)) {
			console.log(`dir "${destPath}" not exsit`);
			this.contents.send('file-paste-fail', destPath);
			return;
		}
		try {
			const filePaths = clipboard.readFiles();
			filePaths.forEach(filePath => {
				if (fs.existsSync(filePath)) {
					let target = path.join(destPath, path.basename(filePath));
					fse.copy(filePath, target)
						.then(() => {
							this.contents.send('file-pasted', filePath);
						})
						.catch(() => {
							console.log(`copy "${filePath}" to "${target}" fail`);
						});
				}
			});
		} catch (e) {
			this.contents.send('file-paste-fail', destPath);
			console.log(`copy to "${destPath}" fail`);
		}
	}
}

module.exports = {
	FileOp: FileOp,
};
