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
    level: 1
}, {
    regex: /(?<=\=)\s*?[^\<\>\s\'\"]+\b/,
    token: 'xml-attr-value',
    level: 1
}, {
    regex: /\b[^'"=\s\>\<]+\b/,
    token: 'xml-attr-name'
}, {
    start: /(?<=\=\s*?)"/,
    next: /"/,
    token: 'xml-attr-value'
}, {
    start: /(?<=\=\s*?)'/,
    next: /'/,
    token: 'xml-attr-value'
}, {
    start: /(?<=style\s*?\=\s*?)'/,
    next: /'/,
    token: 'xml-attr-value',
    level: 2,
    childRule: {
        rules: styleRules
    }
}, {
    start: /(?<=style\s*?\=\s*?)"/,
    next: /"/,
    token: 'xml-attr-value',
    level: 2,
    childRule: {
        rules: styleRules
    }
}];

export default {
    rules: [{
        start: /\<\/?(?=\w+\b)/,
        next: /\>/,
        token: function (value, state) {
            if (state == 'start') {
                if (value[1] == '/') {
                    return 'xml-end-tag-open';
                } else {
                    return 'xml-tag-open';
                }
            } else {
                return 'xml-tag-close';
            }
        },
        childFirst: true,
        childRule: {
            rules: attrRules
        }
    }, {
        start: /\<\!\-\-/,
        next: /\-\-\>/,
        token: 'xml-comment'
    }, {
        name: 'script-start',
        start: /\<(?=script\b)/,
        next: /\>/,
        level: 2,
        token: tagToken,
        childFirst: true,
        childRule: {
            rules: attrRules
        }
    }, {
        name: 'script-end',
        start: /\<\/(?=script\>)/,
        next: /\>/,
        token: tagToken,
        childRule: {
            rules: [{
                regex: /(?<=\<\/?)\w+\b/,
                token: 'xml-tag-name',
                level: 1
            }]
        }
    }, {
        start: 'script-start',
        next: 'script-end',
        childRule: jsRules
    }, {
        name: 'style-start',
        start: /\<(?=style\b)/,
        next: /\>/,
        level: 2,
        token: tagToken,
        childFirst: true,
        childRule: {
            rules: attrRules
        }
    }, {
        name: 'style-end',
        start: /\<\/(?=style\s*?\>)/,
        next: /\>/,
        token: tagToken,
        childRule: {
            rules: [{
                regex: /(?<=\<\/?)\w+\b/,
                token: 'xml-tag-name',
                level: 1
            }]
        }
    }, {
        start: 'style-start',
        next: 'style-end',
        childRule: cssRules
    }]
}

function tagToken(value, state) {
    if (state == 'start') {
        if (value[1] == '/') {
            return 'xml-end-tag-open';
        } else {
            return 'xml-tag-open';
        }
    } else {
        return 'xml-tag-close';
    }
}