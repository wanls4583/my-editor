/*
 * @Author: lisong
 * @Date: 2022-01-05 14:28:42
 * @Description: 
 */
import Util from '@/common/Util';
import jsLint from '../javascript';
export default class {
    constructor(editor, context) {
        this.initProperties(editor, context);
        this.initLanguage(editor.language);
    }
    initProperties(editor, context) {
        Util.defineProperties(this, context, ['htmls']);
        Util.defineProperties(this, editor, ['renderError']);
    }
    initLanguage(language) {
        let that = this;
        if (this.language === language) {
            return;
        }
        this.language = language;
        this.worker && this.worker.terminate();
        switch (language) {
            case 'JavaScript':
                this.worker = this.createWorker(jsLint);
                break;
        }
        this.worker.onmessage = function (e) {
            let errros = e.data;
            let index = 0;
            let lineObj = null;
            while (index < errros.length) {
                let line = errros[index].line;
                let arr = [];
                while (index < errros.length && errros[index].line === line) {
                    arr.push(errros[index].error);
                    index++;
                }
                line = line || that.htmls.length;
                lineObj = that.htmls[line - 1];
                lineObj.error = arr.join('<br>');
                that.renderError(lineObj.lineId);
            }
        }
    }
    createWorker(mod) {
        var str =
            `function fun${mod.toString().slice(8)}
            let parser = fun();
            self.onmessage = function(e) {
                var errors = parser.parse(e.data);
                self.postMessage(errors);
            }`;
        return Util.createWorker(str);
    }
    onInsertContentBefore(nowLine) {}
    onInsertContentAfter(nowLine) {
        if (!this.worker) {
            return;
        }
        let text = this.htmls.map((item) => {
            return item.text;
        }).join('\n');
        this.worker.postMessage(text);
    }
    onDeleteContentBefore(nowLine) {}
    onDeleteContentAfter(nowLine) {
        if (!this.worker) {
            return;
        }
        let text = this.htmls.map((item) => {
            return item.text;
        }).join('\n');
        this.worker.postMessage(text);
    }
}