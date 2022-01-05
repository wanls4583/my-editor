/*
 * @Author: lisong
 * @Date: 2022-01-05 14:28:42
 * @Description: 
 */
import Util from '@/common/Util';
export default class {
    constructor(editor, context) {
        this.currentLine = 1;
        this.languageMap = [];
        this.initLanguage(editor.language);
    }
    initLanguage(language) {
        this.language = language;
        switch (language) {
            case 'JavaScript':
                break;
        }
    }
    syntaxAnalysis() {

    }
}