import EventBus from '@/event';
import globalData from '@/data/globalData';
import Util from '../util';
import Context from '@/module/context/index';
import diffSequences from 'diff-sequences'
import Ignore from 'ignore';

const spawnSync = window.require('child_process').spawnSync;
const spawn = window.require('child_process').spawn;
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
		this.maxCacheSize = 100 * 10000 * 20;
		this.cacheIndexs = [];
		this.fileCacheMap = { size: 0 };
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
					this.getDiff(
						filePath,
						contexts[tab.id].htmls.map(item => {
							return item.text;
						})
					);
				}
			}, 500);
		});
		EventBus.$on('git-ignore', filePath => {
			this.parseGitIgnore(filePath);
		});
		EventBus.$on('window-close', () => {
			this.statusProcess && this.statusProcess.kill();
		});
	}
	getDiff(filePath, textArr) {
		let nowCommit = this.getNowHash(filePath);
		let fileIndex = nowCommit + '-' + this.getCacheHash(filePath);
		let stagedContent = this.fileCacheMap[fileIndex];
		if (!nowCommit) {
			return;
		}
		if (this.getIgnore(filePath)) {
			return;
		}
		if (!stagedContent) {
			this.getStagedContent(filePath).then(stagedContent => {
				this.cacheFile(fileIndex, stagedContent);
				_diff.call(this, stagedContent);
			});
		} else {
			_diff.call(this, stagedContent);
		}

		function _diff(text) {
			let diffs = this.diff(text.split('\n'), textArr);
			EventBus.$emit('git-diffed', { path: filePath, result: this.parseDiff(diffs) });
		}
	}
	diff(a, b) {
		let aIndex = 0;
		let bIndex = 0;
		const diffObjs = [];
		const isCommon = (aIndex, bIndex) => a[aIndex] === b[bIndex];
		const foundSubsequence = (nCommon, aCommon, bCommon) => {
			if (aIndex !== aCommon) {
				diffObjs.push({
					type: 'D',
					line: bIndex + 1,
					added: [],
					deleted: a.slice(aIndex, aCommon)
				})
			}
			if (bIndex !== bCommon) {
				diffObjs.push({
					type: 'A',
					line: bIndex + 1,
					added: b.slice(bIndex, bCommon),
					deleted: []
				})
			}
			aIndex = aCommon + nCommon;
			bIndex = bCommon + nCommon;
		};
		diffSequences(a.length, b.length, isCommon, foundSubsequence);
		if (aIndex !== a.length) {
			diffObjs.push({
				type: 'D',
				line: bIndex + 1,
				added: [],
				deleted: a.slice(aIndex)
			})
		}
		if (bIndex !== b.length) {
			diffObjs.push({
				type: 'A',
				line: bIndex + 1,
				added: b.slice(bIndex),
				deleted: []
			})
		}
		return diffObjs;
	}
	parseDiff(diffObjs) {
		let results = [];
		for (let i = 0; i < diffObjs.length; i++) {
			let item = diffObjs[i];
			let nextItem = diffObjs[i + 1];
			if (item.type === 'D' && nextItem && nextItem.type === 'A' && nextItem.line === item.line) {
				if (item.deleted.length === nextItem.added.length) {
					results.push({
						type: 'M',
						line: item.line,
						added: nextItem.added,
						deleted: item.deleted
					});
				} else if (item.deleted.length > nextItem.added.length) {
					results.push({
						type: 'M',
						line: item.line,
						added: nextItem.added,
						deleted: item.deleted.slice(0, nextItem.added.length)
					});
					results.push({
						type: 'D',
						line: item.line + nextItem.added.length,
						added: [],
						deleted: item.deleted.slice(nextItem.added.length)
					});
				} else {
					results.push({
						type: 'M',
						line: item.line,
						added: nextItem.added.slice(0, item.deleted.length),
						deleted: item.deleted
					});
					results.push({
						type: 'A',
						line: item.line + item.deleted.length,
						added: nextItem.added.slice(item.deleted.length),
						deleted: []
					});
				}
				i++;
			} else {
				results.push(item);
			}
		}
		return results;
	}
	cacheFile(fileIndex, stagedContent) {
		if (this.fileCacheMap.size + stagedContent.length > this.maxCacheSize) {
			let max = this.maxCacheSize - stagedContent.length;
			while (this.cacheIndexs.length && this.fileCacheMap.size > max) {
				let index = this.cacheIndexs.shift();
				this.fileCacheMap.size -= this.fileCacheMap[index];
				delete this.fileCacheMap[index];
			}
		}
		this.fileCacheMap[fileIndex] = stagedContent;
		this.fileCacheMap.size += stagedContent.length;
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
		this.statusProcess = child_process.fork(path.join(globalData.dirname, 'main/process/git/index.js'));
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
		let statusLevel = { '?': 1, A: 2, M: 3, D: 4 };
		globalData.fileStatus[gitDir] = statusMap;
		globalData.dirStatus[gitDir] = dirStatus;
		results.forEach(item => {
			let parentPath = path.dirname(item.path);
			statusMap[item.path] = item.status;
			while (parentPath.length >= gitDir.length) {
				if (statusMap[parentPath]) {
					if (statusLevel[item.status] > statusLevel[statusMap[parentPath]]) {
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
	getNowHash(filePath, cwd) {
		return spawnSync('git', ['log', '-1', '--format=%H'], { cwd: cwd || path.dirname(filePath) }).stdout.toString();
	}
	getCacheHash(filePath) {
		let fileIndex = '';
		try {
			fileIndex = spawnSync('git', ['diff-index', 'HEAD', '--cached', filePath], { cwd: path.dirname(filePath) });
			fileIndex = fileIndex.stdout.toString() || filePath;
		} catch (e) {
			console.log(e);
		}
		return fileIndex;
	}
	getIgnore(filePath) {
		let ignoreed = false;
		try {
			ignoreed = spawnSync('git', ['check-ignore', filePath], { cwd: path.dirname(filePath) });
			ignoreed = ignoreed.stdout.toString();
		} catch (e) {
			console.log(e);
		}
		return ignoreed;
	}
	getStagedContent(filePath) {
		let child = null;
		if (process.platform === 'win32') {
			child = spawn('cmd', [`/C chcp 65001>nul && git show :./${path.basename(filePath)}`], { cwd: path.dirname(filePath) });
		} else {
			child = spawn('git', ['show', `:./${path.basename(filePath)}`], { cwd: path.dirname(filePath) });
		}
		return new Promise(resolve => {
			let result = '';
			child.stdout.on('data', data => {
				result += data;
			});
			child.on('close', () => {
				resolve(result);
			});
		});
	}
}
