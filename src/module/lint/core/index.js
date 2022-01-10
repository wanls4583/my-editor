/*
 * @Author: lisong
 * @Date: 2022-01-05 14:28:42
 * @Description: 
 */
import Util from '@/common/Util';
import jsLint from '../javascript';
export default class {
    constructor(editor, context) {
        this.parseId = 1;
        this.initProperties(editor, context);
        this.initLanguage(editor.language);
    }
    initProperties(editor, context) {
        Util.defineProperties(this, context, ['htmls', ]);
        Util.defineProperties(this, editor, ['setErrorMap']);
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
            let parseId = e.data.parseId;
            let errors = e.data.errors;
            let index = 0;
            let errorMap = [];
            if (that.parseId != parseId) {
                return;
            }
            while (index < errors.length) {
                let line = errors[index].line;
                let arr = [];
                while (index < errors.length && errors[index].line === line) {
                    arr.push(errors[index].error);
                    index++;
                }
                line = line || that.htmls.length;
                errorMap[line] = arr.join('<br>');
            }
            that.setErrorMap(errorMap);
        }
    }
    createWorker(mod) {
        var str =
            `function fun${mod.toString().slice(8)}
            let parser = fun();
            self.onmessage = function(e) {
                var parseId = e.data.parseId;
                var errors = parser.parse(e.data.text);
                self.postMessage({
                    errors: errors,
                    parseId: parseId
                });
            }`;
        return Util.createWorker(str);
    }
    onInsertContentBefore(nowLine) {}
    onInsertContentAfter(nowLine) {
        if (!this.worker) {
            return;
        }
        clearTimeout(this.parseTimer);
        this.parseTimer = setTimeout(() => {
            this.parse();
        }, 300);
    }
    onDeleteContentBefore(nowLine) {}
    onDeleteContentAfter(nowLine) {
        if (!this.worker) {
            return;
        }
        clearTimeout(this.parseTimer);
        this.parseTimer = setTimeout(() => {
            this.parse();
        }, 300);
    }
    parse() {
        let text = this.htmls.map((item) => {
            return item.text;
        }).join('\n');
        this.parseId++;
        this.worker.postMessage({
            text: text,
            parseId: this.parseId
        });
    }
}