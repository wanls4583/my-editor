/*
 * @Author: lisong
 * @Date: 2022-02-12 09:52:06
 * @Description: 
 */
import Util from '@/common/Util';
let regs = {
    enter: /\n/g,
    column: /\n([^\n]+)$/,
}

export default class {
    constructor(editor, context) {
        this.initProperties(editor, context);
    }
    initProperties(editor, context) {
        Util.defineProperties(this, editor, ['addSelectedRange', 'renderSelectedBg']);
        Util.defineProperties(this, context, ['htmls']);
    }
    search(str) {
        let reg = new RegExp(str.replace(/\\|\.|\*|\+|\-|\?|\(|\)|\[|\]|{|\}|\^|\$|\~|\!/g, '\\$&'));
        let exec = null;
        let start = null;
        let end = null;
        let pos = {
            line: 1,
            column: 0,
            index: 0
        }
        let text = context.htmls.map((item) => {
            return item.text
        }).join('\n');
        let originText = text;
        while (exec = reg.exec(text)) {
            this.setLineColumn(text.slice(0, exec.index), pos);
            pos.index += exec.index;
            start = Object.assign({}, pos);
            this.setLineColumn(exec[0], pos);
            pos.index += exec[0].length;
            end = Object.assign({}, pos);
            this.addSelectedRange(start, end); //选中
            text = originText.slice(pos.index);
        }
        this.renderSelectedBg();
    }
    setLineColumn(text, pos) {
        let lines = text.match(regs.enter);
        lines = lines && lines.length || 0;
        pos.line += lines;
        if (lines) {
            let exec = regs.column.exec(text);
            pos.column = exec && exec[1].length || 0;
        } else {
            pos.column += text.length;
        }
    }
}