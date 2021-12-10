/*
 * @Author: lisong
 * @Date: 2021-12-10 09:31:38
 * @Description: 
 */
import {
    rules,
    pairRules
} from '../javascript/rules';

const attrRules = [
    {
        regex: /.+?(?=)/, //attrName
        token: 'attr-name'
    },
    {
        startRegex: /(?<=)"/, //attrValue
        endRegex: /"/,
        token: 'attr-value'
    }
]
export const rules = [
    {
        regex: /(?<=\<\/)\w+(?=\s*?\>)/, //</div></span>...
        token: 'end-tag',
        level: 0
    }
]
export const pairRules = [
    {
        startRegex: /(?<=\<)\w+\b/,
        endRegex: /\>/,
        token: 'start-tag',
        children: attrRules
    },
    {
        startRegex: /(?<=\<)\w+\b/,
        endRegex: /\<script\>/,
        token: 'script-tag',
        children: rules
    },
]