const spawn = require('child_process').spawn;
const fs = require('fs');
const path = require('path');

class StatusWatcher {
	constructor() {
		this.gitDirMap = {};
		this.gitTimer = {};
	}
	gitStatus(gitDir) {
		clearTimeout(this.gitTimer[gitDir]);
		this.gitTimer[gitDir] = setTimeout(() => {
			let result = '';
			let child = null;
			if (process.platform === 'win32') {
				child = spawn('cmd', ['/C chcp 65001>nul && git status -s'], { cwd: gitDir });
			} else {
				child = spawn('git', ['status', '-s'], { cwd: gitDir });
			}
			new Promise((resolve, reject) => {
				child.stdout.on('data', data => {
					result += data;
				});
				child.stderr.on('data', () => {
					reject();
				});
				child.on('close', () => {
					resolve(this.parseStatus(gitDir, result));
				});
			}).then(results => {
				if (this.gitDirMap[gitDir]) {
					process.send({ gitDir: gitDir, paths: this.gitDirMap[gitDir].paths, results });
				}
			});
		}, 100);
	}
	parseStatus(gitDir, lines) {
		let results = [];
		lines = lines.split('\n');
		lines.forEach(line => {
			let status = /^([\s\S]{2})\s*([^\s]+)\s*$/.exec(line);
			if (status) {
				results.push({
					path: path.join(gitDir, status[2]),
					status: status[1],
				});
			}
		});
		return results;
	}
	watchFileStatus(filePath) {
		if (!fs.existsSync(filePath)) {
			return;
		}
		let gitDir = this.getGitDir(filePath);
		if (gitDir) {
			if (this.gitDirMap[gitDir]) {
				if (this.gitDirMap[gitDir].paths.indexOf(filePath) === -1) {
					this.gitDirMap[gitDir].paths.push(filePath);
				}
			} else {
				let watcher = fs.watch(gitDir, { recursive: true }, (event, filename) => {
					if (filename) {
						if (!filename.endsWith(path.join('.git/index.lock')) && !filename.endsWith('.git')) {
							this.gitStatus(gitDir, this.gitDirMap[gitDir].paths);
						}
					}
				});
				this.gitDirMap[gitDir] = { watcher: watcher, paths: [filePath] };
			}
		}
	}
	stopWatchFileStatus(filePath) {
		let gitDir = this.getGitDir(filePath);
		gitDir = gitDir && this.gitDirMap[gitDir];
		if (gitDir) {
			let index = gitDir.paths.indexOf(filePath);
			if (index > -1) {
				gitDir.paths.splice(index, 1);
				if (gitDir.paths.length === 0) {
					gitDir.watcher.close();
					delete this.gitDirMap[gitDir];
				}
			}
		}
	}
	getGitDir(filePath) {
		let minLen = 1;
		if (filePath[1] === ':') {
			minLen = 3;
		}
		while (filePath.length > minLen) {
			if (fs.existsSync(filePath, '.git')) {
				return filePath;
			}
			filePath = path.dirname(filePath);
		}
	}
}

const watcher = new StatusWatcher();

process.on('message', data => {
	let type = data.type;
	if (type === 'start') {
		watcher.watchFileStatus(data.path);
	} else if (type === 'stop') {
		watcher.stopWatchFileStatus(data.path);
	}
});
