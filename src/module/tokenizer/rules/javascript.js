const variable = `[\\$_a-zA-Z][\\$_a-zA-Z0-9]*?`
const strValid = function (e) {
    let value = e.value;
    if (e.side === 'end' && value[0] === '\\' && value.length % 2 === 0) {
        return false;
    }
    return true;
}
export default {
    rules: [{
            regex: /\/[\s\S]*?[^\\]\//,
            token: 'js-regex'
        }, //多行注释
        {
            start: /\/\*/,
            end: /\*\//,
            token: 'js-comment',
            foldName: 'js-comment'
        },
        //字符串``
        {
            start: /`/,
            end: /\\*?`/,
            token: 'js-string',
            foldName: 'js-string',
            valid: strValid
        },
        //字符串''
        {
            start: /'/,
            end: /\\*?'|[^\\]$|^$/,
            token: 'js-string',
            foldName: 'js-single-string',
            valid: strValid
        },
        //字符串"""
        {
            start: /"/,
            end: /"\\*?|[^\\]$|^$/,
            token: 'js-string',
            foldName: 'js-double-string',
            valid: strValid
        }, {
            regex: /\/\/[\s\S]*$/,
            token: 'js-comment'
        }, {
            regex: /\bconst\b|\bcontinue\b|\bbreak\b|\bswitch\b|\bcase\b|\bdo\b|\bwhile\b|\belse\b|\bfor\b|\bif\b|\bnew\b|\breturn\b|\bfrom\b|\btypeof|\beach\b|\bin\b|\bimport\b|\bexport\b|\bdefault\b|\bwith\b/,
            token: 'js-key'
        }, {
            regex: /\bclass\b/, //class {}
            token: 'js-class'
        }, {
            regex: /\bfunction\b/,
            token: 'js-function'
        }, {
            regex: new RegExp(`(${variable})\\s*?(?=\\([^\\)]*?\\)\\s*?\\{)`), //ie. test(){}
            token: 'js-function-name'
        }, {
            regex: new RegExp(`(?<=\\bfunction\\s+?)${variable}`), //ie. function test
            token: 'js-function-name'
        }, {
            regex: new RegExp(`(?<=\\bnew\\s+?)${variable}(?=\\s*?\\()`), //ie. new Test()
            token: 'js-new-class'
        }, {
            regex: /(\{)|(\[)|(\()/,
            token: ['js-lbraces', 'js-lbracket', 'js-lparen'],
            foldType: -1,
            foldName: ['js-braces', 'js-bracket', 'js-paren']
        }, {
            regex: /(\})|(\])|(\))/,
            token: ['js-rbraces', 'js-rbracket', 'js-rparen'],
            foldType: 1,
            foldName: ['js-braces', 'js-bracket', 'js-paren']
        }, {
            regex: /\bwindow\b|\bdocument\b/,
            token: 'js-local-var'
        }, {
            regex: /\bthis\b|\bself\b/,
            token: 'js-this'
        }, {
            regex: /\+|\-|\*|\/|\=|\!|>|<|\&|\||\?/,
            token: 'js-oprator'
        }, {
            regex: new RegExp(`\\b\\d+\\b|\\b0[xX][a-zA-Z0-9]*?\\b|\\bundefined\\b|\\bnull\\b|\\btrue\\b|\\bfalse\\b|\\bNaN\\b`),
            token: 'js-number'
        }, {
            regex: /\bvar\b/,
            token: 'js-type'
        }, {
            regex: new RegExp(`(${variable})(?=\\()`), //ie. test(),.test()
            token: 'js-function-exec'
        }, {
            regex: new RegExp(`(?<=\\s*?class\\s*?)${variable}(?=\\s*?\\{)`), //ie. calss Test{}
            token: 'js-class-name'
        }
    ]
}