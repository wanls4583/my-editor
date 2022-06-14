import Btree from '@/common/btree';
import EventBus from '@/event';
import globalData from '@/data/globalData';
import Util from '../util';

const fs = window.require('fs');
const path = window.require('path');
const spawn = window.require('child_process').spawn;
const SimpleGit = window.require('simple-git');

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
				this.gitDiff(filePath);
			}, 500);
		});
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
	gitDiff(filePath) {
		if (!fs.existsSync(filePath)) {
			return;
		}
		const stat = fs.statSync(filePath);
		const fileKey = Util.getIdFromStat(stat, true);
		if (stat.isDirectory()) {
			return;
		}
		if (globalData.fileDiff[fileKey]) {
			EventBus.$emit('git-diffed', filePath);
			return;
		}
		const iconv = window.require('iconv-lite');
		let line = 1;
		let result = '';
		let deletedCount = 0;
		let child = spawn('cmd', [`/C chcp 65001>nul && git diff ${path.basename(filePath)}`], { cwd: path.dirname(filePath) });
		child.stdout.on('data', data => {
			result += data;
			// result += iconv.decode(data, 'cp936');
		});
		child.on('close', () => {
			let fileDiffObj = new Btree((a, b) => {
				return a.line - b.line;
			});
			result = result.split(/\r\n|\n/);
			_diff.call(this, fileDiffObj);
			globalData.fileDiff[fileKey] = fileDiffObj;
			EventBus.$emit('git-diffed', filePath);
		});

		function _diff(fileDiffObj) {
			while (line <= result.length) {
				let text = result[line - 1];
				// 文件比较开始
				if (text.startsWith('diff --git')) {
					line += 4;
					_diffBlock.call(this, fileDiffObj);
					break;
				}
				line++;
			}
		}

		function _diffBlock(fileDiffObj) {
			while (line <= result.length) {
				let text = result[line - 1];
				// 区域比较开始
				if (text.startsWith('@@')) {
					let res = /\-(\d+)\,(\d+) \+(\d+)\,(\d+)/.exec(text);
					let startLine = res[3] - 0;
					line++;
					_diffLines.call(this, startLine, fileDiffObj);
				} else {
					break;
				}
			}
		}

		function _diffLines(startLine, fileDiffObj) {
			while (line <= result.length) {
				let range = { deleted: [], added: [], deletedCount: deletedCount };
				let text = result[line - 1];
				if (text[0] === '-') {
					range.line = startLine;
					range.deleted.push(text.slice(1));
					line++;
					deletedCount++;
					while (line <= result.length && result[line - 1][0] === '-') {
						range.deleted.push(result[line - 1].slice(1));
						line++;
						deletedCount++;
					}
					while (line <= result.length && result[line - 1][0] === '+') {
						range.added.push(result[line - 1].slice(1));
						line++;
						startLine++;
					}
					fileDiffObj.insert(range);
				} else if (text[0] === '+') {
					range.line = startLine;
					range.added.push(text.slice(1));
					line++;
					startLine++;
					while (line <= result.length && result[line - 1][0] === '+') {
						range.added.push(result[line - 1].slice(1));
						line++;
						startLine++;
					}
					fileDiffObj.insert(range);
				} else if (text[0] === ' ') {
					line++;
					startLine++;
				} else {
					break;
				}
			}
		}
	}
}
