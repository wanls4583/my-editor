const variable = `[\\$_a-zA-Z][\\$_a-zA-Z0-9]*`
const tplStrChild = {};
const leftParen = /^\s*\(/;
const rightParen = /\)/;
const parenParam = /\,|[\$_a-zA-Z][\$_a-zA-Z0-9]/;
const leftBraces = /^\s*\{/;
const space = /\s/g
const rules = [
    //字符串``
    {
        start: /`/,
        end: /(?<=[^\\](?:\\\\)*)`|^`/,
        token: 'string.quoted.other',
        foldName: 'js-string',
        childRule: {
            rules: [{
                start: /\$\{/,
                end: /\}/,
                foldName: 'js-string-expr',
                level: 1,
                childRule: tplStrChild
            }]
        }
    },
    //字符串''
    {
        start: /'/,
        end: /(?<=(?:[^\\]|^)(?:\\\\)*)(?:'|$)/,
        token: 'string.quoted.single.js',
        foldName: 'js-single-string'
    },
    //字符串"""
    {
        start: /"/,
        end: /(?<=(?:[^\\]|^)(?:\\\\)*)(?:"|$)/,
        token: 'string.quoted.double.js',
        foldName: 'js-double-string'
    },
    //多行注释
    {
        start: /\/\*/,
        end: /\*\//,
        token: 'comment.block.js',
        foldName: 'js-comment'
    },
    // 单行注释
    {
        regex: /\/\/[\s\S]*$/,
        token: 'comment.line.double-slash.js'
    },
    // 正则表达式
    {
        start: /(?<=^|[\(\{\[\;\,\:\?\!\+\-\*\%\=\>\<\&\|]\s*?)\//,
        end: /(?<=[^\\](?:\\\\)*)\/|$/,
        token: 'string.regexp.js',
        childRule: {
            rules: [{
                regex: /\\[\s\S]/,
                token: 'constant.character.escape.js'
            }]
        }
    },
    {
        regex: /\b(?:var|let|const|class|function)\b/,
        token: 'storage.type.js'
    },
    {
        regex: /\b(?:continue|break|switch|case|do|while|else|for|if|new|return|from|import|export|default|module|with|throw|try|catch|finally)\b/,
        token: 'keyword.control.js'
    },
    {
        regex: /\+|\-|\*|\/|\=|\!|>|<|\&|\||\?/,
        token: 'keyword.operator.js'
    },
    {
        regex: /\b(?:typeof|in|new)\b/,
        token: 'keyword.operator.js'
    },
    {
        regex: /\b[A-Z][a-zA-Z0-9]*?(?=\.)/, //Token.
        token: 'support.class.js'
    },
    {
        regex: /\b(?:String|Number|Boolean|Array|Object|Map|Set|Date|Function|Promise|Proxy|RegExp|Error)\b/,
        token: 'support.class.js'
    },
    {
        regex: /\b(?:Math|JSON)\b/,
        token: 'support.constant.js'
    },
    {
        regex: new RegExp(`(?<=\\s*?class\\s*?)${variable}`), //ie. calss Test{}
        token: 'entity.name.class.js'
    },
    {
        regex: new RegExp(`(?<=\\bfunction\\s+?)${variable}`), //ie. function test
        token: 'entity.name.function.js'
    },
    {
        start: new RegExp(`(?<=\\bfunction\\s+?(${variable})?)\\(`),
        end: /\)/,
        childRule: {
            rules: [{
                regex: new RegExp(`${variable}`),
                token: 'variable.parameter'
            }]
        }
    },
    {
        regex: /\{/,
        foldName: 'js-braces',
        foldType: -1
    },
    {
        regex: /\[/,
        foldName: 'js-bracket',
        foldType: -1
    },
    {
        regex: /\(/,
        foldName: 'js-paren',
        foldType: -1
    },
    {
        regex: /\}/,
        foldName: 'js-braces',
        foldType: 1
    },
    {
        regex: /\]/,
        foldName: 'js-bracket',
        foldType: 1
    },
    {
        regex: /\)/,
        foldName: 'js-paren',
        foldType: 1
    },
    {
        regex: /(?<=\.)(?:toString|valueOf|toLocaleString|hasOwnProperty|isPrototypeOf|propertyIsEnumerable)\b/,
        token: 'support.function.js'
    },
    {
        regex: /(?<=\.)(?:prototype|exports)\b/,
        token: 'support.constant.js'
    },
    {
        regex: /\b(?:window|document)\b/,
        token: 'support.class.js'
    },
    {
        regex: /\bthis\b|\bself\b/,
        token: 'variable.language.js'
    },
    {
        regex: /\b(?:\d+|0[xX][a-zA-Z0-9]+)\b/,
        token: 'constant.numeric.js'
    },
    {
        regex: /\b(?:undefined|null|true|false|NaN|Infinity|globalThis)\b/,
        token: 'constant.language.js'
    },
    {
        regex: /[\$\_a-zA-Z][\$\_a-zA-Z0-9]*(?=\(|$)/,
        token: functionCheck
    },
    {
        regex: /[\$\_a-zA-Z][\$\_a-zA-Z0-9]*/,
        token: 'variable.other'
    }
];
tplStrChild.rules = rules;

function functionCheck(e) {
    let line = e.line - 1;
    let text = e.getLineText(line);
    while (text === '') { //去除前面无效空行
        line--;
        text = e.getLineText(line);
    }
    if (text && text.slice(-8) === 'function') { //前面有function关键字声明
        return 'entity.name.function.js';
    } else {
        line = e.line;
        text = e.getLineText(line).slice(e.index + e.value.length);
        while (text === '') { //去除后面无效空行
            line++;
            text = e.getLineText(line);
        };
        if (text) {
            let exec = leftParen.exec(text);
            if (exec) { //标识符后面有'('
                let preText = text.slice(0, exec.index).replace(space, '');
                if (preText && preText != ',') { //前面有内容，不满足属性函数(){}
                    return 'variable.function.js';
                }
                text = text.slice(exec.index + exec[0].length);
                while (text !== undefined && !(exec = rightParen.exec(text))) {
                    if (text === '' || parenParam.exec(text)) { //满足函数声明参数条件
                        line++;
                        text = e.getLineText(line);
                    } else { //不满足，则认定为函数执行
                        return 'variable.function.js';
                    }
                }
                if (exec) { //'('后面有')'
                    text = text.slice(exec.index + exec[0].length);
                    while (text === '') { //去除后面无效空行
                        line++;
                        text = e.getLineText(line);
                    }
                    if (text && leftBraces.exec(text)) { //')'后面为'{'，认定为函数声明
                        return 'entity.name.function.js';
                    }
                }
                return 'variable.function.js';
            }
        }
    }
    return 'variable.other';
}

export default {
    rules: rules
}