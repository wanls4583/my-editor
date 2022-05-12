import Vue from 'vue';
import Util from '@/common/util';
import globalData from '@/data/globalData';

const require = window.require || window.parent.require || function () {};
const path = require('path');
const fs = require('fs');

export default class {
    constructor() {
        this.wordPattern = Util.getWordPattern();
        this.wholeWordPattern = new RegExp(`^(${this.wordPattern.source})$`);
        this.wordPattern = new RegExp(this.wordPattern.source);
    }
    search(searchObj) {
        searchObj = Object.assign({}, searchObj);
        searchObj.path = this.parsePath(searchObj.path);
        searchObj.excludePath = this.parsePath(searchObj.excludePath);
        searchObj.lines = searchObj.text.split('\n');
        this.searchId = Util.getUUID();
        this.eventBus = new Vue();
        if (!fs.existsSync(searchObj.path)) {
            return this.eventBus;
        }
        if (searchObj.excludePath) {
            searchObj.excludePath = new RegExp(searchObj.excludePath.replace(/\\/g, '\\\\'));
        }
        if (searchObj.lines.length == 1) {
            searchObj.lines[0] = searchObj.lines[0].replace(/\\|\.|\*|\+|\-|\?|\(|\)|\[|\]|\{|\}|\^|\$|\~|\!|\&|\|/g, '\\$&');
            if (this.wholeWordPattern.test(searchObj.text) && searchObj.wholeWord) {
                searchObj.lines[0] = '(?:\\b|(?<=[^0-9a-zA-Z]))' + searchObj.text + '(?:\\b|(?=[^0-9a-zA-Z]))';
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
            let name = /[^\\\/]+$/.exec(path);
            let fileObj = {
                name: name[0],
                path: path,
            };
            this.searchFiles({
                files: [fileObj],
                dirs: [],
                searchObj: searchObj,
                searchId: this.searchId,
            });
        }
        return this.eventBus;
    }
    searchDir(option) {
        if (option.searchId !== this.searchId || !option.dirs.length) {
            return;
        }
        let dirPath = option.dirs.shift();
        let excludePath = option.searchObj.excludePath;
        if (globalData.skipSearchDirs.test(dirPath) || (excludePath && excludePath.test(dirPath))) {
            this.searchDir(option);
            return;
        }
        fs.readdir(dirPath, { encoding: 'utf8' }, (err, files) => {
            if (err) {
                throw err;
            }
            let fileLength = option.files.length;
            files.forEach((item, index) => {
                let fullPath = path.join(dirPath, item);
                let state = fs.statSync(fullPath);
                if (state.isFile()) {
                    option.files.push({
                        name: item,
                        path: fullPath,
                    });
                } else {
                    option.dirs.push(fullPath);
                    console.log(fullPath);
                }
            });
            this.searchDir(option);
            fileLength === 0 && this.searchFiles(option);
        });
    }
    searchFiles(option) {
        if (option.searchId !== this.searchId || !option.files.length) {
            return;
        }
        let fileObj = option.files[0];
        let basename = path.basename(fileObj.path);
        let excludePath = option.searchObj.excludePath;
        if (globalData.skipSearchFiles.test(basename) || (excludePath && excludePath.test(fileObj.path))) {
            option.files.shift();
            this.searchFiles(option);
            return;
        }
        this.readFile(
            fileObj,
            (lines) => {
                if (option.searchId !== this.searchId) {
                    return;
                }
                let results = null;
                if (option.searchObj.lines.length === 1) {
                    results = _singleLineMatch(lines);
                } else {
                    results = _multiLineMatch(lines);
                }
                if (results && results.length) {
                    results.forEach((item) => {
                        item.path = fileObj.path;
                        item.name = fileObj.name;
                    });
                    this.eventBus.$emit('find', results);
                }
            },
            () => {
                option.files.shift();
                if (option.searchId !== this.searchId) {
                    return;
                }
                this.searchFiles(option);
            }
        );

        function _singleLineMatch(lines) {
            let searchObj = option.searchObj;
            let text = lines.peek();
            let res = null;
            let results = [];
            let texts = [text];
            while ((res = searchObj.lines[0].exec(text))) {
                let range = {};
                range.start = { line: lines.length, column: res.index };
                range.end = { line: lines.length, column: res.index + res[0].length };
                results.push({
                    texts: texts,
                    range: range,
                });
            }
            searchObj.lines[0].lastIndex = 0;
            return results;
        }

        function _multiLineMatch(lines) {
            let searchObj = option.searchObj;
            let texts = [];
            let range = {};
            if (lines.length >= searchObj.lines.length) {
                let i = lines.length - 1;
                let j = searchObj.lines.length - 1;
                let res = null;
                while (i >= 0 && j >= 0) {
                    if ((res = searchObj.lines[j].exec(lines[i]))) {
                        texts.push(lines[i]);
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
                texts.reverse();
                return [
                    {
                        texts: texts,
                        range: range,
                    },
                ];
            }
        }
    }
    readFile(fileObj, cb, endCb) {
        const es = require('event-stream');
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
    parsePath(dirPath) {
        const fileTree = globalData.fileTree;
        dirPath = dirPath || '';
        if (!dirPath) {
            return dirPath;
        }
        if (dirPath.startsWith('./')) {
            let res = /\.\/([^\\\/]+)(?:\\|\/|$)/.exec(dirPath);
            let project = (res && res[1]) || '';
            for (let i = 0; i < fileTree.length; i++) {
                if (project === fileTree[i].name) {
                    dirPath = path.join(fileTree[i].path, dirPath.slice(res[1].length + 2));
                    break;
                }
            }
        }
        try {
            dirPath = path.normalize(dirPath);
            dirPath = path.parse(dirPath);
            dirPath = path.join(dirPath.dir, dirPath.base);
        } catch (e) {
            dirPath = '';
        }
        return dirPath;
    }
}