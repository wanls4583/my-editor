export const rules = [{
    reg: /\bwindow\b|\bdocument\b/g,
    token: 'local-var',
    level: 0
}, {
    reg: /\bthis\b|\bself\b/g,
    token: 'this',
    level: 0
}, {
    reg: /\+|\-|\*|\/|\=|\!|>|<|\&|\||\?/g,
    token: 'oprator',
    level: 0
}, {
    reg: /\b\d+\b|\b0[xX][a-zA-Z0-9]*?\b|\bundefined\b|\bnull\b/g,
    token: 'number',
    level: 0
}, {
    reg: /\bvar\b/g,
    token: 'type',
    level: 0
}, {
    reg: /([\$_a-zA-Z][\$_a-zA-Z0-9]*?)(?=\()/g, //ie. test(),.test()
    token: 'exec-function',
    level: 0
}, {
    reg: /(?<=\s*?class\s*?)[\$_a-zA-Z][\$_a-zA-Z0-9]*?(?=\s*?\{)/g, //ie. calss Test{}
    token: 'class-name',
    level: 0
}, {
    reg: /([\$_a-zA-Z][\$_a-zA-Z0-9]*?)\s*?(?=\([^\)]*?\)\s*?\{)/g, //ie. test(){}
    token: 'function-name',
    level: 1
}, {
    reg: /(?<=function\s*)[\$_a-zA-Z][\$_a-zA-Z0-9]*?/g, //ie. function test
    token: 'function-name',
    level: 1
}, {
    reg: /(?<=\s*?new\s*?)[\$_a-zA-Z][\$_a-zA-Z0-9]*?(?=\s*?\()/g, //ie. new Test()
    token: 'new-class',
    level: 1
}, {
    reg: /\bconst\b|\bcontinue\b|\bbreak\b|\bswitch\b|\bcase\b|\bdo\b|\belse\b|\bfor\b|\bif\b|\bnew\b|\breturn\b|\bfrom\b|\btypeof|\beach\b|\bin\b|\bimport\b|\bexport\b|\bdefault\b/g,
    token: 'key',
    level: 2
}, {
    reg: /\b(class)\b/g, //class {}
    token: 'class',
    level: 2
}, {
    reg: /\bfunction\b/g,
    token: 'function',
    level: 2
}, {
    reg: /\/\/[\s\S]*$|\/\*[\s\S]*\*\/|\/\*[\s\S]*$/g,
    token: 'comment',
    level: 3
}, {
    reg: /`[\s\S]*`/g,
    token: 'pair-string',
    level: 3
}, {
    reg: /'[\s\S]*'/g,
    token: 'single-quotation-string',
    level: 3
}, {
    reg: /'"[\s\S]*"/g,
    token: 'double-quotation-string',
    level: 3
}]

export const pairRules = [
    //多行注释
    {
        startReg: /\/\*/g,
        endReg: /\*\//g,
        token: 'pair-comment',
        level: 3
    },
    //字符串``
    {
        startReg: /`/g,
        endReg: /`/g,
        token: 'pair-string',
        level: 3
    },
    //字符串''
    {
        startReg: /'[\s\S]*\\/g,
        endReg: /'/g,
        token: 'single-quotation-string',
        check: function (startToken, endToken, texts) { // 中间部分的检测函数
            for (let i = 1; i < texts.length - 1; i++) {
                if (texts[i][texts[i].length - 1] != '\\') {
                    return false;
                }
            }
            return true;
        },
        level: 3
    },
    //字符串"""
    {
        startReg: /'[\s\S]*\\/g,
        endReg: /"/g,
        token: 'double-quotation-string',
        check: function (startToken, endToken, texts) { // 中间部分的检测函数
            for (let i = 1; i < texts.length - 1; i++) {
                if (texts[i][texts[i].length - 1] != '\\') {
                    return false;
                }
            }
            return true;
        },
        level: 3
    }
]