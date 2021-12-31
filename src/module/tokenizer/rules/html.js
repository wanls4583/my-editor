/*
 * @Author: lisong
 * @Date: 2021-12-10 09:31:38
 * @Description: 
 */
import jsRules from './javascript.js';
import cssRules from './css.js';

const styleRules = [{
    regex: /(?<=(?:\;|'|")\s*?)[^\<\>\:\;'"]+/,
    token: 'html-style-name'
}, {
    regex: /(?<=\:\s*?)[^\<\>\:\;'"]+/,
    token: 'html-style-value'
}, {
    regex: /(?<=\:(?:\s*?\w+?\s*?){0,})\d+/,
    token: 'html-style-number',
    level: 1,
}, {
    regex: /(?<=\:\s*?\d+)px\b/,
    token: 'html-style-px',
    level: 1
}];

const attrRules = [{
    regex: /(?<=\<\/?)\w+\b/,
    token: 'xml-tag-name',
    level: 1,
    foldName: tagFoldName,
    foldType: tagFoldType
}, {
    regex: /(?<=\=)\s*?[^\<\>\s\'\"]+\b/,
    token: 'xml-attr-value',
    level: 1
}, {
    regex: /\b[^'"=\s\>\<]+\b/,
    token: 'xml-attr-name'
}, {
    start: /(?<=\=\s*?)"/,
    end: /"/,
    token: 'xml-attr-value'
}, {
    start: /(?<=\=\s*?)'/,
    end: /'/,
    token: 'xml-attr-value'
}, {
    start: /(?<=style\s*?\=\s*?)'/,
    end: /'/,
    token: 'xml-attr-value',
    level: 2,
    childRule: {
        rules: styleRules
    }
}, {
    start: /(?<=style\s*?\=\s*?)"/,
    end: /"/,
    token: 'xml-attr-value',
    level: 2,
    childRule: {
        rules: styleRules
    }
}];

const scriptStart = {
    start: /\<(?=script\b)/,
    end: /\>/,
    token: tagToken,
    childFirst: true,
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
    childFirst: true,
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
        start: /\<\/?(?=\w+\b)/,
        end: /\/?\>/,
        token: tagToken,
        childFirst: true,
        childRule: {
            rules: attrRules
        }
    }, {
        start: /\<\!\-\-/,
        end: /\-\-\>/,
        token: 'xml-comment',
        foldName: 'xml-comment'
    }, {
        start: scriptStart,
        end: scriptEnd,
        level: 2,
        childRule: jsRules
    }, {
        start: styleStart,
        end: styleEnd,
        level: 2,
        childRule: cssRules
    }]
}