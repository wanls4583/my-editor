const variable = `[\\$_a-zA-Z][\\$_a-zA-Z0-9]*`
const tplStrChild = {};
const objectChild = {};
const functionChild = {};
const blockChild = {};
const tplStr = {
    start: /`/,
    end: /(?<=[^\\](?:\\\\)*)`|^`/,
    token: 'string.quoted.other',
    foldName: 'js-string',
    childRule: {
        rules: [{
            start: /\$\{/,
            end: /\}/,
            foldName: 'js-string-expr',
            prior: true,
            childRule: tplStrChild
        }]
    }
};
const singleStr = {
    start: /'/,
    end: /(?<=(?:[^\\]|^)(?:\\\\)*)(?:'|$)/,
    token: 'string.quoted.single.js',
    foldName: 'js-single-string'
};
const doubleStr = {
    start: /"/,
    end: /(?<=(?:[^\\]|^)(?:\\\\)*)(?:"|$)/,
    token: 'string.quoted.double.js',
    foldName: 'js-double-string'
};
const blockComment = {
    start: /\/\*/,
    end: /\*\//,
    token: 'comment.block.js',
    foldName: 'js-comment'
};
const inlineComment = {
    regex: /\/\/[\s\S]*$/,
    token: 'comment.line.double-slash.js'
};
const regExpression = {
    start: /(?<=^|[\(\{\[\;\,\:\?\!\+\-\*\%\=\>\<\&\|]\s*?)\//,
    end: /(?<=[^\\](?:\\\\)*)\/|$/,
    token: 'string.regexp.js',
    childRule: {
        rules: [{
            regex: /\\[\s\S]/,
            token: 'constant.character.escape.js'
        }]
    }
};
const storageType = {
    regex: /\b(?:var|let|const|class|function)\b/,
    token: 'storage.type.js'
};
const storageArrowType = {
    regex: /\=\>/,
    token: 'storage.type.js'
};
const entityClass = {
    regex: new RegExp(`(?<=\\s*?class\\s*?)${variable}`), //ie. calss Test{}
    token: 'entity.name.class.js'
};
const keyword = {
    regex: /\b(?:continue|break|switch|case|do|while|else|for|if|new|return|from|import|export|default|module|with|throw|try|catch|finally)\b/,
    token: 'keyword.control.js'
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
const supportFunction = {
    regex: /(?<=\.)(?:toString|valueOf|toLocaleString|hasOwnProperty|isPrototypeOf|propertyIsEnumerable)\b/,
    token: 'support.function.js'
};
const variableLanguage = {
    regex: /\bthis\b|\bself\b/,
    token: 'variable.language.js'
};
const constantNumeric = {
    regex: /\b(?:\d+|0[xX][a-zA-Z0-9]+)\b/,
    token: 'constant.numeric.js'
};
const constantLanguage = {
    regex: /\b(?:undefined|null|true|false|NaN|Infinity|globalThis)\b/,
    token: 'constant.language.js'
};
const variableOhter = {
    regex: /[\$\_a-zA-Z][\$\_a-zA-Z0-9]*/,
    token: 'variable.other.js'
};
const aboutFunction = [{
        start: /(?<=function\s*?)[\$\_a-zA-Z][\$\_a-zA-Z0-9]*/,
        end: /(?<=\})/,
        startToken: 'entity.name.function',
        childRule: functionChild,
    },
    {
        start: /(?=\([^\(]*?\)\s*\=\>)/,
        end: /(?<=\})/,
        childRule: functionChild
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
const objectStmt = {
    start: /(?<=\b(?:default|import|export|return|typeof|in|new)\s*|(?<!\=)\>|[\(\[\;\,\:\!\+\-\*\/\%\&\|\~\<\=\?]\s*)/,
    end: /(?=[^\{\s])/,
    prior: true,
    childRule: objectChild
};
const blockStmt = {
    start: /\{/,
    end: /\}/,
    prior: true,
    foldName: 'js-braces',
    childRule: blockChild
};
const parenStmt = {
    start: /\(/,
    end: /\)/,
    prior: true,
    foldName: 'js-paren',
    childRule: blockChild
};
const bracketStmt = {
    start: /\[/,
    end: /\]/,
    prior: true,
    foldName: 'js-bracket',
    childRule: blockChild
};
const rules = [
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
    ...aboutFunction,
    ...operator,
    ...supportClass,
    ...supportConstant,
    supportFunction,
    variableLanguage,
    constantNumeric,
    constantLanguage,
    blockStmt,
    parenStmt,
    bracketStmt,
    variableOhter,
    objectStmt, //必须放到最后
];

tplStrChild.rules = rules;

blockChild.rules = rules;

functionChild.rules = [{
        start: /\(/,
        end: /\)/,
        prior: true,
        foldName: 'js-paren',
        childRule: {
            rules: [{
                regex: /[\$\_a-zA-Z][\$\_a-zA-Z0-9]*/,
                token: 'variable.parameter'
            }]
        }
    },
    storageArrowType,
    blockStmt
];

objectChild.rules = [{
    start: /\{/,
    end: /\}/,
    prior: true,
    childRule: {
        rules: [
            inlineComment,
            blockComment,
            tplStr,
            singleStr,
            doubleStr,
            constantNumeric,
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
                childRule: functionChild
            },
            {
                start: /\[/,
                end: /\]/,
                prior: true,
                token: 'variable.other.property.js',
                childRule: {
                    rules: [
                        tplStr,
                        singleStr,
                        doubleStr,
                        constantNumeric
                    ]
                }
            },
            {
                regex: /[\$\_a-zA-Z][\$\_a-zA-Z0-9]*/,
                token: 'variable.other.property.js'
            },
            {
                start: /\:/,
                end: /\,|(?=\})/,
                prior: true,
                childRule: {
                    rules: rules
                }
            },
        ]
    }
}];

export default {
    rules: rules
}