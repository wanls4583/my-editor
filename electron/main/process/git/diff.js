const spawnSync = require('child_process').spawnSync;
const spawn = require('child_process').spawn;
const path = require('path');

class Differ {
    constructor() {
        this.maxCacheSize = 100 * 10000 * 20;
        this.cacheIndexs = [];
        this.fileCacheMap = { size: 0 };
    }
    getDiff({ filePath, text, parseDiffId }) {
        let nowCommit = this.getNowHash(filePath);
        let fileIndex = nowCommit + '-' + this.getCacheHash(filePath);
        let stagedContent = this.fileCacheMap[fileIndex];
        let textArr = text.split('\n');
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
            process.send({ parseDiffId, path: filePath, result: this.parseDiff(diffs, textArr.length) });
        }
    }
    diff(a, b) {
        let aIndex = 0;
        let bIndex = 0;
        const diffObjs = [];
        const lcs = _lcs(a, b);
        for (let i = 0; i < lcs.length; i++) {
            let item = lcs[i];
            if (aIndex !== item.aIndex) {
                diffObjs.push({
                    type: 'D',
                    line: bIndex + 1,
                    added: [],
                    deleted: a.slice(aIndex, item.aIndex)
                })
            }
            if (bIndex !== item.bIndex) {
                diffObjs.push({
                    type: 'A',
                    line: bIndex + 1,
                    added: b.slice(bIndex, item.bIndex),
                    deleted: []
                })
            }
            aIndex = item.aIndex + item.length;
            bIndex = item.bIndex + item.length;
        }
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

        function _lcs(a, b) {
            let result = [];
            let item = {};
            let aIndex = 0;
            let bIndex = 0;
            let preSames = 0;
            let endSames = 0;
            while (a[aIndex] === b[bIndex] && a[aIndex] !== undefined) {
                aIndex++;
                bIndex++;
                preSames++;
            }
            if (preSames) {
                a = a.slice(preSames);
                b = b.slice(preSames);
            }
            aIndex = a.length - 1;
            bIndex = b.length - 1;
            while (a[aIndex] === b[bIndex] && a[aIndex] !== undefined) {
                aIndex--;
                bIndex--;
                endSames++;
            }
            if (endSames) {
                a = a.slice(0, -endSames);
                b = b.slice(0, -endSames);
            }
            let aLen = a.length;
            let bLen = b.length;
            let dp = new Array(aLen + 1).fill(0);
            for (let i = 0; i < aLen + 1; i++) {
                dp[i] = new Array(bLen + 1).fill(0);
            }
            for (let i = 1; i <= aLen; i++) {
                for (let j = 1; j <= bLen; j++) {
                    if (a[i - 1] === b[j - 1]) {
                        dp[i][j] = dp[i - 1][j - 1] + 1;
                    } else if (dp[i][j - 1] > dp[i - 1][j]) {
                        dp[i][j] = dp[i][j - 1];
                    } else {
                        dp[i][j] = dp[i - 1][j];
                    }
                }
            }
            while (aLen && bLen && dp[aLen][bLen]) {
                if (a[aLen - 1] === b[bLen - 1]) {
                    if (item.aIndex === aLen && item.bIndex === bLen) {
                        item.aIndex--;
                        item.bIndex--;
                        item.length++;
                    } else {
                        item = {
                            aIndex: aLen - 1 + preSames,
                            bIndex: bLen - 1 + preSames,
                            length: 1
                        };
                        result.push(item);
                    }
                    aLen -= 1;
                    bLen -= 1;
                } else if (dp[aLen - 1][bLen - 1] === dp[aLen][bLen]) {
                    aLen -= 1;
                    bLen -= 1;
                } else if (dp[aLen - 1][bLen] === dp[aLen][bLen]) {
                    aLen -= 1;
                } else {
                    bLen -= 1;
                }
            }
            if (preSames) {
                result.push({
                    aIndex: 0,
                    bIndex: 0,
                    length: preSames
                });
            }
            result.reverse();
            if (endSames) {
                result.push({
                    aIndex: a.length + preSames,
                    bIndex: b.length + preSames,
                    length: endSames
                });
            }
            return result;
        }
    }
    parseDiff(diffObjs, endLine) {
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
                    let diffObj = {
                        type: 'M',
                        line: item.line,
                        added: nextItem.added,
                        deleted: item.deleted.slice(0, nextItem.added.length)
                    }
                    results.push(diffObj);
                    if (item.line + nextItem.added.length > endLine) {
                        for (let i = nextItem.added.length; i < item.deleted.length; i++) {
                            diffObj.deleted.push(item.deleted[i]);
                        }
                    } else {
                        results.push({
                            type: 'D',
                            line: item.line + nextItem.added.length,
                            added: [],
                            deleted: item.deleted.slice(nextItem.added.length)
                        });
                    }
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
}

const differ = new Differ();
process.on('message', data => {
    differ.getDiff(data);
});
