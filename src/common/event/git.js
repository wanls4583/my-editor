import EventBus from '@/event';
import globalData from '@/data/globalData';

const fs = window.require('fs');
const path = window.require('path');
const spawn = window.require('child_process').spawn;
const SimpleGit = window.require('simple-git');

export default class {
	constructor() {
		this.cwd = '';
		this.simpleGit = new SimpleGit();
		this.gitTimerMap = {};
		this.init();
	}
	init() {
		EventBus.$on('git-status', fileObj => {
			this.gitStatus(fileObj);
		});
		EventBus.$on('git-diff', fileObj => {
			this.gitDiff(fileObj);
		});
	}
	gitStatus(fileObj) {
		if (!fs.existsSync(path.join(fileObj.path, '.git'))) {
			return;
		}
		this.gitTimerMap[fileObj.path] = setTimeout(() => {
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
		}, 500);

		function _addPathMap(filePath, obj) {
			filePath = path.join(filePath);
			while (filePath.length > 1 && path.basename(filePath)) {
				obj[filePath] = true;
				filePath = path.dirname(filePath);
			}
		}
	}
	gitDiff(fileObj) {
		if (!fs.existsSync(path.join(fileObj.rootPath, '.git'))) {
			return;
		}
		const iconv = window.require('iconv-lite');
		let line = 1;
		let result = '';
		let child = spawn('git', ['diff', fileObj.path], { cwd: fileObj.rootPath });
		child.stdout.on('data', data => {
			result += iconv.decode(data, 'cp936');
		});
		child.on('close', () => {
			let fileDiffObjs = [];
			result = result.split(/\r\n|\n/);
			_diff.call(this, fileDiffObjs);
			console.log(fileDiffObjs);
		});

		function _diff(fileDiffObjs) {
			while (line <= result.length) {
				let text = result[line - 1];
				let relativePath = '';
				// 文件比较开始
				if (text.startsWith('diff --git')) {
					let fileDiffObj = { path: '', ranges: [] };
					line += 3;
					text = result[line - 1];
					relativePath = text.slice('+++ b/'.length).trimEnd();
					fileDiffObj.path = path.join(fileObj.rootPath, relativePath);
					line++;
					_diffBlock.call(this, fileDiffObj.ranges);
					fileDiffObjs.push(fileDiffObj);
				} else {
					break;
				}
			}
		}

		function _diffBlock(ranges) {
			while (line <= result.length) {
				let text = result[line - 1];
				// 区域比较开始
				if (text.startsWith('@@')) {
					let res = /\-(\d+)\,(\d+) \+(\d+)\,(\d+)/.exec(text);
					let startLine = res[1] - 0;
					line++;
					_diffLines.call(this, startLine, ranges);
				} else {
					break;
				}
			}
		}

		function _diffLines(startLine, ranges) {
			let delTexts = [];
			let addTexts = [];
			while (line <= result.length) {
				let range = {};
				let text = result[line - 1];
				if (text[0] === '-') {
					range.line = startLine;
					delTexts.push(text.slice(1));
					line++;
					startLine++;
					while (line <= result.length && result[line - 1][0] === '-') {
						delTexts.push(result[line - 1].slice(1));
						line++;
					}
					while (line <= result.length && result[line - 1][0] === '+') {
						addTexts.push(result[line - 1].slice(1));
						line++;
						startLine++;
					}
					range.deleted = delTexts;
					range.added = addTexts;
					ranges.push(range);
				} else if (text[0] === '+') {
					range.line = startLine;
					addTexts.push(text.slice(1));
					line++;
					startLine++;
					while (line <= result.length && result[line - 1][0] === '+') {
						addTexts.push(result[line - 1].slice(1));
						line++;
						startLine++;
					}
					range.added = addTexts;
					ranges.push(range);
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
