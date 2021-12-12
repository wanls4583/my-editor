/*
 * @Author: lisong
 * @Date: 2021-12-10 09:31:38
 * @Description: 
 */
import rules from '../javascript/rules';
import Util from '@/common/util';

const attrRules = [{
    regex: /\b[^'"=\s\>\<]+\b/g,
    token: 'attr-name',
    level: 0
}, {
    start: /(?<=\=\s*?)"/g,
    next: /"/g,
    token: 'attr-value'
}, {
    start: /(?<=\=\s*?)'/g,
    next: /'/g,
    token: 'attr-value'
}];

export default {
    pairLevel: 1,
    rules: [{
        regex: /\<\/\w+\s*?\>/g, //</div></span>...
        token: function (token, text) {
            return `<span class="end-tag-arrow-l">&lt;/</span>` +
                `<span class="end-tag">${text.slice(2, -1)}</span>` +
                `<span class="end-tag-arrow-r">&gt;</span>`;
        },
        level: 0
    }, {
        start: /\<\w+\b|\<\!DOCTYPE\b/g,
        next: /\>/g,
        token: function (token, text) {
            if (!token.startToken) {
                return `<span class="start-tag-arrow-l">&lt;</span>` +
                    `<span class="start-tag">${text.slice(1)}</span>`;
            } else {
                return `<span class="start-tag-arrow-r">&gt;</span>`;
            }
        },
        childRule: {
            rules: attrRules.map((item) => {
                return Object.assign({}, item);
            })
        }
    }, {
        level: 2,
        name: 'script',
        start: /\<script\b/g,
        next: /\>/g,
        token: function (token, text) {
            if (!token.startToken) {
                return `<span class="start-tag-arrow-l">&lt;</span>` +
                    `<span class="start-tag">script</span>`;
            } else {
                return `<span class="start-tag-arrow-r">&gt;</span>`;
            }
        },
        childRule: {
            pairLevel: 2,
            rules: attrRules.map((item) => {
                return Object.assign({}, item);
            })
        }
    }, {
        start: 'script',
        next: /\<\/script\s*?\>/,
        childRule: {
            pairLevel: 1,
            rules: attrRules
        }
    }, {
        start: /\<\!\-\-/g,
        next: /\-\-\>/g,
        token: 'comment-tag'
    }]
}