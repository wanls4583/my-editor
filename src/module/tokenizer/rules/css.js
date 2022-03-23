/*
 * @Author: lisong
 * @Date: 2021-12-24 16:08:20
 * @Description: 
 */
const comment = {
    start: /\/\*/,
    end: /\*\//,
    token: 'comment.block.css',
    foldName: 'css-comment'
}
const braces = {
    start: /\{/,
    end: /\}/,
    foldName: 'css-braces',
    childRule: {
        rules: [
            comment,
            {
                regex: /[a-zA-Z_][a-zA-Z-]*?(?=\s*?\:)/,
                token: 'support.type.property-name.css'
            }, {
                start: /\:/,
                end: /\;|$/,
                startToken: 'punctuation.separator.key-value.css',
                endToken: 'punctuation.terminator.rule.css',
                childRule: {
                    rules: [{
                        regex: /[\-\+]?\b(?:\d+(?:\.\d*)?|\.\d+)/,
                        token: 'constant.numeric.css'
                    }, {
                        regex: /(?<=\d)(?:px|%)/,
                        token: 'keyword.other.unit.css'
                    }, {
                        regex: /\#[a-zA-Z0-9]+/,
                        token: 'constant.other.color.rgb-value.css'
                    }, {
                        regex: /[^\s\:\;\{\}]+/,
                        token: 'support.constant.property-value.css'
                    }]
                }
            }
        ]
    }
}
braces.childRule.rules.unshift(braces);

export default {
    rules: [
        comment,
        braces,
        {
            regex: /[a-zA-Z][a-zA-Z0-9\-]*/,
            token: 'entity.name.tag.css'
        }, {
            regex: /\#[a-zA-Z][a-zA-Z0-9\-]*/,
            token: 'entity.other.attribute-name.id.css'
        }, {
            regex: /\.[a-zA-Z][a-zA-Z0-9\-]*/,
            token: 'entity.other.attribute-name.class.css'
        }, {
            regex: /(?<=\:)[^\{\}\,\:]+/,
            token: 'entity.other.attribute-name.pseudo-element.css'
        }
    ]
}