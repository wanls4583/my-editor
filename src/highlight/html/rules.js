/*
 * @Author: lisong
 * @Date: 2021-12-10 09:31:38
 * @Description: 
 */
import rules from '../javascript/rules';
import Util from '@/common/util';

export default [{
    regex: /\<\/\w+\s*?\>/g, //</div></span>...
    token: function (token, text) {
        return `<span class="end-tag-arrow-l">&lt;/</span>` +
            `<span class="end-tag">${text.slice(2, -1)}</span>` +
            `<span class="end-tag-arrow-r">&gt;</span>`;
    },
    level: 0
}, {
    startRegex: /\<\w+\b/g,
    endRegex: /\>/g,
    token: function (token, text) {
        console.log(token, text);
        if (!token.startToken) {
            return `<span class="start-tag-arrow-l">&lt;</span>` +
                `<span class="start-tag">${text.slice(1)}</span>`;
        } else {
            return `<span class="start-tag-arrow-r">&gt;</span>`;
        }
    },
    level: 1,
    children: [{
        regex: /\b[^'"=\s\>\<]+\b/g,
        token: 'attr-name',
        level: 0
    }, {
        startRegex: /(?<=\=\s*?)"/g,
        endRegex: /"/g,
        token: 'attr-value',
        level: 1
    }, {
        startRegex: /(?<=\=\s*?)'/g,
        endRegex: /'/g,
        token: 'attr-value',
        level: 1
    }]
}]