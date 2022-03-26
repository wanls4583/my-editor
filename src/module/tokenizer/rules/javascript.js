const variable = `[\\$_a-zA-Z][\\$_a-zA-Z0-9]*`

const functionChild = [{
        start: /\(/,
        end: /\)/,
        prior: true,
        foldName: 'js-paren',
        rules: [{
            regex: /[\$\_a-zA-Z][\$\_a-zA-Z0-9]*/,
            token: 'variable.parameter'
        }]
    },
    'storageArrowType',
    'blockStmt'
];

const rule = {
    name: 'JavaScript',
    rules: [
        //字符串``
        {
            name: 'tplStr',
            start: /`/,
            end: /(?<=[^\\](?:\\\\)*)`|^`/,
            token: 'string.quoted.other',
            foldName: 'js-string',
            rules: [{
                start: /\$\{/,
                end: /\}/,
                foldName: 'js-string-expr',
                prior: true,
                rules: 'JavaScript'
            }]
        },
        //字符串''
        {
            name: 'singleStr',
            start: /'/,
            end: /(?<=(?:[^\\]|^)(?:\\\\)*)(?:'|$)/,
            token: 'string.quoted.single.js',
            foldName: 'js-single-string'
        },
        //字符串"""
        {
            name: 'doubleStr',
            start: /"/,
            end: /(?<=(?:[^\\]|^)(?:\\\\)*)(?:"|$)/,
            token: 'string.quoted.double.js',
            foldName: 'js-double-string'
        },
        //多行注释
        {
            name: 'blockComment',
            start: /\/\*/,
            end: /\*\//,
            token: 'comment.block.js',
            foldName: 'js-comment'
        },
        // 单行注释
        {
            name: 'inlineComment',
            regex: /\/\/[\s\S]*$/,
            token: 'comment.line.double-slash.js'
        },
        // 正则表达式
        {
            start: /(?<=^|[\(\{\[\;\,\:\?\!\+\-\*\%\=\>\<\&\|]\s*?)\//,
            end: /(?<=[^\\](?:\\\\)*)\/|$/,
            token: 'string.regexp.js',
            rules: [{
                regex: /\\[\s\S]/,
                token: 'constant.character.escape.js'
            }]
        },
        {
            regex: /\b(?:var|let|const|class|function)\b/,
            token: 'storage.type.js'
        },
        {
            name: 'storageArrowType',
            regex: /\=\>/,
            token: 'storage.type.js'
        },
        {
            regex: /\b(?:continue|break|switch|case|do|while|else|for|if|new|return|from|import|export|default|module|with|throw|try|catch|finally)\b/,
            token: 'keyword.control.js'
        },
        {
            regex: new RegExp(`(?<=\\s*?class\\s*?)${variable}`), //ie. calss Test{}
            token: 'entity.name.class.js'
        },
        {
            regex: /(?<=\.)(?:toString|valueOf|toLocaleString|hasOwnProperty|isPrototypeOf|propertyIsEnumerable)\b/,
            token: 'support.function.js'
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
            regex: /\b(?:window|document)\b/,
            token: 'support.class.js'
        },
        {
            regex: /\b(?:Math|JSON)\b/,
            token: 'support.constant.js'
        }, {
            regex: /(?<=\.)(?:prototype|exports)\b/,
            token: 'support.constant.js'
        },
        {
            start: /(?<=function\s*?)[\$\_a-zA-Z][\$\_a-zA-Z0-9]*/,
            end: /(?<=\})/,
            startToken: 'entity.name.function',
            rules: functionChild
        },
        {
            start: /(?=\([^\(]*?\)\s*\=\>)/,
            end: /(?<=\})/,
            rules: functionChild
        },
        {
            regex: /[\$\_a-zA-Z][\$\_a-zA-Z0-9]*\s*(?=\()/,
            token: 'variable.function'
        },
        {
            regex: /[\$\_a-zA-Z][\$\_a-zA-Z0-9]*\s*(?=\=\>)/,
            token: 'variable.parameter'
        },
        {
            regex: /\!|\+|\-|\*|\/|\%|\&|\||\~|\>|\<|\=|\?/,
            token: 'keyword.operator.js'
        },
        {
            regex: /\b(?:typeof|in|new)\b/,
            token: 'keyword.operator.js'
        },
        {
            regex: /\bthis\b|\bself\b/,
            token: 'variable.language.js'
        },
        {
            name: 'constantNumeric',
            regex: /\b(?:\d+|0[xX][a-zA-Z0-9]+)\b/,
            token: 'constant.numeric.js'
        },
        {
            regex: /\b(?:undefined|null|true|false|NaN|Infinity|globalThis)\b/,
            token: 'constant.language.js'
        },
        {
            start: /\(/,
            end: /\)/,
            prior: true,
            foldName: 'js-paren',
            rules: 'JavaScript'
        },
        {
            start: /\[/,
            end: /\]/,
            prior: true,
            foldName: 'js-bracket',
            rules: 'JavaScript'
        },
        {
            regex: /[\$\_a-zA-Z][\$\_a-zA-Z0-9]*/,
            token: 'variable.other.js'
        },
        //必须放到blockStmt前面
        {
            name: 'objectStmt',
            start: /(?<=\b(?:default|import|export|return|typeof|in|new)\s*|(?<!\=)\>|[\(\[\;\,\:\!\+\-\*\/\%\&\|\~\<\=\?]\s*)/,
            end: /(?=[^\{\s])/,
            prior: true,
            rules: [{
                start: /\{/,
                end: /\}/,
                prior: true,
                foldName: 'js-braces',
                rules: [
                    'inlineComment',
                    'blockComment',
                    'tplStr',
                    'singleStr',
                    'doubleStr',
                    'constantNumeric',
                    // 箭头函数，:function、:()=>
                    {
                        regex: /[\$\_a-zA-Z][\$\_a-zA-Z0-9]*(?=\s*\:\s*(?:function|\((?=[^\(]*?\=\>)))/,
                        startToken: 'entity.name.function'
                    },
                    // 属性函数，test(){}
                    {
                        start: /(?<=(?:^|\,|\{)\s*)[\$\_a-zA-Z][\$\_a-zA-Z0-9]*\s*(?=\()/,
                        end: /\,|(?=\})/,
                        prior: true,
                        startToken: 'entity.name.function',
                        rules: functionChild
                    },
                    {
                        start: /\[/,
                        end: /\]/,
                        prior: true,
                        token: 'variable.other.property.js',
                        rules: [
                            'tplStr',
                            'singleStr',
                            'doubleStr',
                            'constantNumeric'
                        ]
                    },
                    {
                        regex: /[\$\_a-zA-Z][\$\_a-zA-Z0-9]*/,
                        token: 'variable.other.property.js'
                    },
                    {
                        start: /\:/,
                        end: /\,|(?=\})/,
                        prior: true,
                        rules: 'JavaScript'
                    },
                ]
            }]
        },
        //必须放到倒数第一
        {
            name: 'blockStmt',
            start: /\{/,
            end: /\}/,
            prior: true,
            foldName: 'js-braces',
            rules: 'JavaScript'
        },
    ]
};

export default rule;