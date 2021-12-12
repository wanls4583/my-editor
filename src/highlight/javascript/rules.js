export default {
    pairLevel: 3,
    rules: [{
            regex: /\bwindow\b|\bdocument\b/g,
            token: 'local-var',
            level: 0
        }, {
            regex: /\bthis\b|\bself\b/g,
            token: 'this',
            level: 0
        }, {
            regex: /\+|\-|\*|\/|\=|\!|>|<|\&|\||\?/g,
            token: 'oprator',
            level: 0
        }, {
            regex: /\b\d+\b|\b0[xX][a-zA-Z0-9]*?\b|\bundefined\b|\bnull\b/g,
            token: 'number',
            level: 0
        }, {
            regex: /\bvar\b/g,
            token: 'type',
            level: 0
        }, {
            regex: /([\$_a-zA-Z][\$_a-zA-Z0-9]*?)(?=\()/g, //ie. test(),.test()
            token: 'exec-function',
            level: 0
        }, {
            regex: /(?<=\s*?class\s*?)[\$_a-zA-Z][\$_a-zA-Z0-9]*?(?=\s*?\{)/g, //ie. calss Test{}
            token: 'class-name',
            level: 0
        }, {
            regex: /([\$_a-zA-Z][\$_a-zA-Z0-9]*?)\s*?(?=\([^\)]*?\)\s*?\{)/g, //ie. test(){}
            token: 'function-name',
            level: 1
        }, {
            regex: /(?<=function\s*)[\$_a-zA-Z][\$_a-zA-Z0-9]*?/g, //ie. function test
            token: 'function-name',
            level: 1
        }, {
            regex: /(?<=\s*?new\s*?)[\$_a-zA-Z][\$_a-zA-Z0-9]*?(?=\s*?\()/g, //ie. new Test()
            token: 'new-class',
            level: 1
        }, {
            regex: /\bconst\b|\bcontinue\b|\bbreak\b|\bswitch\b|\bcase\b|\bdo\b|\belse\b|\bfor\b|\bif\b|\bnew\b|\breturn\b|\bfrom\b|\btypeof|\beach\b|\bin\b|\bimport\b|\bexport\b|\bdefault\b/g,
            token: 'key',
            level: 2
        }, {
            regex: /\b(class)\b/g, //class {}
            token: 'class',
            level: 2
        }, {
            regex: /\bfunction\b/g,
            token: 'function',
            level: 2
        }, {
            regex: /\/\/[\s\S]*$/g,
            token: 'comment',
            level: 3
        }, {
            regex: /`[^`]*`/g,
            token: 'pair-string',
            level: 3
        }, {
            regex: /'[^']*'/g,
            token: 'single-quotation-string',
            level: 3
        }, {
            regex: /"[^"]*"/g,
            token: 'double-quotation-string',
            level: 3
        },
        //多行注释
        {
            start: /\/\*/g,
            next: /\*\//g,
            token: 'pair-comment'
        },
        //字符串``
        {
            start: /`/g,
            next: /`/g,
            token: 'pair-string'
        },
        //字符串''
        {
            start: /'/g,
            next: /'|[^\\]$/g,
            token: 'single-quotation-string'
        },
        //字符串"""
        {
            start: /"/g,
            next: /"|[^\\]$/g,
            token: 'double-quotation-string'
        }
    ]
}