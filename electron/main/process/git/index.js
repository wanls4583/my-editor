const spawn = require('child_process').spawn;
const fs = require('fs');
const path = require('path');

class StatusWatcher {
	constructor() {
		this.gitStatusTimer = {};
		this.gitStautsMap = {};
		this.gitDiffTimer = {};
		this.gitStatusQueue = [];
		this.pathList = [];
	}
	checkQueue() {
		if (this.gitStatusQueue.length > 0) {
			let filePath = this.gitStatusQueue.shift();
			this.gitStatus(filePath).then(results => {
				let cache = this.gitStautsMap[filePath];
				if (cache !== results && JSON.stringify(cache) !== JSON.stringify(results)) {
					this.gitStautsMap[filePath] = results;
					process.send({ path: filePath, results });
				}
				// 延迟执行时间，否则Microsoft-Defender将消耗大量CUP资源
				this.checkQueueTimer = setTimeout(() => {
					this.checkQueue();
				}, 500);
				clearTimeout(this.gitStatusTimer[filePath]);
				this.gitStatusTimer[filePath] = setTimeout(() => {
					this.addToQueue(filePath);
				}, 500);
			});
		} else {
			this.checkQueueTimer = null;
		}
	}
	addToQueue(filePath) {
		this.gitStatusQueue.push(filePath);
		if (!this.checkQueueTimer) {
			this.checkQueueTimer = setTimeout(() => {
				this.checkQueue();
			}, 500);
		}
	}
	gitStatus(filePath) {
		let stat = fs.statSync(filePath);
		let child = null;
		if (stat.isFile()) {
			child = spawn('git', ['status', '-s', path.basename(filePath)], { cwd: path.dirname(filePath) });
		} else {
			child = spawn('git', ['status', '-s'], { cwd: filePath });
		}
		return new Promise((resolve, reject) => {
			let result = '';
			child.stdout.on('data', data => {
				result += data;
			});
			child.stderr.on('data', () => {
				reject();
			});
			child.on('close', () => {
				resolve(this.parseStatus(result));
			});
		});
	}
	parseStatus(lines) {
		let results = [];
		lines = lines.split('\n');
		lines.forEach(line => {
			let status = /^([\s\S]{2})\s*([^\s]+)\s*$/.exec(line);
			if (status) {
				let file = status[2];
				file = path.join(file); //将'/'转换成对应平台的sep
				results.push({
					path: file,
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
		this.pathList.push(filePath);
		this.addToQueue(filePath);
	}
	stopWatchFileStatus(filePath) {
		let index = this.gitStatusQueue.indexOf(filePath);
		if (index > -1) {
			this.gitStatusQueue.splice(index, 1);
		}
		index = this.pathList.indexOf(filePath);
		if (index > -1) {
			this.pathList.splice(index, 1);
		}
		clearTimeout(this.gitStatusTimer[filePath]);
		delete this.gitStautsMap[filePath];
		let stat = fs.statSync(filePath);
		if (stat.isDirectory()) {
			this.pathList.forEach(item => {
				try {
					let stat = fs.statSync(item);
					if (stat.isDirectory() && item.startsWith(filePath)) {
						clearTimeout(this.gitStatusTimer[item]);
						delete this.gitStautsMap[item];
					}
				} catch (e) {
					console.log(e);
				}
			});
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
