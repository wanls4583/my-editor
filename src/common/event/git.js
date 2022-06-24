import EventBus from '@/event';
import globalData from '@/data/globalData';
import Util from '../util';
import Context from '@/module/context/index';
import { diffLinesRaw } from 'jest-diff';

const spawnSync = window.require('child_process').spawnSync;
const spawn = window.require('child_process').spawn;
const fs = window.require('fs');
const path = window.require('path');
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
	}
	init() {
		EventBus.$on('git-status-loop', filePath => {
			clearTimeout(this.gitStatusTimer[filePath]);
			this.gitStatus(filePath).then(results => {
				let cache = this.gitStautsMap[filePath];
				if (cache !== results && Util.diffObj(cache, results)) {
					EventBus.$emit('git-statused', {
						path: filePath,
						results: results,
					});
					this.gitStautsMap[filePath] = results;
				}
			});
			this.gitStatusTimer[filePath] = setTimeout(() => {
				EventBus.$emit('git-status-loop', filePath);
			}, 1000);
		});
		EventBus.$on('git-status-stop', filePath => {
			clearTimeout(this.gitStatusTimer[filePath]);
			delete this.gitStautsMap[filePath];
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
	}
	getDiff(filePath, textArr) {
		let nowCommit = this.getNowHash(filePath);
		let fileIndex = nowCommit + '-' + this.getCacheHash(filePath);
		let stagedContent = this.fileCacheMap[fileIndex];
		if (!nowCommit) {
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
			let diffs = diffLinesRaw(text.split('\n'), textArr);
			EventBus.$emit('git-diffed', { path: filePath, result: this.parseDiff(diffs) });
		}
	}
	parseDiff(diffs) {
		let results = [];
		let diffObjs = [];
		let preDiffObj = null;
		let line = 1;
		for (let i = 0; i < diffs.length; i++) {
			let item = diffs[i];
			if (item[0] === 0) {
				//common
				line++;
				preDiffObj = null;
			} else if (item[0] === -1) {
				//delete
				if (preDiffObj && preDiffObj.type === 'D' && preDiffObj.line === line) {
					preDiffObj.deleted.push(item[1]);
				} else {
					preDiffObj = {
						type: 'D',
						line: line,
						added: [],
						deleted: [item[1]],
					};
					diffObjs.push(preDiffObj);
				}
			} else if (item[0] === 1) {
				//add
				if (preDiffObj && preDiffObj.type === 'A' && preDiffObj.line + preDiffObj.added.length === line) {
					preDiffObj.added.push(item[1]);
				} else {
					preDiffObj = {
						type: 'A',
						line: line,
						added: [item[1]],
						deleted: [],
					};
					diffObjs.push(preDiffObj);
				}
				line++;
			}
		}
		for (let i = 0; i < diffObjs.length; i++) {
			let item = diffObjs[i];
			let nextItem = diffObjs[i + 1];
			if (item.type === 'D' && nextItem && nextItem.type === 'A' && nextItem.line === item.line) {
				if (item.deleted.length === nextItem.added.length) {
					results.push({
						type: 'M',
						line: item.line,
						added: nextItem.added,
						deleted: item.deleted,
					});
				} else if (item.deleted.length > nextItem.added.length) {
					results.push({
						type: 'M',
						line: item.line,
						added: nextItem.added,
						deleted: item.deleted.slice(0, nextItem.added.length),
					});
					results.push({
						type: 'D',
						line: item.line + nextItem.added.length,
						added: [],
						deleted: item.deleted.slice(nextItem.added.length),
					});
				} else {
					results.push({
						type: 'M',
						line: item.line,
						added: nextItem.added.slice(0, item.deleted.length),
						deleted: item.deleted,
					});
					results.push({
						type: 'A',
						line: item.line + item.deleted.length,
						added: nextItem.added.slice(item.deleted.length),
						deleted: [],
					});
				}
				i++;
			} else {
				results.push(item);
			}
		}
		return results;
	}
	gitStatus(filePath) {
		let stat = fs.statSync(filePath);
		let child = null;
		if (stat.isFile()) {
			child = spawn('git', ['status', '-s', path.basename(filePath)], { cwd: path.dirname(filePath) });
		} else {
			child = spawn('git', ['status', '-s'], { cwd: filePath });
		}
		return new Promise(resolve => {
			let result = '';
			child.stdout.on('data', data => {
				result += data;
			});
			child.on('close', () => {
				resolve(this.parseStatus(result, filePath, stat));
			});
		});
	}
	parseStatus(lines, filePath, stat) {
		let results = [];
		let statusMap = {};
		let statusLevel = { A: 1, M: 2, D: 3 };
		lines = lines.split('\n');
		lines.forEach(line => {
			let status = /^([\s\S]{2})\s*([^\s]+)\s*$/.exec(line);
			if (status) {
				let file = status[2];
				file = path.join(file); //将'/'转换成对应平台的sep
				status = status[1];
				results.push({
					path: file,
					status: status,
				});
			}
		});
		if (stat.isFile()) {
			if (results.length) {
				globalData.fileStatus[filePath] = results[0].status;
			} else {
				delete globalData.fileStatus[filePath];
			}
		} else {
			globalData.fileStatus[filePath] = statusMap;
			results.forEach(item => {
				let parentPath = path.dirname(item.path);
				statusMap[item.path] = item.status;
				while (parentPath !== '.') {
					if (statusMap[parentPath]) {
						if (statusLevel[item.status] > statusLevel[statusMap[parentPath]]) {
							statusMap[parentPath] = item.status;
						}
					} else {
						statusMap[parentPath] = item.status;
					}
					parentPath = path.dirname(parentPath);
				}
				if (statusLevel[item.status] > statusLevel[''] || !statusLevel['']) {
					statusMap[''] = item.status;
				}
			});
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
	getNowHash(filePath) {
		return spawnSync('git', ['log', '-1', '--format=%H'], { cwd: path.dirname(filePath) }).stdout.toString();
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
