const Css = require('./css');
const JavaScript = require('./javascript');

const regs = {
    javascript: /(?<!\<[^\>]*?['"][^\>]*?)(\<script(?:\s[^\>]*?)?\>)([\s\S]*?)\<\/script\>/,
    css: /(?<!\<[^\>]*?['"][^\>]*?)(\<style(?:\s[^\>]*?)?\>)([\s\S]*?)\<\/style\>/,
    enter: /\n/g,
    column: /\n([^\n]+)$/,
    comment: /\<\!--[\s\S]*?--\>/,
};

function parseComentRange(text) {
    let exec = null;
    let pos = {
        line: 1,
        column: 0,
        index: 0,
    };
    let start = null;
    let end = null;
    let comments = [];
    if (parseComentRange.cache && parseComentRange.cache.text === text) {
        return parseComentRange.cache.comments;
    }
    while ((exec = regs.comment.exec(text))) {
        setLineColumn(text.slice(0, exec.index), pos);
        pos.index += exec.index;
        start = Object.assign({}, pos);
        setLineColumn(exec[0], pos);
        pos.index += exec[0].length;
        end = Object.assign({}, pos);
        text = text.slice(pos.index);
        comments.push({
            start: start,
            end: end,
        });
    }
    parseComentRange.cache = {
        text: text,
        comments: comments,
    };
    return comments;
}

function setLineColumn(text, pos) {
    let lines = text.match(regs.enter);
    lines = (lines && lines.length) || 0;
    pos.line += lines;
    if (lines) {
        let exec = regs.column.exec(text);
        pos.column = (exec && exec[1].length) || 0;
    } else {
        pos.column += text.length;
    }
}

function checkInComment(pos, comments) {
    for (let i = 0; i < comments.length; i++) {
        let item = comments[i];
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
            return a.column - b.column;
        }
        return a.line - b.line;
    }
}

function _lint(text, language) {
    let exec = null;
    let pos = {
        line: 1,
        column: 0,
        index: 0,
    };
    let results = [];
    let promises = [];
    let comments = parseComentRange(text);
    let reg = null;
    let linter = null;
    if (language === 'css') {
        reg = regs.css;
        linter = Css.lint;
    }
    if (language === 'javascript') {
        reg = regs.javascript;
        linter = JavaScript.lint;
    }
    while ((exec = reg.exec(text))) {
        setLineColumn(text.slice(0, exec.index), pos);
        pos.index += exec.index;
        if (!checkInComment(pos, comments)) {
            text = text.slice(pos.index);
            continue;
        }
        setLineColumn(exec[1], pos);
        pos.index += exec[1].length;
        if (exec[2]) {
            let _pos = Object.assign({}, pos);
            let promise = linter(exec[2], language).then((errors) => {
                errors.forEach((item) => {
                    item.line += _pos.line - 1;
                    if (item.line === 1) {
                        item.column += _pos.column;
                    }
                    if (item.endLine) {
                        item.endLine += _pos.line - 1;
                        if (item.endLine === 1) {
                            item.endColumn += _pos.endColumn;
                        }
                    }
                });
                results.push(...errors);
            });
            promises.push(promise);
        }
        setLineColumn(exec[0].slice(exec[1].length), pos);
        pos.index += exec[0].slice(exec[1].length).length;
        text = text.slice(pos.index);
    }
    return Promise.all(promises).then(() => {
        return results;
    });
}

function lint(text) {
    let results = [];
    let ps1 = _lint(text, 'css').then((data) => {
        results = results.concat(data);
    });
    let ps2 = _lint(text, 'javascript').then((data) => {
        results = results.concat(data);
    });
    return Promise.all([ps1, ps2]).then(() => {
        return results;
    });
}

module.exports = {
    lint: lint,
};
