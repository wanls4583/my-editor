/*
 * @Author: lisong
 * @Date: 2022-02-09 21:33:03
 * @Description: 
 */
import jsLint from './javascript';
import cssLint from './css';

function htmlLint() {
    let parseJs = jsParser().parse;
    let parseCss = cssParser().parse;
    let regs = {
        js: /(?<!\<[^\>]*?['"][^\>]*?)\<script(?:\s[^\>]*?)?\>([\s\S]*?)\<\/script\>/,
        css: /(?<!\<[^\>]*?['"][^\>]*?)\<style(?:\s[^\>]*?)?\>([\s\S]*?)\<\/style\>/,
        enter: /\n/g,
        column: /\n[^\n]*?$/
    }

    function Parser() {}

    Parser.prototype.reset = function (text) {
        this.text = text;
    }

    Parser.prototype.parse = function () {
        return parser.parseJs().concat(parser.parseCss());
    }

    Parser.prototype.parseJs = function () {
        return this._parse(regs.js, parseJs);
    }

    Parser.prototype.parseCss = function () {
        return this._parse(regs.css, parseCss);
    }

    Parser.prototype._parse = function (reg, parseFun) {
        let exec = null;
        let line = 1;
        let column = 0;
        let text = this.text;
        let result = [];
        while (exec = reg.exec(text)) {
            setLineColumn(text.slice(0, exec.index));
            if (exec[1]) {
                let r = parseFun(exec[1]);
                r.map((item) => {
                    if (item.line == 1) {
                        item.column += column;
                    }
                    item.line += line - 1;
                });
                result = result.concat(r);
            }
            setLineColumn(exec[0]);
            text = text.slice(exec.index + exec[0].length);
        }
        return result;

        function setLineColumn(text) {
            let lines = text.match(regs.enter);
            lines = lines && lines.length || 0;
            line += lines;
            if (lines) {
                column = regs.column.exec(text)[0].length;
            } else {
                column += text.length;
            }
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

export default new Function(`function jsParser${jsLint.toString().slice(8)}
function cssParser${cssLint.toString().slice(8)}
${htmlLint.toString()}
return htmlLint();
`)