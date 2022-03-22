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
                regex: /[a-zA-Z][^;\:\s\}]*?(?=\s*?\:)/,
                token: 'support.type.property-name.css'
            }, {
                regex: /\:/,
                token: 'punctuation.separator.key-value.css'
            }, {
                start: /(?<=\:\s*)/,
                end: /(?=\;|$)/,
                childRule: [{
                    regex: /(?:\d+(?:\.\d*)?|\.\d+)/,
                    token: 'constant.numeric.css'
                }, {
                    regex: /\b(?:px|%)/,
                    token: 'keyword.other.unit.css'
                }, {
                    regex: /\#[a-zA-Z0-9]+/,
                    token: 'constant.other.color.rgb-value.css'
                }, {
                    regex: /(?<=[\s\:])[a-zA-Z][a-zA-Z0-9\-]*/,
                    token: 'support.constant.property-value.css'
                }]
            }, {
                regex: /\;/,
                token: 'punctuation.terminator.rule.css'
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
            regex: /(?<=\:)[^\s\,\:]+/,
            token: 'entity.other.attribute-name.pseudo-element.css'
        }
    ]
}