import EventBus from '@/event';
import globalData from '@/data/globalData';
import Util from '../util';
import Context from '@/module/context/index';
import { diffLinesRaw } from 'jest-diff';

const spawnSync = window.require('child_process').spawnSync;
const spawn = window.require('child_process').spawn;
const path = window.require('path');
const SimpleGit = window.require('simple-git');
const contexts = Context.contexts;

export default class {
	constructor() {
		this.cwd = '';
		this.simpleGit = new SimpleGit();
		this.gitStatusTimer = {};
		this.gitDiffTimer = {};
		this.maxCacheSize = 100 * 10000 * 20;
		this.cacheIndexs = [];
		this.fileCacheMap = { size: 0 };
		this.init();
	}
	init() {
		EventBus.$on('git-status', fileObj => {
			clearTimeout(this.gitStatusTimer[fileObj.path]);
			this.gitStatusTimer[fileObj.path] = setTimeout(() => {
				this.gitStatus(fileObj);
			}, 500);
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
				if (preDiffObj && preDiffObj.type === 'A' && preDiffObj.line === line - 1) {
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
	gitStatus(fileObj) {
		if (this.cwd != fileObj.path) {
			this.simpleGit.cwd(fileObj.path);
		}
		this.simpleGit
			.status()
			.then(result => {
				let untracked = {};
				let added = {};
				let conflicted = {};
				let modified = {};
				let deleted = {};
				let renamed = {};
				if (result.not_added.length) {
					result.not_added.forEach(item => {
						_addPathMap(item, untracked);
					});
					untracked[''] = true;
				}
				if (result.created.length) {
					result.created.forEach(item => {
						_addPathMap(item, added);
					});
					added[''] = true;
				}
				if (result.conflicted.length) {
					result.conflicted.forEach(item => {
						_addPathMap(item, conflicted);
					});
					conflicted[''] = true;
				}
				if (result.modified.length) {
					result.modified.forEach(item => {
						_addPathMap(item, modified);
					});
					modified[''] = true;
				}
				if (result.renamed.length) {
					result.renamed.forEach(item => {
						_addPathMap(item, renamed);
					});
					renamed[''] = true;
				}
				if (result.deleted.length) {
					result.deleted.forEach(item => {
						_addPathMap(item, deleted);
					});
					deleted[''] = true;
				}
				globalData.fileStatus[fileObj.path] = {
					untracked: untracked,
					added: added,
					conflicted: conflicted,
					modified: modified,
					renamed: renamed,
					deleted: deleted,
				};
				EventBus.$emit('git-statused', fileObj);
			})
			.catch(e => {});

		function _addPathMap(filePath, obj) {
			filePath = path.join(filePath);
			filePath = path.relative(fileObj.path, filePath);
			while (filePath.length > 1 && path.basename(filePath)) {
				obj[filePath] = true;
				filePath = path.dirname(filePath);
			}
		}
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
