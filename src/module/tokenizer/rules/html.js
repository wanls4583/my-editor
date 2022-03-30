/*
 * @Author: lisong
 * @Date: 2021-12-10 09:31:38
 * @Description: 
 */
import jsRule from './javascript.js';
import cssRule from './css.js';
import CssData from '@/data/browsers.css-data.js';

const properties = [];
const propertyMap = {};
CssData.properties.forEach((item) => {
    properties.push({
        value: item.name,
        type: 'support.type.property-name.css'
    });
    propertyMap[item.name] = item.values && item.values.map((item) => {
        return {
            value: item.name,
            type: 'support.type.property-value.css'
        }
    }) || [];
});

const noEscape = '(?:[^\\\\]|^)(?:\\\\\\\\)*';
const attrName = '[a-zA-Z][a-zA-Z0-9\\-]*';

const styleRules = [{
        regex: `[a-zA-Z_][a-zA-Z-]*?(?=\\s*?\\:)`,
        token: 'support.type.property-name.css',
        auto: properties,
        autoByMap: propertyMap,
        autoName: 'html-css-values'
    },
    {
        start: `(?=\\:)`,
        end: `(?<=\\;)`,
        rules: [{
                regex: '\\:',
                token: 'punctuation.separator.key-value.css',
                autoHintPre: 'html-css-values'
            },
            {
                regex: '\\;',
                token: 'punctuation.terminator.rule.css'
            },
            {
                regex: `[\\-\\+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)`,
                token: 'constant.numeric.css'
            }, {
                regex: `(?<=\\d)(?:px|%)`,
                token: 'keyword.other.unit.css'
            }, {
                regex: `\\#[a-zA-Z0-9]+`,
                token: 'constant.other.color.rgb-value.css',
                auto: 'html-css-color',
            }, {
                regex: `[^\\s\\:\\;\\{\\}'"]+`,
                token: 'support.constant.property-value.css',
                autoByPre: 'html-css-values'
            }, {
                regex: `\\b"[^"]*?"\\b`,
                token: 'support.constant.property-value.string.quoted.double.css'
            }, {
                regex: `\\b'[^']*?'\\b`,
                token: 'support.constant.property-value.string.quoted.single.css'
            }
        ]
    }
];

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
        rules: styleRules,
        autoChild: properties
    },
    {
        start: `(?<=\\sstyle\\s*?\\=\\s*?)"`,
        end: `(?<=${noEscape})"`,
        prior: true,
        startToken: 'string.quoted.double.html',
        endToken: 'string.quoted.double.html',
        name: 'Style',
        rules: styleRules,
        autoChild: properties
    },
    {
        start: `'`,
        end: `(?<=${noEscape})'`,
        token: 'string.quoted.single.html'
    },
    {
        start: `"`,
        end: `(?<=${noEscape})"`,
        token: 'string.quoted.double.html'
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
        prior: true,
        name: jsRule.name,
        rules: jsRule.rules
    }, {
        start: styleStart,
        end: styleEnd,
        prior: true,
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
        startToken: 'punctuation.definition.comment.open.html',
        endToken: 'punctuation.definition.comment.close.html',
        token: 'comment.block.html',
        foldName: 'xml-comment'
    }]
}