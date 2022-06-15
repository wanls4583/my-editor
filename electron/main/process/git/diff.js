const Diff = require('diff');
const spawnSync = require('child_process').spawnSync;
const spawn = require('child_process').spawn;
const path = require('path');
const maxCacheSize = 100 * 1000 * 20;
const cacheIndexs = [];
const fileCacheMap = { size: 0 };

process.on('uncaughtException', e => {
	console.log(e);
});

process.on('message', data => {
	let fileIndex = getCacheIndex(data.path);
	let stagedContent = fileCacheMap[fileIndex];
	if (!fileIndex) {
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
	for (let index = 0; index < diffs.length; index++) {
		let item = diffs[index];
		//去掉最后的换行符
		let value = index === diffs.length ? item.value : item.value.slice(0, -1);
		if (item.added || item.removed) {
			result.push({
				line: count,
				added: item.added,
				removed: item.removed,
				value: value,
			});
			if (item.added) {
				count += item.count;
			} else {
				let next = diffs[index + 1];
				if (next && !next.added && next.value === '\n') {
					index++;
				}
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

function getCacheIndex(filePath) {
	let fileIndex = '';
	try {
		fileIndex = spawnSync(`git diff-index HEAD --cached ${filePath}`, { cwd: path.dirname(filePath) }).output;
		fileIndex = (fileIndex && fileIndex.join('')) || filePath;
	} catch (e) {
		console.log(e);
	}
	return fileIndex;
}

function getStagedContent(filePath) {
	if (process.platform === 'win32') {
		child = spawn('cmd', [`/C chcp 65001>nul && git show :./${path.basename(filePath)}`], { cwd: path.dirname(filePath) });
	} else {
		child = spawn('git show', [`:./${path.basename(filePath)}`], { cwd: path.dirname(filePath) });
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
