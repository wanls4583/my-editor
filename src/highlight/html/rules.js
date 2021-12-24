/*
 * @Author: lisong
 * @Date: 2021-12-10 09:31:38
 * @Description: 
 */
import Util from '../../common/util';
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
        rules: Util.deepAssign([], styleRules)
    }
}, {
    start: /(?<=style\s*?\=\s*?)"/g,
    next: /"/g,
    token: 'xml-attr-value',
    level: 2,
    childRule: {
        rules: Util.deepAssign([], styleRules)
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
        childFirst: true,
        childRule: {
            rules: Util.deepAssign([], attrRules)
        }
    }, {
        name: 'script-start',
        start: /\<(?=script\b)/g,
        next: /\>/g,
        level: 2,
        token: tagToken,
        childFirst: true,
        childRule: {
            rules: Util.deepAssign([], attrRules)
        }
    }, {
        name: 'script-end',
        start: /\<\/(?=script\>)/g,
        next: /\>/g,
        token: tagToken,
        childRule: {
            rules: [{
                regex: /(?<=\<\/?)\w+\b/g,
                token: 'xml-tag-name',
                level: 1
            }]
        }
    }, {
        start: 'script-start',
        next: 'script-end',
        childRule: Util.deepAssign({}, JsRules)
    }, {
        start: /\<\!\-\-/g,
        next: /\-\-\>/g,
        token: 'xml-comment'
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