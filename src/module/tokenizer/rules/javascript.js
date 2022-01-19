import Util from "../../../common/Util";

const variable = `[\\$_a-zA-Z][\\$_a-zA-Z0-9]*?`
const strValid = function (e) {
    let value = e.value;
    if (e.side === 'end' && value[0] === '\\' && value.length % 2 === 0) {
        return false;
    }
    return true;
}
const tplStrChild = {};
//字符串``
const tplStrReg = {
    start: /`/,
    end: /\\*?`/,
    token: 'js-string',
    plainToken: 'js-string',
    foldName: 'js-string',
    valid: strValid,
    childRule: {
        rules: [{
            start: /\$\{/,
            end: /\}/,
            foldName: 'js-string-expr',
            level: 1,
            childRule: tplStrChild
        }]
    }
};
// 正则字面量
const regexp = {
    start: /(?<=^|[\(\{\[\;\,\:\?\!\+\-\*\%\=\>\<\&\|]\s*?)\//,
    end: /(?<=(?:\\[\s\S]|[^\\])+?)\/|$/,
    childRule: {
        rules: [{
            regex: /\\b/,
            token: 'js-regex-ctrl'
        }, {
            regex: /\\[\s\S]/,
            token: 'js-regex-escape'
        }, {
            regex: /\?\=|\?\<\=|\?\!|\?\<\!/,
            token: 'js-regex'
        }, {
            regex: /\*|\^|\$|\?/,
            token: 'js-regex-ctrl'
        }, {
            start: /\[/,
            end: /(?<!\\)\]/,
            token: 'js-regex-bracket',
            childRule: {
                rules: [{
                    regex: /\^/,
                    token: 'js-regex-ctrl',
                    valid: function (option) {
                        let text = option.text;
                        let index = option.index;
                        if (text[index - 1] === '[' && text[index - 2] !== '\\') {
                            return true;
                        }
                        return false;
                    }
                }]
            }
        }]
    },
    token: 'js-regex'
}
const rules = [
    tplStrReg,
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
    },
    //多行注释
    {
        start: /\/\*/,
        end: /\*\//,
        token: 'js-comment',
        foldName: 'js-comment'
    }, {
        regex: /\/\/[\s\S]*$/,
        token: 'js-comment'
    },
    regexp,
    {
        regex: /\bvar\b|\blet\b|\bconst\b/,
        token: 'js-type'
    },
    {
        regex: /\bcontinue\b|\bbreak\b|\bswitch\b|\bcase\b|\bdo\b|\bwhile\b|\belse\b|\bfor\b|\bif\b|\bnew\b|\breturn\b|\bfrom\b|\btypeof|\beach\b|\bin\b|\bimport\b|\bexport\b|\bdefault\b|\bwith\b|\bthrow\b|\btry\b|\bcatch\b|\bfinally\b/,
        token: 'js-key'
    }, {
        regex: /\bclass\b/, //class {}
        token: 'js-class'
    }, {
        regex: /\b[A-Z][\\$_a-zA-Z0-9]*?(?=\.)/, //Token.
        token: 'js-function-class'
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
        regex: /(?<=\.)(?:prototype\b|toString\b|valueOf\b|toLocaleString\b|hasOwnProperty\b|isPrototypeOf\b|propertyIsEnumerable\b)/,
        token: 'js-local'
    }, {
        regex: /\bwindow\b|\bdocument\b/,
        token: 'js-local'
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
        regex: new RegExp(`(${variable})(?=\\()`), //ie. test(),.test()
        token: 'js-function-exec'
    }, {
        regex: new RegExp(`(?<=\\s*?class\\s*?)${variable}(?=\\s*?\\{)`), //ie. calss Test{}
        token: 'js-class-name'
    }
];
tplStrChild.rules = rules;

export default {
    rules: rules
}