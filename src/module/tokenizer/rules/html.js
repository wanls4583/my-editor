/*
 * @Author: lisong
 * @Date: 2021-12-10 09:31:38
 * @Description: 
 */
import jsRule from './javascript.js';
import cssRule from './css.js';

const noEscape = '(?:[^\\\\]|^)(?:\\\\\\\\)*';
const attrName = '[a-zA-Z][a-zA-Z0-9\\-]*';

const styleRules = [{
    regex: `[a-zA-Z_][a-zA-Z-]*?(?=\\s*?\\:)`,
    token: 'support.type.property-name.css'
}, {
    start: `\\:`,
    end: `\\;`,
    startToken: 'punctuation.separator.key-value.css',
    endToken: 'punctuation.terminator.rule.css',
    rules: [{
        regex: `[\\-\\+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)`,
        token: 'constant.numeric.css'
    }, {
        regex: `(?<=\\d)(?:px|%)`,
        token: 'keyword.other.unit.css'
    }, {
        regex: `\\#[a-zA-Z0-9]+`,
        token: 'constant.other.color.rgb-value.css'
    }, {
        regex: `[^\\s\\:\\;\\{\\}'"]+`,
        token: 'support.constant.property-value.css'
    }, {
        regex: `\\b"[^"]*?"\\b`,
        token: 'support.constant.property-value.string.quoted.double.css'
    }, {
        regex: `\\b'[^']*?'\\b`,
        token: 'support.constant.property-value.string.quoted.single.css'
    }]
}];

const attrRules = [{
        regex: `(?<=\\<)${attrName}`,
        token: 'entity.name.tag.html',
        foldName: tagFoldName,
        foldType: -1
    },
    {
        regex: `(?<=\\<\\/)${attrName}`,
        token: 'entity.name.tag.html',
        foldName: tagFoldName,
        foldType: 1
    }, {
        regex: `\\b[a-zA-Z][a-zA-Z-]*`,
        token: 'entity.other.attribute-name.html'
    },
    {
        start: `(?<=\\sstyle\\s*?\\=\\s*?)'`,
        end: `(?<=${noEscape})'`,
        prior: true,
        startToken: 'string.quoted.single.html',
        endToken: 'string.quoted.single.html',
        name: 'Style',
        level: 1,
        rules: styleRules
    },
    {
        start: `(?<=\\sstyle\\s*?\\=\\s*?)"`,
        end: `(?<=${noEscape})"`,
        prior: true,
        startToken: 'string.quoted.double.html',
        endToken: 'string.quoted.double.html',
        name: 'Style',
        level: 1,
        rules: styleRules
    },
    {
        start: `'`,
        end: `(?<=${noEscape})'`,
        token: 'string.quoted.single.html',
        level: 1
    },
    {
        start: `"`,
        end: `(?<=${noEscape})"`,
        token: 'string.quoted.double.html',
        level: 1
    }
];

const endTatAttrRules = [{
    regex: `(?<=\\<)${attrName}`,
    token: 'entity.name.tag.html',
    foldName: tagFoldName,
    foldType: -1
}, {
    regex: `(?<=\\<\\/)${attrName}`,
    token: 'entity.name.tag.html',
    foldName: tagFoldName,
    foldType: 1
}];

const scriptStart = {
    start: `\\<(?=script\\b)`,
    end: `\\>`,
    startToken: 'punctuation.definition.tag.open.html',
    endToken: 'punctuation.definition.tag.end.html',
    name: 'Attribute',
    rules: attrRules
}

const scriptEnd = {
    start: `\\<\\/(?=script\\>)`,
    end: `\\>`,
    prior: true,
    startToken: 'punctuation.definition.tag.open.html',
    endToken: 'punctuation.definition.tag.end.html',
    rules: endTatAttrRules
}

const styleStart = {
    start: `\\<(?=style\\b)`,
    end: `\\>`,
    startToken: 'punctuation.definition.tag.open.html',
    endToken: 'punctuation.definition.tag.end.html',
    name: 'Attribute',
    rules: attrRules
}

const styleEnd = {
    start: `\\<\\/(?=style\\s*?\\>)`,
    end: `\\>`,
    prior: true,
    startToken: 'punctuation.definition.tag.open.html',
    endToken: 'punctuation.definition.tag.end.html',
    rules: endTatAttrRules
}

function tagFoldName(e) {
    if (/hr|br|meta|img|link|input/i.exec(e.value)) { //单标签，不折叠
        return '';
    }
    return e.value;
}

export default {
    name: 'HTML',
    rules: [{
        start: scriptStart,
        end: scriptEnd,
        name: jsRule.name,
        rules: jsRule.rules
    }, {
        start: styleStart,
        end: styleEnd,
        name: cssRule.name,
        rules: cssRule.rules
    }, {
        start: `\\<\\/?(?=${attrName})`,
        end: `\\/?\\>`,
        startToken: 'punctuation.definition.tag.open.html',
        endToken: 'punctuation.definition.tag.end.html',
        name: 'Attribute',
        rules: attrRules
    }, {
        start: `\\<\\!\\-\\-`,
        end: `\\-\\-\\>`,
        token: 'comment.block.html',
        foldName: 'xml-comment'
    }]
}