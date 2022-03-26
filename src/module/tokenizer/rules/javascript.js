const variable = `[\\$_a-zA-Z][\\$_a-zA-Z0-9]*`
const noScape = '(?:[^\\\\]|^)(?:\\\\\\\\)*';

const functionChild = [{
        start: '\\(',
        end: '\\)',
        foldName: 'js-paren',
        rules: [{
            regex: `${variable}`,
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
            start: '`',
            end: `(?<=${noScape})\``,
            token: 'string.quoted.other',
            foldName: 'js-string',
            rules: [{
                start: '\\$\\{',
                end: '\\}',
                foldName: 'js-string-expr',
                rules: 'JavaScript'
            }]
        },
        //字符串''
        {
            name: 'singleStr',
            start: /'/,
            end: `(?<=${noScape})(?:'|$)`,
            token: 'string.quoted.single.js',
            foldName: 'js-single-string'
        },
        //字符串"""
        {
            name: 'doubleStr',
            start: /"/,
            end: `(?<=${noScape})(?:"|$)`,
            token: 'string.quoted.double.js',
            foldName: 'js-double-string'
        },
        //多行注释
        {
            name: 'blockComment',
            start: '\\/\\*',
            end: '\\*\\/',
            token: 'comment.block.js',
            foldName: 'js-comment'
        },
        // 单行注释
        {
            name: 'inlineComment',
            regex: '\\/\\/[\\s\\S]*$',
            token: 'comment.line.double-slash.js'
        },
        // 正则表达式
        {
            start: '(?<=^|[\\(\\[\\{\\;\\,\\:\\!\\+\\-\\*\\/\\%\\&\\|\\~\\<\\=\\?]\\s*?)\\/',
            end: `(?<=${noScape})(?:\/|$)`,
            token: 'string.regexp.js',
            rules: [{
                regex: '\\\\[\\s\\S]',
                token: 'constant.character.escape.js'
            }]
        },
        {
            regex: /\b(?:var|let|const|class|function)\b/,
            token: 'storage.type.js'
        },
        {
            name: 'storageArrowType',
            regex: '\\=\\>',
            token: 'storage.type.js'
        },
        {
            regex: '\\b(?:continue|break|switch|case|do|while|else|for|if|new|return|from|import|export|default|module|with|throw|try|catch|finally)\\b',
            token: 'keyword.control.js'
        },
        {
            regex: '(?<=\\.)(?:toString|valueOf|toLocaleString|hasOwnProperty|isPrototypeOf|propertyIsEnumerable)\b',
            token: 'support.function.js'
        },
        {
            regex: '\\b[A-Z][a-zA-Z0-9]*?(?=\\.)', //Token.
            token: 'support.class.js'
        },
        {
            regex: '\\b(?:String|Number|Boolean|Array|Object|Map|Set|Date|Function|Promise|Proxy|RegExp|Error)\\b',
            token: 'support.class.js'
        },
        {
            regex: '\\b(?:window|document)\\b',
            token: 'support.class.js'
        },
        {
            regex: '\\b(?:Math|JSON)\\b',
            token: 'support.constant.js'
        }, {
            regex: '(?<=\\.)(?:prototype|exports)\\b',
            token: 'support.constant.js'
        },
        {
            start: `(?<=function\\s*?)${variable}`,
            end: '(?<=\\})',
            startToken: 'entity.name.function',
            rules: functionChild
        },
        {
            start: `(?<=\\s*?class\\s*?)(?:${variable})?`, //ie. calss Test{},
            end: '(?=[^\\{\\s])',
            startToken: 'entity.name.class.js',
            rules: [{
                start: '\\{',
                end: '\\}',
                foldName: 'js-braces',
                rules: [
                    'inlineComment',
                    'blockComment',
                    {
                        regex: '\\b(?:static|private|public|protected)\\b',
                        token: 'storage.modifier.js'
                    },
                    // 属性函数，test(){}
                    {
                        start: `${variable}`,
                        end: '(?<=\\})',
                        startToken: 'entity.name.function',
                        rules: functionChild
                    },
                ]
            }]
        },
        {
            start: '(?=\\([^\\(]*?\\)\\s*\\=\\>)',
            end: '(?<=\\})',
            rules: functionChild
        },
        {
            regex: `${variable}\\s*(?=\\()`,
            token: 'variable.function'
        },
        {
            regex: `${variable}\\s*(?=\\=\\>)`,
            token: 'variable.parameter'
        },
        {
            regex: '\\!|\\+|\\-|\\*|\\/|\\%|\\&|\\||\\~|\\>|\\<|\\=|\\?',
            token: 'keyword.operator.js'
        },
        {
            regex: '\\b(?:typeof|in|new)\\b',
            token: 'keyword.operator.js'
        },
        {
            regex: '\\bthis\\b|\\bself\\b',
            token: 'variable.language.js'
        },
        {
            name: 'constantNumeric',
            regex: '\\b(?:\\d+|0[xX][a-zA-Z0-9]+)\\b',
            token: 'constant.numeric.js'
        },
        {
            regex: '\\b(?:undefined|null|true|false|NaN|Infinity|globalThis)\\b',
            token: 'constant.language.js'
        },
        {
            start: '\\(',
            end: '\\)',
            foldName: 'js-paren',
            rules: 'JavaScript'
        },
        {
            start: '\\[',
            end: '\\]',
            foldName: 'js-bracket',
            rules: 'JavaScript'
        },
        {
            regex: `${variable}`,
            token: 'variable.other.js'
        },
        //对象字面量必须放到blockStmt前面
        {
            start: '(?<=\\b(?:default|import|export|return|typeof|in|new)\\s*|(?<!\\=)\\>|[\\(\\[\\;\\,\\:\\!\\+\\-\\*\\/\\%\\&\\|\\~\\<\\=\\?]\\s*)',
            end: '(?=[^\\{\\s])',
            rules: [{
                start: '\\{',
                end: '\\}',
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
                        regex: `${variable}(?=\\s*\\:\\s*(?:function|\\((?=[^\\(]*?\\=\\>)))`,
                        startToken: 'entity.name.function'
                    },
                    // 属性函数，test(){}
                    {
                        start: `(?<=(?:^|\\,|\\{)\\s*)${variable}\\s*(?=\\()`,
                        end: '\\,|(?=\\})',
                        startToken: 'entity.name.function',
                        rules: functionChild
                    },
                    {
                        start: '\\[',
                        end: '\\]',
                        token: 'variable.other.property.js',
                        rules: [
                            'tplStr',
                            'singleStr',
                            'doubleStr',
                            'constantNumeric'
                        ]
                    },
                    {
                        regex: `${variable}`,
                        token: 'variable.other.property.js'
                    },
                    {
                        start: '\\:',
                        end: '\\,|(?=\\})',
                        rules: 'JavaScript'
                    },
                ]
            }]
        },
        //必须放到倒数第一
        {
            name: 'blockStmt',
            start: '\\{',
            end: '\\}',
            foldName: 'js-braces',
            rules: 'JavaScript'
        },
    ]
};

export default rule;