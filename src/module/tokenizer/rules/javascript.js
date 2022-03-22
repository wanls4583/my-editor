const variable = `[\\$_a-zA-Z][\\$_a-zA-Z0-9]*`
const strValid = function (e) {
    let value = e.value;
    if (e.side === 'end' && value[0] === '\\' && value.length % 2 === 0) {
        return false;
    }
    return true;
}
const tplStrChild = {};
const rules = [
    //字符串``
    {
        start: /`/,
        end: /(?<=[^\\](?:\\\\)*)`|^`/,
        token: 'string.quoted.other',
        plainToken: 'string.quoted.other',
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
        foldName: 'js-double-string',
        valid: strValid
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
        plainToken: 'string.regexp.js',
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
        regex: /\b(?:continue|break|switch|case|do|while|else|for|if|new|return|from|import|export|default|with|throw|try|catch|finally)\b/,
        token: 'keyword.control.js'
    }, {
        regex: /\b(?:\+|\-|\*|\/|\=|\!|>|<|\&|\||\?|typeof|in|new)\b/,
        token: 'keyword.operator.js'
    }, {
        regex: /\b[A-Z][\\$_a-zA-Z0-9]*?(?=\.)/, //Token.
        token: 'entity.name.class.js'
    }, {
        regex: new RegExp(`(?<=\\bnew\\s+?)${variable}(?=\\s*?\\()`), //ie. new Test()
        token: 'entity.name.class.js'
    }, {
        regex: new RegExp(`(?<=\\s*?class\\s*?)${variable}(?=\\s*?\\{)`), //ie. calss Test{}
        token: 'entity.name.class.js'
    }, {
        regex: new RegExp(`(${variable})\\s*?(?=\\([^\\(\\)]*?\\)\\s*?\\{)`), //ie. test(){}
        token: 'entity.name.function.js'
    }, {
        regex: new RegExp(`(?<=\\bfunction\\s+?)${variable}`), //ie. function test
        token: 'entity.name.function.js'
    }, {
        regex: new RegExp(`(${variable})(?=\\()`), //ie. test(),.test()
        token: 'entity.name.function.js'
    }, {
        regex: /(\{)|(\[)|(\()/,
        foldType: -1,
        foldName: ['js-braces', 'js-bracket', 'js-paren']
    }, {
        regex: /(\})|(\])|(\))/,
        foldType: 1,
        foldName: ['js-braces', 'js-bracket', 'js-paren']
    }, {
        regex: /(?<=\.)(?:toString|valueOf|toLocaleString|hasOwnProperty|isPrototypeOf|propertyIsEnumerable)\b/,
        token: 'support.function.js'
    }, {
        regex: /(?<=\.)(?:prototype|window|document|module|exports)\b/,
        token: 'support.variable.js'
    }, {
        regex: /\bthis\b|\bself\b/,
        token: 'variable.language.js'
    }, {
        regex: /\b(?:\d+|0[xX][a-zA-Z0-9]+)\b/,
        token: 'constant.numeric.js'
    }, {
        regex: /\b(?:undefined|null|true|false|NaN)\b/,
        token: 'constant.language.js'
    }
];
tplStrChild.rules = rules;

export default {
    rules: rules
}