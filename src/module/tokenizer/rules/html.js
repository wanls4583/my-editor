/*
 * @Author: lisong
 * @Date: 2021-12-10 09:31:38
 * @Description: 
 */
import jsRules from './javascript.js';
import cssRules from './css.js';

const styleRules = [{
    regex: /[a-zA-Z][^;\:\s\}]*?(?=\s*?\:)/,
    token: 'support.type.property-name.css'
}, {
    regex: /\:/,
    token: 'punctuation.separator.key-value.css'
}, {
    start: /(?<=\:\s*)/,
    end: /(?=\;|'|")/,
    childRule: [{
        regex: /(?:\d+(?:\.\d*)?|\.\d+)/,
        token: 'constant.numeric.css'
    }, {
        regex: /\b(?:px|%)/,
        token: 'keyword.other.unit.css'
    }, {
        regex: /\#[a-zA-Z0-9]+/,
        token: 'constant.other.color.rgb-value.css'
    }, {
        regex: /(?<=[\s\:])[a-zA-Z][a-zA-Z0-9\-]*/,
        token: 'support.constant.property-value.css'
    }]
}, {
    regex: /\;/,
    token: 'punctuation.terminator.rule.css'
}];

const attrRules = [{
    regex: /(?<=\<)[a-zA-Z][a-zA-Z0-9\-]*/,
    token: 'entity.name.tag.html',
    foldName: tagFoldName,
    foldType: -1
}, {
    regex: /(?<=\<\/)[a-zA-Z][a-zA-Z0-9\-]*/,
    token: 'entity.name.tag.html',
    foldName: tagFoldName,
    foldType: 1
}, {
    regex: /\s[a-zA-Z][a-zA-Z-]*/,
    token: 'entity.other.attribute-name.html'
}, {
    start: /(?<=style\s*?\=\s*?)'/,
    end: /(?<=(?:[^\\]|^)(?:\\\\)*)'/,
    ruleName: 'Style',
    level: 1,
    childRule: {
        rules: styleRules
    }
}, {
    start: /(?<=style\s*?\=\s*?)"/,
    end: /(?<=(?:[^\\]|^)(?:\\\\)*)"/,
    ruleName: 'Style',
    level: 1,
    childRule: {
        rules: styleRules
    }
}, {
    start: /'/,
    end: /(?<=(?:[^\\]|^)(?:\\\\)*)'/,
    token: 'string.quoted.single.html'
}, {
    start: /"/,
    end: /(?<=(?:[^\\]|^)(?:\\\\)*)"/,
    token: 'string.quoted.double.html'
}];

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
    token: 'punctuation.definition.tag.html',
    ruleName: 'Attribute',
    childRule: {
        rules: attrRules
    }
}

const scriptEnd = {
    start: /\<\/(?=script\>)/,
    end: /\>/,
    token: 'punctuation.definition.tag.html',
    childRule: {
        rules: endTatAttrRules
    }
}

const styleStart = {
    start: /\<(?=style\b)/,
    end: /\>/,
    token: 'punctuation.definition.tag.html',
    ruleName: 'Attribute',
    childRule: {
        rules: attrRules
    }
}

const styleEnd = {
    start: /\<\/(?=style\s*?\>)/,
    end: /\>/,
    token: 'punctuation.definition.tag.html',
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
        token: 'punctuation.definition.tag.html',
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