const Diff = require('diff');
const spawnSync = require('child_process').spawnSync;
const spawn = require('child_process').spawn;
const path = require('path');
const maxCacheSize = 100 * 1000 * 20;
const cacheIndexs = [];
const fileCacheMap = { size: 0 };

process.on('uncaughtException', e => {
	console.log('uncaughtException', e);
});

process.on('message', data => {
	let nowCommit = getNowHash(data.path);
	let fileIndex = nowCommit + '-' + getCacheHash(data.path);
	let stagedContent = fileCacheMap[fileIndex];
	if (!nowCommit) {
		return;
	}
	if (!stagedContent) {
		getStagedContent(data.path).then(stagedContent => {
			cacheFile(fileIndex, stagedContent);
			diff(stagedContent, data);
		});
	} else {
		diff(stagedContent, data);
	}
});

function diff(stagedContent, data) {
	let result = [];
	let count = 1;
	let diffs = Diff.diffLines(stagedContent, data.content) || [];
	for (let index = 2; index < diffs.length; index++) {
		let first = diffs[index - 2];
		let second = diffs[index - 1];
		let third = diffs[index];
		// 使added和removed相邻，避免以下情况
		// { count: 1, added: undefined, removed: true, value: '</body>\n' },
		// { count: 1, value: '\n' },
		// { count: 1, added: true, removed: undefined, value: '\n' },
		// { count: 1, value: '</html>' }
		if (third.added && third.value === second.value && !second.removed && first.removed) {
			third.added = undefined;
			second.added = true;
		}
	}
	for (let index = 0; index < diffs.length; index++) {
		let item = diffs[index];
		if (item.added || item.removed) {
			let obj = {
				line: count,
				added: item.added,
				removed: item.removed,
				value: item.value,
			};
			if (index === diffs.length - 1) {
				obj.end = true;
			}
			result.push(obj);
			if (item.added) {
				count += item.count;
			}
		} else {
			count += item.count;
		}
	}
	process.send({ path: data.path, result: result });
}

function cacheFile(fileIndex, stagedContent) {
	if (fileCacheMap.size + stagedContent.length > maxCacheSize) {
		let max = maxCacheSize - stagedContent.length;
		while (cacheIndexs.length && fileCacheMap.size > max) {
			let index = cacheIndexs.shift();
			fileCacheMap.size -= fileCacheMap[index];
			delete fileCacheMap[index];
		}
	}
	fileCacheMap[fileIndex] = stagedContent;
	fileCacheMap.size += stagedContent.length;
}

function getNowHash(filePath) {
	return spawnSync('git', ['log', '-1', '--format=%H'], { cwd: path.dirname(filePath) }).stdout.toString();
}

function getCacheHash(filePath) {
	let fileIndex = '';
	try {
		fileIndex = spawnSync('git', ['diff-index', 'HEAD', '--cached', filePath], { cwd: path.dirname(filePath) });
		fileIndex = fileIndex.stdout.toString() || filePath;
	} catch (e) {
		console.log(e);
	}
	return fileIndex;
}

function getStagedContent(filePath) {
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
