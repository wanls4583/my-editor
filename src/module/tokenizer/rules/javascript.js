const variable = `[\\$_a-zA-Z][\\$_a-zA-Z0-9]*`
const tplStrChild = {};
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
        regex: new RegExp(`(?<!new\\s*)${variable}(?=\\()`), //ie. test(),.test()
        token: 'variable.function.js'
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
        regex: /[\$\_a-zA-Z][\$\_a-zA-Z0-9]*/,
        token: 'variable.other'
    }
];
tplStrChild.rules = rules;

export default {
    rules: rules
}