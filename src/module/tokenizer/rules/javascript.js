const variable = `[\\$_a-zA-Z][\\$_a-zA-Z0-9]*`
const tplStr = {
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
};
const singleStr = {
    name: 'singleStr',
    start: /'/,
    end: /(?<=(?:[^\\]|^)(?:\\\\)*)(?:'|$)/,
    token: 'string.quoted.single.js',
    foldName: 'js-single-string'
};
const doubleStr = {
    name: 'doubleStr',
    start: /"/,
    end: /(?<=(?:[^\\]|^)(?:\\\\)*)(?:"|$)/,
    token: 'string.quoted.double.js',
    foldName: 'js-double-string'
};
const blockComment = {
    name: 'blockComment',
    start: /\/\*/,
    end: /\*\//,
    token: 'comment.block.js',
    foldName: 'js-comment'
};
const inlineComment = {
    name: 'inlineComment',
    regex: /\/\/[\s\S]*$/,
    token: 'comment.line.double-slash.js'
};
const regExpression = {
    start: /(?<=^|[\(\{\[\;\,\:\?\!\+\-\*\%\=\>\<\&\|]\s*?)\//,
    end: /(?<=[^\\](?:\\\\)*)\/|$/,
    token: 'string.regexp.js',
    rules: [{
        regex: /\\[\s\S]/,
        token: 'constant.character.escape.js'
    }]
};
const storageType = {
    regex: /\b(?:var|let|const|class|function)\b/,
    token: 'storage.type.js'
};
const storageArrowType = {
    name: 'storageArrowType',
    regex: /\=\>/,
    token: 'storage.type.js'
};
const keyword = {
    regex: /\b(?:continue|break|switch|case|do|while|else|for|if|new|return|from|import|export|default|module|with|throw|try|catch|finally)\b/,
    token: 'keyword.control.js'
};
const entityClass = {
    regex: new RegExp(`(?<=\\s*?class\\s*?)${variable}`), //ie. calss Test{}
    token: 'entity.name.class.js'
};
const supportFunction = {
    regex: /(?<=\.)(?:toString|valueOf|toLocaleString|hasOwnProperty|isPrototypeOf|propertyIsEnumerable)\b/,
    token: 'support.function.js'
};
const supportClass = [{
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
    }
];
const supportConstant = [{
    regex: /\b(?:Math|JSON)\b/,
    token: 'support.constant.js'
}, {
    regex: /(?<=\.)(?:prototype|exports)\b/,
    token: 'support.constant.js'
}];
const variableLanguage = {
    regex: /\bthis\b|\bself\b/,
    token: 'variable.language.js'
};
const constantNumeric = {
    name: 'constantNumeric',
    regex: /\b(?:\d+|0[xX][a-zA-Z0-9]+)\b/,
    token: 'constant.numeric.js'
};
const constantLanguage = {
    regex: /\b(?:undefined|null|true|false|NaN|Infinity|globalThis)\b/,
    token: 'constant.language.js'
};
const parenStmt = {
    start: /\(/,
    end: /\)/,
    prior: true,
    foldName: 'js-paren',
    rules: 'JavaScript'
};
const bracketStmt = {
    start: /\[/,
    end: /\]/,
    prior: true,
    foldName: 'js-bracket',
    rules: 'JavaScript'
};
const variableOhter = {
    regex: /(?<=\s*)[\$\_a-zA-Z][\$\_a-zA-Z0-9]*/,
    token: 'variable.other.js'
};
const operator = [{
        regex: /\!|\+|\-|\*|\/|\%|\&|\||\~|\>|\<|\=|\?/,
        token: 'keyword.operator.js'
    },
    {
        regex: /\b(?:typeof|in|new)\b/,
        token: 'keyword.operator.js'
    }
];
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
const aboutFunction = [{
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
    }
];
const blockStmt = {
    name: 'blockStmt',
    start: /\{/,
    end: /\}/,
    prior: true,
    foldName: 'js-braces',
    rules: 'JavaScript'
};
const objectStmt = {
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
};
const rule = {
    name: 'JavaScript',
    rules: [
        //字符串``
        tplStr,
        //字符串''
        singleStr,
        //字符串"""
        doubleStr,
        //多行注释
        blockComment,
        // 单行注释
        inlineComment,
        // 正则表达式
        regExpression,
        storageType,
        storageArrowType,
        keyword,
        entityClass,
        supportFunction,
        ...supportClass,
        ...supportConstant,
        ...aboutFunction,
        ...operator,
        variableLanguage,
        constantNumeric,
        constantLanguage,
        parenStmt,
        bracketStmt,
        variableOhter,
        objectStmt, //必须放到倒数第二
        blockStmt, //必须放到倒数第一 
    ]
};

export default rule;