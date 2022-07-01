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
		this.sendQueue = [];
		this.send();
	}
	send() {
		if (this.sendQueue.length > 0) {
			let results = null;
			if (this.sendQueue.length > 50 || this.searchDone) {
				// 每次发送100条数据，避免阻塞主进程
				results = this.sendQueue.slice(0, 50);
				this.sendQueue = this.sendQueue.slice(50);
			} else if (this.sendQueue.length > 1) {
				// 留下最后一项，该项可能需要携带文件信息
				results = this.sendQueue.slice(0, -1);
				this.sendQueue = this.sendQueue.slice(-1);
			}
			results && process.send({ results: results });
		}
		if (this.sendQueue.length === 0 && this.searchDone === true) {
			process.send('end');
		} else {
			setTimeout(() => {
				this.send();
			}, 15);
		}
	}
	search(searchObj) {
		searchObj = Object.assign({}, searchObj);
		searchObj.lines = searchObj.text.split('\n');
		this.searchObj = searchObj;
		if (!fs.existsSync(searchObj.path)) {
			this.searchDone = true;
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
				searchObj: searchObj
			});
		} else {
			let fileObj = {
				name: path.basename(searchObj.path),
				path: searchObj.path
			};
			this.searchFiles({
				files: [fileObj],
				dirs: [],
				searchObj: searchObj
			});
		}
	}
	stopSearch() {
		clearTimeout(this.searchDirTimer);
		clearTimeout(this.searchFilesTimer);
	}
	searchDir(option) {
		if (option.dirs.length === 0) {
			return;
		}
		let dirPath = option.dirs.shift();
		let excludePath = option.searchObj.excludePath;
		if (skipSearchDirs.test(dirPath) || (excludePath && excludePath.test(dirPath))) {
			this.searchDir(option);
			return;
		}
		this.searchDiring = true;
		fs.readdir(dirPath, { encoding: 'utf8' }, (err, files) => {
			this.searchDiring = false;
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
							path: fullPath
						});
					} else {
						option.dirs.push(fullPath);
					}
				} catch (e) {}
			});
			this.searchDir(option);
			this.searchFiles(option);
		});
	}
	searchFiles(option) {
		if (option.files.searching || option.files.length === 0) {
			return;
		}
		let fileObj = option.files[0];
		let basename = path.basename(fileObj.path);
		let excludePath = option.searchObj.excludePath;
		let finded = false;
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
				if (option.searchObj.lines.length === 1) {
					_singleLineMatch.call(this, lines);
				} else {
					_multiLineMatch.call(this, lines);
				}
			},
			() => {
				option.files.shift();
				option.files.searching = false;
				if (finded) {
					Object.assign(this.sendQueue[this.sendQueue.length - 1], fileObj);
				}
				if (option.files.length === 0 && option.dirs.length === 0 && !this.searchDiring) {
					this.searchDone = true;
					return;
				}
				this.searchFiles(option);
			}
		);

		function _singleLineMatch(lines) {
			let searchObj = option.searchObj;
			let text = lines[lines.length - 1];
			let res = null;
			while ((res = searchObj.lines[0].exec(text))) {
				let range = {};
				range.start = { line: lines.length, column: res.index };
				range.end = { line: lines.length, column: res.index + res[0].length };
				this.sendQueue.push(
					this.createItem({
						text,
						range,
						searchObj
					})
				);
				finded = true;
			}
			searchObj.lines[0].lastIndex = 0;
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
				this.sendQueue.push(
					this.createItem({
						text,
						range,
						searchObj
					})
				);
				finded = true;
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
	createItem({ text, range, searchObj }) {
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
			text: resultText
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
	searcher.search(data);
});
