const spawnSync = require('child_process').spawnSync;
const spawn = require('child_process').spawn;
const path = require('path');

class Differ {
    constructor() {
        this.maxCacheSize = 100 * 10000 * 20;
        this.cacheIndexs = [];
        this.fileCacheMap = { size: 0 };
    }
    parseDiff({ filePath, text, workerId }) {
        let nowCommit = this.getNowHash(filePath);
        let fileIndex = nowCommit + '-' + this.getCacheHash(filePath);
        let stagedContent = this.fileCacheMap[fileIndex];
        let textArr = text.split(/\r*\n/);
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
            try {
                let diffs = this.diff(text.split(/\r*\n/), textArr);
                process.send({ workerId, path: filePath, result: this.parseResult(diffs, textArr.length) });
            } catch (e) {
                console.log(e);
            }
        }
    }
    diff(a, b) {
        let aIndex = 0;
        let bIndex = 0;
        const diffObjs = [];
        const lcs = this.lcs(a, b);
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
    }
    lcs(a, b) {
        let result = [];
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
        let arr = _lcs(a, b);
        let preItem = {};
        for (let i = 0; i < arr.length; i++) {
            let item = arr[i];
            if (preItem.aIndex + preItem.length !== item.aIndex || preItem.bIndex + preItem.length !== item.bIndex) {
                item.length = 1;
                result.push(item);
                preItem = item;
            } else {
                preItem.length++;
            }
        }
        if (preSames) {
            for (let i = 0; i < result.length; i++) {
                result[i].aIndex += preSames;
                result[i].bIndex += preSames;
            }
            result.unshift({ aIndex: 0, bIndex: 0, length: preSames });
        }
        if (endSames) {
            result.push({ aIndex: a.length + preSames, bIndex: b.length + preSames, length: endSames });
        }
        return result;

        function _lis(indexs) {
            let len = 1;
            let dp = new Array(indexs.length);
            let results = [];
            dp[0] = null;
            dp[1] = indexs[0];
            for (let i = 1; i < indexs.length; i++) {
                if (indexs[i].aIndex > dp[len].aIndex) {
                    dp[++len] = indexs[i];
                    indexs[i].prev = dp[len - 1];
                } else {
                    let l = 1,
                        r = len,
                        pos = 0;
                    while (l <= r) {
                        let mid = (l + r) >> 1;
                        if (dp[mid].aIndex < indexs[i].aIndex) {
                            pos = mid;
                            l = mid + 1;
                        } else {
                            r = mid - 1;
                        }
                    }
                    dp[pos + 1] = indexs[i];
                    indexs[i].prev = dp[pos];
                }
            }
            let node = dp[len];
            while (node) {
                results.push(node);
                node = node.prev;
            }
            results.reverse();
            return results;
        }

        // 最长公共子序列
        function _lcs(a, b) {
            let aMap = new Map();
            let indexs = [];
            for (let i = 0; i < a.length; i++) {
                let item = a[i];
                if (aMap.has(item)) {
                    aMap.get(item).push(i);
                } else {
                    aMap.set(item, [i]);
                }
            }
            for (let i = 0; i < b.length; i++) {
                let item = b[i];
                if (aMap.has(item)) {
                    let aArr = aMap.get(item);
                    for (let j = aArr.length - 1; j >= 0; j--) {
                        indexs.push({ aIndex: aArr[j], bIndex: i });
                    }
                }
            }
            return (indexs.length && _lis(indexs)) || [];
        }
    }
    parseResult(diffObjs, endLine) {
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
                    // let diffObj = {
                    //     type: 'M',
                    //     line: item.line,
                    //     added: nextItem.added,
                    //     deleted: item.deleted.slice(0, nextItem.added.length)
                    // }
                    // results.push(diffObj);
                    // if (item.line + nextItem.added.length > endLine) {
                    //     for (let i = nextItem.added.length; i < item.deleted.length; i++) {
                    //         diffObj.deleted.push(item.deleted[i]);
                    //     }
                    // } else {
                    //     results.push({
                    //         type: 'D',
                    //         line: item.line + nextItem.added.length,
                    //         added: [],
                    //         deleted: item.deleted.slice(nextItem.added.length)
                    //     });
                    // }
                    results.push({
                        type: 'M',
                        line: item.line,
                        added: nextItem.added,
                        deleted: item.deleted
                    });
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
    getNowHash(filePath) {
        return spawnSync('git', ['rev-parse', 'HEAD'], { cwd: path.dirname(filePath) }).stdout.toString();
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
        let child = spawn('git', ['show', `:./${path.basename(filePath)}`], { cwd: path.dirname(filePath) });
        return new Promise((resolve, reject) => {
            let result = '';
            child.stdout.on('data', data => {
                result += data;
            });
            child.stderr.on('data', err => {
                reject();
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
    differ.parseDiff(data);
});
