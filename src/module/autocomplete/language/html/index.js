/*
 * @Author: lisong
 * @Date: 2022-02-09 21:33:03
 * @Description: 
 */
import jsSeacher from '../javascript';

function htmlSearcher() {
    let regs = {
        js: /(?<!\<[^\>]*?['"][^\>]*?)(\<script(?:\s[^\>]*?)?\>)([\s\S]*?)\<\/script\>/,
        css: /(?<!\<[^\>]*?['"][^\>]*?)(\<style(?:\s[^\>]*?)?\>)([\s\S]*?)\<\/style\>/,
        enter: /\n/g,
        column: /\n([^\n]+)$/,
        comment: /\<\!--[\s\S]*?--\>/
    }

    function Searcher() {}

    Searcher.prototype.reset = function (option) {
        this.text = option.text || this.text;
        this.liveText = option.liveText;
        this.word = option.word;
        this.searcherId = option.searcherId;
        this.searchType = option.type;
        this.cmd = option.cmd;
        this.comments = [];
    }

    Searcher.prototype.parseComentRange = function () {
        let exec = null;
        let pos = {
            line: 1,
            column: 0,
            index: 0
        }
        let text = this.text;
        let start = null;
        let end = null;
        while (exec = regs.comment.exec(text)) {
            this.setLineColumn(text.slice(0, exec.index), pos);
            pos.index += exec.index;
            start = Object.assign({}, pos);
            this.setLineColumn(exec[0], pos);
            pos.index += exec[0].length;
            end = Object.assign({}, pos);
            text = this.text.slice(pos.index);
            this.comments.push({
                start: start,
                end: end
            });
        }
    }

    Searcher.prototype.setLineColumn = function (text, pos) {
        let lines = text.match(regs.enter);
        lines = lines && lines.length || 0;
        pos.line += lines;
        if (lines) {
            let exec = regs.column.exec(text);
            pos.column = exec && exec[1].length || 0;
        } else {
            pos.column += text.length;
        }
    }

    Searcher.prototype.search = function () {
        this.parseComentRange();
        switch (this.searchType) {
            case 'script':
                this.searchJs();
                break;
            case 'css':
                this.searchCss();
                break;
            case 'style':
                this.searchStyle();
                break;
            case 'tag':
                this.searchTag();
                break;
            case 'attr':
                this.searchAttr();
                break;
        }
    }

    Searcher.prototype.searchJs = function () {
        this.searchJs.fn = this.searchJs.fn || _jsSeacher().search;
        if (this.cmd == 'stop') {
            this.searchJs.fn({
                cmd: cmd
            });
        } else {
            this._search(regs.js, this.searchJs.fn, this.liveText);
            this._search(regs.js, this.searchJs.fn, this.text);
        }
    }

    Searcher.prototype.searchCss = function () {

    }

    Searcher.prototype.searchStyle = function () {

    }

    Searcher.prototype.searchTag = function () {

    }

    Searcher.prototype.searchAttr = function () {

    }

    Searcher.prototype._search = function (reg, searchFn, text) {
        let exec = null;
        let pos = {
            line: 1,
            column: 0,
            index: 0
        }
        let result = [];
        while (exec = reg.exec(text)) {
            this.setLineColumn(text.slice(0, exec.index), pos);
            pos.index += exec.index;
            if (!this.checkInComment(pos)) {
                text = this.text.slice(pos.index);
                continue;
            }
            this.setLineColumn(exec[1], pos);
            pos.index += exec[1].length;
            if (exec[2]) {
                searchFn({
                    text: exec[2],
                    word: this.word,
                    searcherId: this.searcherId,
                    cmd: this.cmd
                });
            }
            this.setLineColumn(exec[0].slice(exec[1].length), pos);
            pos.index += exec[0].slice(exec[1].length).length;
            text = this.text.slice(pos.index);
        }
        return result;
    }

    Searcher.prototype.checkInComment = function (pos) {
        for (let i = 0; i < this.comments.length; i++) {
            let item = this.comments[i];
            if (_compare(item.start, pos) < 0 && _compare(item.end, pos) > 0) {
                pos.line = item.end.line;
                pos.column = item.end.column;
                pos.index = item.end.index;
                return false;
            }
        }
        return true;

        function _compare(a, b) {
            if (a.line === b.line) {
                return a.column - b.column
            }
            return a.line - b.line;
        }
    }

    let searcher = new Searcher();

    return {
        search: function (option) {
            searcher.reset(option);
            searcher.search();
        }
    }
}

export default new Function(`function _jsSeacher()${jsSeacher.toString().replace(/^[^\)]+?\)/, '')}
function _htmlSearcher()${htmlSearcher.toString().replace(/^[^\)]+?\)/, '')}
return _htmlSearcher();
`)