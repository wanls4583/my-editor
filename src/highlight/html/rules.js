/*
 * @Author: lisong
 * @Date: 2021-12-10 09:31:38
 * @Description: 
 */
import JsRules from '../javascript/rules';
const attrRules = [{
    regex: /(?<=\<\/?)\w+\b/g,
    token: 'xml-tag-name',
    level: 1
}, {
    regex: /(?<=\=)[^\<\>\s\'\"]+\b/g,
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
}];

export default {
    pairLevel: 1,
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
            pairLevel: 1,
            rules: attrRules.map((item) => {
                return Object.assign({}, item);
            })
        }
    }, {
        start: /\<\!\-\-/g,
        next: /\-\-\>/g,
        token: 'xml-comment'
    }]
}