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
		ipcMain.on('file-paste', (e, destPath, move) => {
			this.paste(destPath, move);
		});
		ipcMain.on('file-rename', (e, filePath, newName) => {
			this.rename(filePath, newName);
		});
		ipcMain.on('file-create', (e, filePath) => {
			this.createFile(filePath);
		});
		ipcMain.on('folder-create', (e, filePath) => {
			this.createFolder(filePath);
		});
		ipcMain.on('file-delete', (e, filePath) => {
			this.delete(filePath);
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
	paste(destPath, cutPath) {
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
					let copy = cutPath === filePath ? fse.move : fse.copy;
					copy(filePath, target)
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
	rename(filePath, newName) {
		let target = path.join(path.dirname(filePath), newName);
		fs.rename(filePath, target, err => {
			if (err) throw err;
			this.contents.send('file-renamed', filePath, newName);
		});
	}
	createFile(filePath) {
		const fse = require('fs-extra');
		fse.ensureFile(filePath)
			.then(() => {
				this.contents.send('file-created', filePath);
			})
			.catch(() => {
				this.contents.send('file-create-fail', filePath);
				console.error(err);
			});
	}
	createFolder(filePath) {
		const fse = require('fs-extra');
		fse.ensureDir(filePath)
			.then(() => {
				this.contents.send('folder-created', filePath);
			})
			.catch(() => {
				this.contents.send('folder-create-fail', filePath);
				console.error(err);
			});
	}
	delete(filePath) {
		const fse = require('fs-extra');
		fse.remove(filePath)
			.then(() => {
				this.contents.send('file-deleted', filePath);
			})
			.catch(err => {
				this.contents.send('file-delete-fail', filePath);
				console.error(err);
			});
	}
}

module.exports = {
	FileOp: FileOp,
};
