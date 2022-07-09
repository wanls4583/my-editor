const JsBeautify = require('js-beautify');

class Worker {
    constructor() {
        this.options = { max_preserve_newlines: 2, indent_size: 4, indent_with_tabs: true };
    }
    formatCode({ workerId, text, cursorPos, language, options }) {
        let parser = this.getFormatParser(language);
        let charCount = this.getCharAndSpaceCount(text.split('\n'), cursorPos);
        let endSpaceCount = charCount.endSpaceCount;
        charCount = charCount.charCount;
        try {
            let opt = Object.assign({}, this.options);
            let result = parser(text, Object.assign(opt, options));
            if (result !== text) {
                cursorPos = this.getCursorOffset(result, charCount, endSpaceCount);
                cursorPos = result.slice(0, cursorPos).split('\n');
                cursorPos = { line: cursorPos.length, column: cursorPos[cursorPos.length - 1].length };
                process.send({
                    workerId,
                    cursorPos,
                    text: result
                })
            }
        } catch (e) {
            console.log(e);
        }
    }
    getFormatParser(language) {
        let parser = null;
        switch (language) {
            case 'javascript':
            case 'javascriptreact':
            case 'typescript':
            case 'typescriptreact':
            case 'coffeescript':
                parser = JsBeautify.js;
                break;
            case 'html':
            case 'vue':
            case 'xml':
                parser = JsBeautify.html;
                break;
            case 'css':
            case 'scss':
            case 'less':
                parser = JsBeautify.css;
                break;
        }
        return parser;
    }
    getCharAndSpaceCount(texts, cursorPos) {
        let lineText = '';
        let charCount = 0;
        let endSpaceCount = 0;
        let lastLineText = texts[cursorPos.line - 1];
        // 计算光标前面有多个字符
        for (let i = 0; i < cursorPos.line - 1; i++) {
            lineText = texts[i];
            for (let j = 0; j < lineText.length; j++) {
                if (!/[\s\n]/.test(lineText[j])) {
                    charCount++;
                }
            }
        }
        lineText = lastLineText.slice(0, cursorPos.column);
        for (let j = 0; j < lineText.length; j++) {
            if (!/\s/.test(lineText[j])) {
                charCount++;
            }
        }
        // 如果光标不是在最后，则计算其前面有多少个空格
        if (lastLineText.slice(cursorPos.column).trim()) {
            for (let j = lineText.length - 1; j >= 0; j--) {
                if (/\s/.test(lineText[j])) {
                    endSpaceCount++;
                } else {
                    break;
                }
            }
        }
        return {
            charCount,
            endSpaceCount
        };
    }
    getCursorOffset(text, charCount, endSpaceCount) {
        let offset = 0;
        let count = 0;
        for (let i = 0; i < text.length; i++) {
            offset++;
            if (!/[\s\n]/.test(text[i])) {
                count++;
            }
            if (count >= charCount) {
                // 加上可能的空格距离
                if (endSpaceCount) {
                    i++;
                    if ('\n' === text[i]) {
                        i++;
                        offset++;
                    }
                    for (let j = 0; i < text.length && j < endSpaceCount; i++, j++) {
                        if (/\s/.test(text[i])) {
                            offset++;
                        } else {
                            break;
                        }
                    }
                }
                break;
            }
        }
        return offset;
    }
}

const worker = new Worker();

process.on('message', data => {
    worker.formatCode(data);
});
