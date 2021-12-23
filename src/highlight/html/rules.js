/*
 * @Author: lisong
 * @Date: 2021-12-10 09:31:38
 * @Description: 
 */
import JsRules from '../javascript/rules';

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
    regex: /(?<=\<\/?)\w+\b/g,
    token: 'xml-tag-name',
    level: 1
}, {
    regex: /(?<=\=)\s*?[^\<\>\s\'\"]+\b/g,
    token: 'xml-attr-value',
    level: 1
}, {
    regex: /\b[^'"=\s\>\<]+\b/g,
    token: 'xml-attr-name'
}, {
    start: /(?<=\=\s*?)"/g,
    next: /"/g,
    token: 'xml-attr-value'
}, {
    start: /(?<=\=\s*?)'/g,
    next: /'/g,
    token: 'xml-attr-value'
}, {
    start: /(?<=style\s*?\=\s*?)'/g,
    next: /'/g,
    token: 'xml-attr-value',
    level: 2,
    childRule: {
        rules: styleRules.map((item) => {
            return Object.assign({}, item);
        })
    }
}, {
    start: /(?<=style\s*?\=\s*?)"/g,
    next: /"/g,
    token: 'xml-attr-value',
    level: 2,
    childRule: {
        rules: styleRules.map((item) => {
            return Object.assign({}, item);
        })
    }
}];

export default {
    rules: [{
        start: /\<\/?(?=\w+\b)/g,
        next: /\>/g,
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
        childRule: {
            rules: attrRules.map((item) => {
                return Object.assign({}, item);
            })
        }
    }, {
        name: 'script',
        start: /\<(?=script\b)/g,
        next: /\>/g,
        level: 2,
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
        childRule: {
            rules: attrRules.map((item) => {
                return Object.assign({}, item);
            })
        }
    }, {
        start: 'script',
        next: /\<\/script\>/,
        value: function (value) {
            return `<span class="xml-end-tag-open">&lt;/</span><span class="xml-tag-name">script</span><span>&gt;</span>`;
        },
        childRule: JsRules
    }, {
        start: /\<\!\-\-/g,
        next: /\-\-\>/g,
        token: 'xml-comment'
    }]
}