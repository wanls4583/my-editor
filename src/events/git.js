import EventBus from '@/event';
import globalData from '@/data/globalData';
import Util from '@/common/util';
import Ignore from 'ignore';

const child_process = window.require('child_process');
const path = window.require('path');
const fs = window.require('fs');

export default class {
	constructor() {
		this.cwd = '';
		this.gitStatusTimer = {};
		this.gitStautsMap = {};
		this.gitDiffTimer = {};
		this.init();
		//避免启动是window-defender阻塞UI
		setTimeout(()=>{
			this.createStatusProcess();
		}, 2000);
	}
	init() {
		EventBus.$on('git-status-start', filePath => {
			this.watchFileStatus(filePath);
		});
		EventBus.$on('git-status-stop', filePath => {
			this.stopWatchFileStatus(filePath);
		});
		EventBus.$on('git-ignore', filePath => {
			this.parseGitIgnore(filePath);
		});
		EventBus.$on('window-close', () => {
			try {
				this.statusProcess && this.statusProcess.kill();
			} catch (e) { }
		});
	}
	parseGitIgnore(filePath) {
		try {
			if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
				Util.readFile(filePath).then(data => {
					let lines = data.split(/\r\n|\n/);
					lines = lines.filter(line => {
						return line && !/^\s*#/.test(line);
					});
					if (lines.length) {
						let ignore = Ignore();
						ignore.add(lines);
						EventBus.$emit('git-ignored', {
							path: filePath,
							ignore: ignore
						});
					}
				});
			}
		} catch (e) {
			console.log(e);
		}
	}
	createStatusProcess() {
		this.statusProcess = child_process.fork(path.join(globalData.dirname, 'main/process/git/status.js'));
		this.statusProcess.on('message', data => {
			this.parseStatus(data);
			data.paths.forEach(path => {
				EventBus.$emit('git-statused', { path });
			});
		});
		this.statusProcess.on('close', () => {
			this.createStatusProcess();
		});
	}
	watchFileStatus(filePath) {
		if (!this.statusProcess) {
			setTimeout(() => {
				this.watchFileStatus(filePath);
			}, 500);
			return;
		}
		this.statusProcess.send({
			type: 'start',
			path: filePath
		});
	}
	stopWatchFileStatus(filePath) {
		this.statusProcess.send({ type: 'stop', path: filePath });
		delete globalData.fileStatus[filePath];
	}
	parseStatus(data) {
		let gitDir = data.gitDir;
		let results = data.results;
		let statusMap = {};
		let dirStatus = [];
		globalData.fileStatus[gitDir] = statusMap;
		globalData.dirStatus[gitDir] = dirStatus;
		results.forEach(item => {
			let parentPath = path.dirname(item.path);
			statusMap[item.path] = item.status;
			while (parentPath.length >= gitDir.length) {
				if (statusMap[parentPath]) {
					let statusLevel1 = Util.getStatusLevel(item.status);
					let statusLevel2 = Util.getStatusLevel(statusMap[parentPath]);
					if (statusLevel1 > statusLevel2) {
						statusMap[parentPath] = item.status;
					}
				} else {
					statusMap[parentPath] = item.status;
				}
				parentPath = path.dirname(parentPath);
			}
			if (item.path[item.path.length - 1] === path.sep) {
				dirStatus.push({ path: item.path.slice(0, -1), status: item.status });
			}
		});
	}
}
