/*
 * @Author: lisong
 * @Date: 2021-12-24 16:08:20
 * @Description: 
 */
import CssData from '@/data/browsers.css-data.js';
const properties = [];
const propertyMap = {};
CssData.properties.forEach((item) => {
    properties.push({
        value: item.name,
        type: 'support.type.property-name.css'
    });
    propertyMap[item.name] = item.values && item.values.map((item) => {
        return {
            value: item.name,
            type: 'support.type.property-value.css'
        }
    }) || [];
});
const attrName = '[a-zA-Z][a-zA-Z0-9\\-]*';


const braces = {
    start: '\\{',
    end: '\\}',
    startToken: 'punctuation.braces.open.css',
    endToken: 'punctuation.braces.close.css',
    autoChild: properties,
    foldName: 'css-braces',
    rules: [
        'comment',
        {
            regex: '[a-zA-Z_][a-zA-Z-]*?(?=\\s*?\\:)',
            token: 'support.type.property-name.css',
            auto: properties,
            autoByMap: propertyMap,
            autoName: 'css-values',
        },
        {
            start: '(?=\\:)',
            end: '(?<=\\;|$)',
            rules: [{
                    regex: '\\:',
                    token: 'punctuation.separator.key-value.css',
                    autoHintPre: 'css-values'
                },
                {
                    regex: '\\;|$',
                    token: 'punctuation.terminator.rule.css'
                },
                {
                    regex: '[\\-\\+]?\\b(?:\\d+(?:\\.\\d*)?|\\.\\d+)',
                    token: 'constant.numeric.css'
                }, {
                    regex: '(?<=\\d)(?:px|%)',
                    token: 'keyword.other.unit.css'
                }, {
                    regex: '\\#[a-zA-Z0-9]+',
                    token: 'constant.other.color.rgb-value.css',
                    auto: true
                }, {
                    regex: '[^\\s\\:\\;\\{\\}]+',
                    token: 'support.constant.property-value.css',
                    autoByPre: 'css-values'
                }
            ]
        }
    ]
}

export default {
    name: 'CSS',
    rules: [
        braces,
        {
            name: 'comment',
            start: '\\/\\*',
            end: '\\*\\/',
            token: 'comment.block.css',
            foldName: 'css-comment'
        },
        {
            regex: `${attrName}`,
            token: 'entity.name.tag.css'
        },
        {
            regex: `\\#${attrName}`,
            token: 'entity.other.attribute-name.id.css'
        },
        {
            regex: `\\.${attrName}`,
            token: 'entity.other.attribute-name.class.css'
        },
        {
            regex: '(?<=\\:)[^\\{\\}\\,\\:]+',
            token: 'entity.other.attribute-name.pseudo-element.css'
        }
    ]
}