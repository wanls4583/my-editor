const Css = require('./css');
const JavaScript = require('./javascript');

const regs = {
    javascript: /(?<!\<[^\>]*?['"][^\>]*?)(?<=\<script(?:\s[^\>]*?)?\>)([\s\S]*?)\<\/script\>/g,
    css: /(?<!\<[^\>]*?['"][^\>]*?)(?<=\<style(?:\s[^\>]*?)?\>)([\s\S]*?)\<\/style\>/g,
    enter: /\n/g,
    column: /\n([^\n]+)$/,
    comment: /\<\!--[\s\S]*?--\>/g,
};

function parseComentRange(text) {
    let exec = null;
    let comments = [];
    if (parseComentRange.cache && parseComentRange.cache.text === text) {
        return parseComentRange.cache.comments;
    }
    while ((exec = regs.comment.exec(text))) {
        let start = getLineColumn(text.slice(0, exec.index));
        let end = getLineColumn(text.slice(0, exec.index + exec[0].length));
        comments.push({
            start: start,
            end: end,
        });
    }
    regs.comment.lastIndex = 0;
    parseComentRange.cache = {
        text: text,
        comments: comments,
    };
    return comments;
}

function getLineColumn(text) {
    let line = 1;
    let column = 0;
    let lines = text.match(regs.enter);
    lines = (lines && lines.length) || 0;
    line += lines;
    if (lines) {
        let exec = regs.column.exec(text);
        column = (exec && exec[1].length) || 0;
    } else {
        column += text.length;
    }
    return {
        line: line,
        column: column,
    };
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
        if (!exec[1]) {
            continue;
        }
        let pos = getLineColumn(text.slice(0, exec.index));
        if (!checkInComment(pos, comments)) {
            continue;
        }
        let promise = linter(exec[1], language).then((errors) => {
            errors.forEach((item) => {
                item.line += pos.line - 1;
                if (item.line === 1) {
                    item.column += pos.column;
                }
                if (item.endLine) {
                    item.endLine += pos.line - 1;
                    if (item.endLine === 1) {
                        item.endColumn += pos.endColumn;
                    }
                }
            });
            results.push(...errors);
        });
        promises.push(promise);
    }
    reg.lastIndex = 0;
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
