const fs = require('fs');
const path = require('path');
const es = require('event-stream');

const skipSearchDirs = /[\\\/](node_modules|dist|\.git|\.vscode|\.idea|\.DS_Store)(?=[\\\/]|$)/;
const skipSearchFiles = /^npm-debug.log|^yarn-debug.log|^yarn-error.log|^pnpm-debug.log|\.suo|\.ntvs|\.njsproj|\.sln|\.sw/;
const defaultWordPattern = '(-?\\d*\\.\\d\\w*)|([^\\`\\~\\!\\@\\%\\^\\&\\*\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\\'\\"\\,\\.\\<\\>/\\?\\s]+)';

class Search {
	constructor() {
		this.wholeWordPattern = new RegExp(`^(${defaultWordPattern})$`);
		this.wordPattern = new RegExp(defaultWordPattern);
	}
	search(searchObj) {
		searchObj = Object.assign({}, searchObj);
		searchObj.lines = searchObj.text.split('\n');
		this.searchId = searchObj.searchId;
		this.searchObj = searchObj;
		if (!fs.existsSync(searchObj.path)) {
			setTimeout(() => {
				process.send('end');
			});
			return;
		}
		if (searchObj.excludePath) {
			searchObj.excludePath = new RegExp(searchObj.excludePath.replace(/\\/g, '\\\\'));
		}
		if (searchObj.lines.length == 1) {
			searchObj.lines[0] = searchObj.lines[0].replace(/\\|\.|\*|\+|\-|\?|\(|\)|\[|\]|\{|\}|\^|\$|\~|\!|\&|\|/g, '\\$&');
			if (this.wholeWordPattern.test(searchObj.text) && searchObj.wholeWord) {
				searchObj.lines[0] = '(?:\\b|(?<=[^0-9a-zA-Z]))' + searchObj.lines[0] + '(?:\\b|(?=[^0-9a-zA-Z]))';
			}
			searchObj.lines[0] = new RegExp(searchObj.lines[0], searchObj.ignoreCase ? 'ig' : 'g');
		}
		if (searchObj.lines.length > 1) {
			searchObj.lines.forEach((item, index) => {
				item = item.replace(/\\|\.|\*|\+|\-|\?|\(|\)|\[|\]|\{|\}|\^|\$|\~|\!|\&|\|/g, '\\$&');
				if (index === 0) {
					item = `${item}$`;
				} else if (index === searchObj.lines.length - 1) {
					item = `^${item}`;
				} else {
					item = `^${item}$`;
				}
				searchObj.lines[index] = new RegExp(item, searchObj.ignoreCase ? 'i' : '');
			});
		}
		if (fs.statSync(searchObj.path).isDirectory()) {
			this.searchDir({
				files: [],
				dirs: [searchObj.path],
				searchObj: searchObj,
				searchId: this.searchId,
			});
		} else {
			let fileObj = {
				name: path.basename(searchObj.path),
				path: searchObj.path,
			};
			this.searchFiles({
				files: [fileObj],
				dirs: [],
				searchObj: searchObj,
				searchId: this.searchId,
			});
		}
	}
	stopSearch() {
		clearTimeout(this.searchDirTimer);
		clearTimeout(this.searchFilesTimer);
		this.searchId = -1;
	}
	searchDir(option) {
		if (option.searchId !== this.searchId) {
			return;
		}
		if (option.dirs.length === 0) {
			this.searchFiles(option);
			return;
		}
		let dirPath = option.dirs.shift();
		let excludePath = option.searchObj.excludePath;
		if (skipSearchDirs.test(dirPath) || (excludePath && excludePath.test(dirPath))) {
			this.searchDir(option);
			return;
		}
		fs.readdir(dirPath, { encoding: 'utf8' }, (err, files) => {
			if (err) {
				console.log(err);
				return;
			}
			files.forEach((item, index) => {
				let fullPath = path.join(dirPath, item);
				try {
					let state = fs.statSync(fullPath);
					if (state.isFile()) {
						option.files.push({
							name: item,
							path: fullPath,
						});
						this.searchFiles(option);
					} else {
						option.dirs.push(fullPath);
					}
				} catch (e) {}
			});
			this.searchDirTimer = setTimeout(() => {
				this.searchDir(option);
			}, 0);
		});
	}
	searchFiles(option) {
		if (option.searchId !== this.searchId || option.files.searching) {
			return;
		}
		if (option.files.length === 0) {
			process.send('end');
			return;
		}
		let fileObj = option.files[0];
		let basename = path.basename(fileObj.path);
		let excludePath = option.searchObj.excludePath;
		let sendQueue = [];
		fileObj.id = this.getIdFromPath(fileObj.path);
		if (skipSearchFiles.test(basename) || (excludePath && excludePath.test(fileObj.path))) {
			option.files.shift();
			this.searchFiles(option);
			return;
		}
		option.files.searching = true;
		this.readFile(
			fileObj,
			lines => {
				if (option.searchId !== this.searchId) {
					return;
				}
				if (option.searchObj.lines.length === 1) {
					sendQueue.push(..._singleLineMatch.call(this, lines));
				} else {
					sendQueue.push(..._multiLineMatch.call(this, lines));
				}
			},
			() => {
				option.files.shift();
				option.files.searching = false;
				sendQueue.length && process.send({ searchId: this.searchId, results: sendQueue });
				if (option.searchId !== this.searchId) {
					return;
				}
				this.searchFilesTimer = setTimeout(() => {
					this.searchFiles(option);
				}, 0);
			}
		);

		function _singleLineMatch(lines) {
			let searchObj = option.searchObj;
			let text = lines[lines.length - 1];
			let res = null;
			let results = [];
			while ((res = searchObj.lines[0].exec(text))) {
				let range = {};
				range.start = { line: lines.length, column: res.index };
				range.end = { line: lines.length, column: res.index + res[0].length };
				results.push(
					this.createItem({
						text,
						range,
						fileObj,
						searchObj,
					})
				);
			}
			searchObj.lines[0].lastIndex = 0;
			return results;
		}

		function _multiLineMatch(lines) {
			let searchObj = option.searchObj;
			let text = '';
			let range = {};
			if (lines.length >= searchObj.lines.length) {
				let i = lines.length - 1;
				let j = searchObj.lines.length - 1;
				let res = null;
				while (i >= 0 && j >= 0) {
					if ((res = searchObj.lines[j].exec(lines[i]))) {
						text = lines[i];
						if (j === 0) {
							range.start = { line: i + 1, column: res.index };
						}
						if (j === searchObj.lines.length - 1) {
							range.end = { line: i + 1, column: res.index + res[0].length };
						}
					} else {
						return;
					}
					i--;
					j--;
				}
				return [
					this.createItem({
						text,
						range,
						fileObj,
					}),
				];
			}
		}
	}
	readFile(fileObj, cb, endCb) {
		let lines = [];
		fs.createReadStream(fileObj.path, { flags: 'r' })
			.on('end', endCb)
			.pipe(es.split())
			.pipe(
				es.map(function (line) {
					lines.push(line);
					cb(lines);
				})
			);
	}
	createItem({ text, range, fileObj, searchObj }) {
		let _text = text.trimRight();
		let start = range.start;
		let end = range.end;
		let res = null;
		let resultText = '';
		let html = _text.slice(0, start.column).slice(-20).trimLeft();
		res = /[^0-9a-zA-Z\s]/.exec(html);
		html = (res && html.slice(res.index + 1)) || html;
		resultText = html;
		html = this.htmlTrans(html);
		if (searchObj.lines.length > 1) {
			let plain = _text.slice(start.column, start.column + 100);
			resultText += plain;
			html += `<span class="search-results-bg">${this.htmlTrans(plain)}</span>`;
		} else {
			let plain = _text.slice(start.column, end.column);
			resultText += plain;
			html += `<span class="search-results-bg">${this.htmlTrans(plain)}</span>`;
			plain = _text.slice(end.column, end.column + 100);
			resultText += plain;
			html += this.htmlTrans(plain);
		}
		return {
			html,
			range,
			text: resultText,
			id: fileObj.id,
			name: fileObj.name,
			path: fileObj.path,
		};
	}
	htmlTrans(cont) {
		cont = cont.replace(/\&\#/g, '&amp;#');
		return cont.replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}
	getIdFromPath(filePath, mtimeMs) {
		let id = '';
		try {
			stat = fs.statSync(filePath);
			id = `file-${stat.dev}-${stat.ino}${mtimeMs ? '-' + stat.mtimeMs : ''}`;
		} catch (e) {
			id = this.getUUID();
		}
		return id;
	}
	getUUID(len) {
		len = len || 16;
		var str = '';
		for (var i = 0; i < len; i++) {
			str += ((Math.random() * 16) | 0).toString(16);
		}
		return str;
	}
}

const searcher = new Search();
process.on('message', data => {
	if (data.searchId) {
		searcher.search(data);
	}
});
