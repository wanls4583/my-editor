/*
 * @Author: lisong
 * @Date: 2021-12-10 09:31:38
 * @Description: 
 */
import jsRules from './javascript.js';
import cssRules from './css.js';

const styleRules = [{
    regex: /(?<=\:(?:\s*?\w+?\s*?){0,})\d+/,
    token: 'html-style-number'
}, {
    regex: /(?<=\:\s*?\d+)px\b/,
    token: 'html-style-px'
}, {
    regex: /(?<=(?:\;|'|")\s*?)[^\<\>\:\;'"]+/,
    token: 'html-style-name'
}, {
    regex: /(?<=\:\s*?)[^\<\>\:\;'"]+/,
    token: 'html-style-value'
}];

const attrRules = [{
    start: /(?<=style\s*?\=\s*?)'/,
    end: /'/,
    token: 'xml-attr-value',
    level: 1,
    childRule: {
        rules: styleRules
    }
}, {
    start: /(?<=style\s*?\=\s*?)"/,
    end: /"/,
    token: 'xml-attr-value',
    level: 1,
    childRule: {
        rules: styleRules
    }
}, {
    start: /(?<=\=\s*?)"/,
    end: /"/,
    level: 1,
    token: 'xml-attr-value'
}, {
    start: /(?<=\=\s*?)'/,
    end: /'/,
    level: 1,
    token: 'xml-attr-value'
}, {
    regex: /(?<=\<\/?)\w+\b/,
    token: 'xml-tag-name',
    foldName: tagFoldName,
    foldType: tagFoldType
}, {
    regex: /(?<=\=)\s*?[^\<\>\s\'\"]+\b/,
    token: 'xml-attr-value'
}, {
    regex: /\b[^'"=\s\>\<]+\b/,
    token: 'xml-attr-name'
}];

const scriptStart = {
    start: /\<(?=script\b)/,
    end: /\>/,
    token: tagToken,
    childRule: {
        rules: attrRules
    }
}

const scriptEnd = {
    start: /\<\/(?=script\>)/,
    end: /\>/,
    token: tagToken,
    childRule: {
        rules: [{
            regex: /(?<=\<\/?)\w+\b/,
            token: 'xml-tag-name',
            foldName: tagFoldName,
            foldType: tagFoldType
        }]
    }
}

const styleStart = {
    start: /\<(?=style\b)/,
    end: /\>/,
    token: tagToken,
    childRule: {
        rules: attrRules
    }
}

const styleEnd = {
    start: /\<\/(?=style\s*?\>)/,
    end: /\>/,
    token: tagToken,
    childRule: {
        rules: [{
            regex: /(?<=\<\/?)\w+\b/,
            token: 'xml-tag-name',
            foldName: tagFoldName,
            foldType: tagFoldType
        }]
    }
}

function tagToken(e) {
    if (e.state == 'start') {
        if (e.value[1] == '/') {
            return 'xml-end-tag-open';
        } else {
            return 'xml-tag-open';
        }
    } else {
        return 'xml-tag-close';
    }
}

function tagFoldName(e) {
    if (/hr|br|meta|img|link|input/i.exec(e.value)) { //单标签，不折叠
        return '';
    }
    return e.value;
}

function tagFoldType(e) {
    if (e.text[e.index - 1] == '/') {
        return 1;
    }
    return -1;
}

export default {
    rules: [{
        start: scriptStart,
        end: scriptEnd,
        childRule: jsRules
    }, {
        start: styleStart,
        end: styleEnd,
        childRule: cssRules
    }, {
        start: /\<\/?(?=\w+\b)/,
        end: /\/?\>/,
        token: tagToken,
        childRule: {
            rules: attrRules
        }
    }, {
        start: /\<\!\-\-/,
        end: /\-\-\>/,
        token: 'xml-comment',
        foldName: 'xml-comment'
    }]
}