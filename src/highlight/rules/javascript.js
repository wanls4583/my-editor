const variable = `[\\$_a-zA-Z][\\$_a-zA-Z0-9]*?`
export default {
    pairLevel: 3,
    rules: [{
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
        }, {
            regex: new RegExp(`(${variable})\\s*?(?=\\([^\\)]*?\\)\\s*?\\{)`), //ie. test(){}
            token: 'js-function-name',
            level: 1
        }, {
            regex: new RegExp(`(?<=\\bfunction\\s+?)${variable}`), //ie. function test
            token: 'js-function-name',
            level: 1
        }, {
            regex: new RegExp(`(?<=\\bnew\\s+?)${variable}(?=\\s*?\\()`), //ie. new Test()
            token: 'js-new-class',
            level: 1
        }, {
            regex: /\bconst\b|\bcontinue\b|\bbreak\b|\bswitch\b|\bcase\b|\bdo\b|\belse\b|\bfor\b|\bif\b|\bnew\b|\breturn\b|\bfrom\b|\btypeof|\beach\b|\bin\b|\bimport\b|\bexport\b|\bdefault\b/,
            token: 'js-key',
            level: 2
        }, {
            regex: /\bclass\b/, //class {}
            token: 'js-class',
            level: 2
        }, {
            regex: /\bfunction\b/,
            token: 'js-function',
            level: 2
        }, {
            regex: /\/\/[\s\S]*$/,
            token: 'js-comment',
            level: 3
        },
        //多行注释
        {
            start: /\/\*/,
            next: /\*\//,
            token: 'js-comment'
        },
        //字符串``
        {
            start: /`/,
            next: /`/,
            token: 'js-string'
        },
        //字符串''
        {
            start: /'/,
            next: /'|[^\\]$|^$/,
            token: 'js-string'
        },
        //字符串"""
        {
            start: /"/,
            next: /"|[^\\]$|^$/,
            token: 'js-string'
        }
    ]
}