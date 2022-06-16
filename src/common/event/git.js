import Btree from '@/common/btree';
import EventBus from '@/event';
import globalData from '@/data/globalData';
import Util from '../util';
import Context from '@/module/context/index';

const fs = window.require('fs');
const path = window.require('path');
const child_process = window.require('child_process');
const SimpleGit = window.require('simple-git');
const contexts = Context.contexts;

export default class {
	constructor() {
		this.cwd = '';
		this.simpleGit = new SimpleGit();
		this.gitStatusTimer = {};
		this.gitDiffTimer = {};
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
				let fileObj = filePath && Util.getFileItemByPath(globalData.fileTree, filePath);
				if (tab && tab.active && fileObj && fs.existsSync(path.join(fileObj.rootPath, '.git'))) {
					this.diffProcess.send({ path: filePath, content: contexts[tab.id].getAllText() });
				}
			}, 500);
		});
		this.initDiffProcess();
	}
	initDiffProcess() {
		this.diffProcess = child_process.fork(path.join(globalData.dirname, 'main/process/git/diff.js'));
		this.diffProcess.on('message', data => {
			EventBus.$emit('git-diffed', { path: data.path, result: _parseDiff(data.result) });
		});
		this.diffProcess.on('close', () => {
			this.initDiffProcess();
		});

		function _parseDiff(data) {
			let result = [];
			while (data.length) {
				let item = data.shift();
				item.value = item.value.split('\n');
				if (item.removed) {
					if (data.length && data[0].added && data[0].line === item.line) {
						let next = data.shift();
						next.value = next.value.split('\n');
						if (item.value.peek() === '' && next.value.peek() === '') {
							item.value.pop();
							next.value.pop();
						}
						if (next.value.length == 1 && next.value.peek() === '') {
							next.value = [];
						}
						while (next.value.length && item.value[0] === next.value[0]) {
							item.value.shift();
							next.value.shift();
							next.line++;
							item.line++;
						}
						if (next.value.length) {
							result.push({
								type: 'M',
								line: item.line,
								deleted: item.value,
								added: next.value.slice(0, item.value.length),
							});
							if (next.length > item.length) {
								result.push({
									type: 'A',
									line: next.line,
									added: next.value.slice(item.value.length),
									deleted: [],
								});
							}
						} else {
							result.push({
								type: 'D',
								line: item.line,
								added: [],
								deleted: item.value,
							});
						}
					} else {
						!item.end && item.value.pop();
						result.push({
							type: 'D',
							line: item.line,
							added: [],
							deleted: item.value,
						});
					}
				} else {
					!item.end && item.value.pop();
					result.push({
						type: 'A',
						line: item.line,
						added: item.value,
						deleted: [],
					});
				}
			}
			return result;
		}
	}
	gitStatus(fileObj) {
		if (!fs.existsSync(path.join(fileObj.path, '.git'))) {
			return;
		}
		if (this.cwd != fileObj.path) {
			this.simpleGit.cwd(fileObj.path);
		}
		this.simpleGit.status().then(result => {
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
		});

		function _addPathMap(filePath, obj) {
			filePath = path.join(filePath);
			while (filePath.length > 1 && path.basename(filePath)) {
				obj[filePath] = true;
				filePath = path.dirname(filePath);
			}
		}
	}
}
