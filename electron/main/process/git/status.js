const spawn = require('child_process').spawn;
const fs = require('fs');
const path = require('path');

const regs = {
	indexLock: /^\.git$|^\.git[\\\/]index\.lock$|^\.git[\\\/]modules[\\\/]/
}

class StatusWatcher {
	constructor() {
		this.gitDirMap = {};
		this.gitChache = {};
		this.gitTimer = {};
	}
	gitStatus(gitDir) {
		clearTimeout(this.gitTimer[gitDir]);
		this.gitTimer[gitDir] = setTimeout(() => {
			let result = '';
			let child = null;
			// if (process.platform === 'win32') {
			// 	child = spawn('cmd', ['/C chcp 65001>nul && git status -s'], { cwd: gitDir });
			// } else {
			// 	child = spawn('git', ['status', '-s'], { cwd: gitDir });
			// }
			child = spawn('git', ['status', '-s'], { cwd: gitDir });
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
					let cache = this.gitChache[gitDir];
					if (JSON.stringify(cache) !== JSON.stringify(results)) {
						process.send({ gitDir: gitDir, paths: this.gitDirMap[gitDir].paths, results });
						this.gitChache[gitDir] = results;
					}
				}
			});
		}, 100);
	}
	parseStatus(gitDir, lines) {
		let results = [];
		lines = lines.split('\n');
		lines.forEach(line => {
			if (line.length > 3) {
				let status = line[0] + line[1];
				let filePath = /[^\s]+$/.exec(line);
				filePath = filePath && filePath[0];
				if (filePath) {
					results.push({
						path: path.join(gitDir, filePath),
						status: status,
					});
				}
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
						if (!regs.indexLock.test(filename)) {
							this.gitStatus(gitDir, this.gitDirMap[gitDir].paths);
						}
					}
				});
				this.gitDirMap[gitDir] = { watcher: watcher, paths: [filePath] };
				this.gitChache[gitDir] = [];
				this.gitStatus(gitDir, this.gitDirMap[gitDir].paths);
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
					delete this.gitChache[gitDir];
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
			if (fs.existsSync(path.join(filePath, '.git'))) {
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
