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
    foldName: function (e) {
        return e.value;
    },
    foldType: function (e) {
        if (e.text[e.index - 1] == '/') {
            return 1;
        }
        return -1;
    }
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

export default {
    rules: [{
        start: /\<\/?(?=\w+\b)/,
        end: /\>/,
        token: tagNameToken,
        childFirst: true,
        childRule: {
            rules: attrRules
        }
    }, {
        start: /\<\!\-\-/,
        end: /\-\-\>/,
        token: 'xml-comment'
    }, {
        name: 'script-start',
        start: /\<(?=script\b)/,
        end: /\>/,
        level: 2,
        token: tagToken,
        childFirst: true,
        childRule: {
            rules: attrRules
        }
    }, {
        name: 'script-end',
        start: /\<\/(?=script\>)/,
        end: /\>/,
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
        end: 'script-end',
        childRule: jsRules
    }, {
        name: 'style-start',
        start: /\<(?=style\b)/,
        end: /\>/,
        level: 2,
        token: tagToken,
        childFirst: true,
        childRule: {
            rules: attrRules
        }
    }, {
        name: 'style-end',
        start: /\<\/(?=style\s*?\>)/,
        end: /\>/,
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
        end: 'style-end',
        childRule: cssRules
    }]
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

function tagNameToken(e) {
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