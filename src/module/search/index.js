/*
 * @Author: lisong
 * @Date: 2022-02-12 09:52:06
 * @Description: 
 */
import Util from '@/common/Util';

export default class {
    constructor(editor, context) {
        this.initProperties(editor, context);
    }
    initProperties(editor, context) {
        Util.defineProperties(this, editor, ['setSelectedRange']);
        Util.defineProperties(this, context, ['htmls']);
    }
    search(str) {
        let reg = new RegExp(str.replace(/\\|\.|\*|\+|\-|\?|\(|\)|\[|\]|{|\}|\^|\$|\~|\!/g, '\\$&'));
        let exec = null;
        let pos = {
            line: 1,
            column: 0,
            index: 0
        }
        let text = context.htmls.map((item) => {
            return item.text
        }).join('\n');
        while (exec = reg.exec(text)) {
            this.setLineColumn(text.slice(0, exec.index), pos);
            pos.index += exec.index;
            start = Object.assign({}, pos);
            this.setLineColumn(exec[0], pos);
            pos.index += exec[0].length;
            end = Object.assign({}, pos);
            this.setSelectedRange(start, end); //选中
            text = this.text.slice(pos.index);
        }
    }
    setLineColumn(text, pos) {
        let lines = text.match(regs.enter);
        lines = lines && lines.length || 0;
        pos.line += lines;
        if (lines) {
            pos.column = regs.column.exec(text)[0].length;
        } else {
            pos.column += text.length;
        }
    }
}