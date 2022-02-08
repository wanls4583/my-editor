/*
 * @Author: lisong
 * @Date: 2021-12-24 16:08:20
 * @Description: 
 */
const comment = {
    start: /\/\*/,
    end: /\*\//,
    token: 'css-comment',
    foldName: 'css-comment'
}
export default {
    rules: [
        comment,
        {
            start: /\{/,
            end: /\}/,
            token: ['css-lbraces', 'css-rbraces'],
            foldName: 'css-braces',
            childRule: {
                rules: [
                    comment,
                    {
                        regex: /;/,
                        token: 'css-split'
                    }, {
                        regex: /:/,
                        token: 'css-value-start'
                    }, {
                        regex: /[a-zA-Z][^;\:\s\}]*?(?=\s*?\:)/,
                        token: 'css-property'
                    }, {
                        regex: /(?<=\:\s*?)[^;\:\}]+?(?=;|}|$)/,
                        token: 'css-value'
                    }
                ]
            }
        }, {
            regex: /[#\.]?[^\s\,\:\{]+/,
            token: function (value) {
                if (value[0] == '.') {
                    return 'css-selector-class';
                } else if (value[0] == '#') {
                    return 'css-selector-id';
                } else {
                    return 'css-selector-tag';
                }
            }
        }, {
            regex: /(?<=\:)[^\s\,\:]+/,
            token: 'css-pseudo'
        }
    ]
}