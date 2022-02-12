/*
 * @Author: lisong
 * @Date: 2022-02-09 21:33:03
 * @Description: 
 */
import jsLint from './javascript';
import cssLint from './css';

function htmlLint() {
    let regs = {
        js: /(?<!\<[^\>]*?['"][^\>]*?)(\<script(?:\s[^\>]*?)?\>)([\s\S]*?)\<\/script\>/,
        css: /(?<!\<[^\>]*?['"][^\>]*?)(\<style(?:\s[^\>]*?)?\>)([\s\S]*?)\<\/style\>/,
        enter: /\n/g,
        column: /\n([^\n]+)$/,
        comment: /\<\!--[\s\S]*?--\>/
    }

    function Parser() {}

    Parser.prototype.reset = function (text) {
        this.text = text;
        this.comments = [];
    }

    Parser.prototype.parseComentRange = function () {
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

    Parser.prototype.setLineColumn = function (text, pos) {
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

    Parser.prototype.parse = function () {
        this.parseComentRange();
        return parser.parseJs().concat(parser.parseCss());
    }

    Parser.prototype.parseJs = function () {
        let parseJs = jsParser().parse;
        return this._parse(regs.js, parseJs);
    }

    Parser.prototype.parseCss = function () {
        let parseCss = cssParser().parse;
        return this._parse(regs.css, parseCss);
    }

    Parser.prototype._parse = function (reg, parseFun) {
        let exec = null;
        let pos = {
            line: 1,
            column: 0,
            index: 0
        }
        let text = this.text;
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
                let r = parseFun(exec[2]);
                r.map((item) => {
                    if (item.line == 1) {
                        item.column += pos.column;
                    }
                    item.line += pos.line - 1;
                });
                result = result.concat(r);
            }
            this.setLineColumn(exec[0].slice(exec[1].length), pos);
            pos.index += exec[0].slice(exec[1].length).length;
            text = this.text.slice(pos.index);
        }
        return result;
    }

    Parser.prototype.checkInComment = function (pos) {
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

    let parser = new Parser();

    return {
        parse: function (text) {
            let result = null;
            parser.reset(text);
            result = parser.parse();
            result.sort((a, b) => {
                if (a.line === b.line) {
                    return a.column - b.column;
                }
                return a.line - b.line;
            });
            return result;
        }
    }
}

export default new Function(`function jsParser()${jsLint.toString().replace(/^[^\)]+?\)/, '')}
function cssParser()${cssLint.toString().replace(/^[^\)]+?\)/, '')}
function htmlParser()${htmlLint.toString().replace(/^[^\)]+?\)/, '')}
return htmlParser();
`)