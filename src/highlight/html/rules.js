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
    level: 0,
    token: function (token, text) {
        let html = '';
        if (token) {
            if (token.type != Util.constData.PAIR_END) { //标签开始：<div style=...
                let index = text.indexOf(' ');
                html = '<span class="start-tag-arrow-l">&lt;</span>';
                html += `<span class="start-tag">${text.slice(1, index)}</span>`;
                if (text.slice(-1) == '>') { // <div>
                    html += _parseAttr(text.slice(index, -1));
                    html += '<span class="start-tag-arrow-r">&gt;</span>';
                } else { // <div
                    html += _parseAttr(text.slice(index));
                }
            } else { //标签结束：>
                html = '<span class="start-tag-arrow-r">&gt;</span>';
            }
        } else {
            html = _parseAttr(text);
        }
        return html;

        function _parseAttr(text) {
            let html = '';
            let regex = /[^'"=\s]+?(?:=(?:"[^"]*"|'[^']*')|\s*$)/g;
            let result = null;
            let preStart = 0;
            // 寻找attr="value"
            while (result = regex.exec(text)) {
                let arr = result[0].split('=');
                html += Util.htmlTrans(text.slice(preStart, result.index));
                html += `<span class="attr-name">${arr[0]}</span>=`;
                html += `<span class="attr-value">${arr[1]}</span>`;
                preStart = result.index + result[0].length;
            }
            return html;
        }
    }
}]