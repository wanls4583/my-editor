/*
 * @Author: lisong
 * @Date: 2022-01-05 14:28:42
 * @Description: 
 */
import Util from '@/common/Util';
import jsLint from '../javascript';
export default class {
    constructor(editor, context) {
        this.languageMap = [];
        this.initProperties(editor, context);
        this.initLanguage(editor.language);
    }
    initProperties(editor, context) {
        Util.defineProperties(this, context, ['htmls']);
    }
    initLanguage(language) {
        this.language = language;
        switch (language) {
            case 'JavaScript':
                break;
        }
    }
    onInsertContentBefore(nowLine) {}
    onInsertContentAfter(nowLine) {
        let text = this.htmls.map((item) => {
            return item.text;
        }).join('\n');
        jsLint(text);
    }
    onDeleteContentBefore(nowLine) {}
    onDeleteContentAfter(nowLine) {
        let text = this.htmls.map((item) => {
            return item.text;
        }).join('\n');
        jsLint(text);
    }
}