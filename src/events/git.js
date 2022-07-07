import EventBus from '@/event';
import globalData from '@/data/globalData';
import Util from '@/common/util';
import Context from '@/module/context/index';
import Ignore from 'ignore';

const child_process = window.require('child_process');
const path = window.require('path');
const fs = window.require('fs');
const contexts = Context.contexts;

export default class {
	constructor() {
		this.cwd = '';
		this.gitStatusTimer = {};
		this.gitStautsMap = {};
		this.gitDiffTimer = {};
		this.init();
		this.createStatusProcess();
	}
	init() {
		EventBus.$on('git-status-start', filePath => {
			this.watchFileStatus(filePath);
		});
		EventBus.$on('git-status-stop', filePath => {
			this.stopWatchFileStatus(filePath);
		});
		EventBus.$on('git-diff', filePath => {
			clearTimeout(this.gitDiffTimer[filePath]);
			this.gitDiffTimer[filePath] = setTimeout(() => {
				let tab = filePath && Util.getTabByPath(globalData.editorList, filePath);
				if (tab && tab.active && filePath) {
					this.parseDiff({
						filePath,
						text: contexts[tab.id].getAllText()
					});
				}
			}, 500);
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
	parseDiff({ filePath, text }) {
		clearTimeout(this.parseDiffTimer);
		clearTimeout(this.closeDiffTimer);
		this.parseDiffTimer = setTimeout(() => {
			if (this.diffProcess && this.parseDiffId) {
				this.diffProcess.kill();
				this.diffProcess = null;
			}
			if (this.parseDiffId || !this.diffProcess) {
				this.createDiffProcess();
			}
			_send.call(this);
		}, 500);

		function _send() {
			this.parseDiffId = Util.getUUID();
			this.diffProcess.send({
				text,
				filePath,
				parseDiffId: this.parseDiffId,
			});
		}
	}
	createDiffProcess() {
		this.diffProcess = child_process.fork(path.join(globalData.dirname, 'main/process/git/diff.js'));
		this.diffProcess.on('message', data => {
			if (data.parseDiffId === this.parseDiffId) {
				EventBus.$emit('git-diffed', { path: data.path, result: data.result });
				this.parseDiffId = '';
				// 30秒后，如果没有活动，则关闭子进程
				this.closeDiffTimer = setTimeout(() => {
					this.diffProcess && this.diffProcess.kill();
					this.diffProcess = null;
				}, 30000);
			}
		});
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
