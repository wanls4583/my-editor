/*
 * @Author: lisong
 * @Date: 2021-12-10 09:31:38
 * @Description: 
 */
import jsRules from './javascript.js';
import cssRules from './css.js';

const styleRules = [{
    regex: /[a-zA-Z_][a-zA-Z-]*?(?=\s*?\:)/,
    token: 'support.type.property-name.css'
}, {
    start: /\:/,
    end: /\;/,
    startToken: 'punctuation.separator.key-value.css',
    endToken: 'punctuation.terminator.rule.css',
    childRule: {
        rules: [{
            regex: /(?:\d+(?:\.\d*)?|\.\d+)/,
            token: 'constant.numeric.css'
        }, {
            regex: /(?<=\d)(?:px|%)/,
            token: 'keyword.other.unit.css'
        }, {
            regex: /\#[a-zA-Z0-9]+/,
            token: 'constant.other.color.rgb-value.css'
        }, {
            regex: /[^\s\:\;\{\}'"]+/,
            token: 'support.constant.property-value.css'
        }, {
            regex: /\b"[^"]*?"\b/,
            token: 'support.constant.property-value.string.quoted.double.css'
        }, {
            regex: /\b'[^']*?'\b/,
            token: 'support.constant.property-value.string.quoted.single.css'
        }]
    }
}];

const attrRules = [{
        regex: /(?<=\<)[a-zA-Z][a-zA-Z0-9\-]*/,
        token: 'entity.name.tag.html',
        foldName: tagFoldName,
        foldType: -1
    },
    {
        regex: /(?<=\<\/)[a-zA-Z][a-zA-Z0-9\-]*/,
        token: 'entity.name.tag.html',
        foldName: tagFoldName,
        foldType: 1
    }, {
        regex: /\b[a-zA-Z][a-zA-Z-]*/,
        token: 'entity.other.attribute-name.html'
    },
    {
        start: /(?<=\sstyle\s*?\=\s*?)'/,
        end: /(?<=(?:[^\\]|^)(?:\\\\)*)'/,
        startToken: 'string.quoted.single.html',
        endToken: 'string.quoted.single.html',
        ruleName: 'Style',
        level: 1,
        childRule: {
            rules: styleRules
        }
    },
    {
        start: /(?<=\sstyle\s*?\=\s*?)"/,
        end: /(?<=(?:[^\\]|^)(?:\\\\)*)"/,
        startToken: 'string.quoted.double.html',
        endToken: 'string.quoted.double.html',
        ruleName: 'Style',
        level: 1,
        childRule: {
            rules: styleRules
        }
    },
    {
        start: /'/,
        end: /(?<=(?:[^\\]|^)(?:\\\\)*)'/,
        token: 'string.quoted.single.html',
        level: 1
    },
    {
        start: /"/,
        end: /(?<=(?:[^\\]|^)(?:\\\\)*)"/,
        token: 'string.quoted.double.html',
        level: 1
    }
];

const endTatAttrRules = [{
    regex: /(?<=\<)[a-zA-Z][a-zA-Z0-9\-]*/,
    token: 'entity.name.tag.html',
    foldName: tagFoldName,
    foldType: -1
}, {
    regex: /(?<=\<\/)[a-zA-Z][a-zA-Z0-9\-]*/,
    token: 'entity.name.tag.html',
    foldName: tagFoldName,
    foldType: 1
}];

const scriptStart = {
    start: /\<(?=script\b)/,
    end: /\>/,
    startToken: 'punctuation.definition.tag.open.html',
    endToken: 'punctuation.definition.tag.end.html',
    ruleName: 'Attribute',
    childRule: {
        rules: attrRules
    }
}

const scriptEnd = {
    start: /\<\/(?=script\>)/,
    end: /\>/,
    startToken: 'punctuation.definition.tag.open.html',
    endToken: 'punctuation.definition.tag.end.html',
    childRule: {
        rules: endTatAttrRules
    }
}

const styleStart = {
    start: /\<(?=style\b)/,
    end: /\>/,
    startToken: 'punctuation.definition.tag.open.html',
    endToken: 'punctuation.definition.tag.end.html',
    ruleName: 'Attribute',
    childRule: {
        rules: attrRules
    }
}

const styleEnd = {
    start: /\<\/(?=style\s*?\>)/,
    end: /\>/,
    startToken: 'punctuation.definition.tag.open.html',
    endToken: 'punctuation.definition.tag.end.html',
    childRule: {
        rules: endTatAttrRules
    }
}

function tagFoldName(e) {
    if (/hr|br|meta|img|link|input/i.exec(e.value)) { //单标签，不折叠
        return '';
    }
    return e.value;
}

export default {
    rules: [{
        start: scriptStart,
        end: scriptEnd,
        ruleName: 'JavaScript',
        childRule: jsRules
    }, {
        start: styleStart,
        end: styleEnd,
        ruleName: 'CSS',
        childRule: cssRules
    }, {
        start: /\<\/?(?=[a-zA-Z][a-zA-Z0-9\-]*)/,
        end: /\/?\>/,
        startToken: 'punctuation.definition.tag.open.html',
        endToken: 'punctuation.definition.tag.end.html',
        ruleName: 'Attribute',
        childRule: {
            rules: attrRules
        }
    }, {
        start: /\<\!\-\-/,
        end: /\-\-\>/,
        token: 'comment.block.html',
        foldName: 'xml-comment'
    }]
}