/*
 * @Author: lisong
 * @Date: 2022-02-09 21:33:03
 * @Description: 
 */
import Util from '@/common/Util';

class Searcher {
    constructor(editor, context) {
        this.editor = editor;
        this.context = context;
        this.initProperties(editor, context);
    }
    initProperties(editor, context) {
        Util.defineProperties(this, editor, ['setAutoTip']);
        Util.defineProperties(this, context, ['htmls']);
    }
    reset() {
        this.comments = [];
    }
    search() {
        
    }
    stop() {
        
    }
}

export default Searcher;