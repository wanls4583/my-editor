/*
 * @Author: lisong
 * @Date: 2022-01-05 14:28:42
 * @Description:
 */
import Util from '@/common/util';
import htmlLint from '../language/html';
import jsLint from '../language/javascript';
import cssLint from '../language/css';
import config from '@/config';

export default class {
    constructor(editor, context) {
        this.parseId = 1;
        this.initProperties(editor, context);
        this.initLanguage(editor.language);
    }
    initProperties(editor, context) {
        Util.defineProperties(this, context, ['htmls', 'getAllText']);
        Util.defineProperties(this, editor, ['setErrors']);
    }
    initLanguage(language) {
        let that = this;
        if (this.language === language) {
            return;
        }
        this.language = language;
        this.worker && this.worker.terminate();
        this.worker = null;
        this.setErrors([]);
        switch (language) {
            case 'html':
                this.worker = this.createWorker(htmlLint);
                break;
            case 'javascript':
                this.worker = this.createWorker(jsLint);
                break;
            case 'css':
                this.worker = this.createWorker(cssLint);
                break;
        }
        if (!this.worker) {
            return;
        }
        this.worker.onmessage = (e) => {
            let parseId = e.data.parseId;
            let result = e.data.result;
            let errors = [];
            if (that.parseId != parseId || !result) {
                that.setErrors(errors);
                return;
            }
            if (result instanceof Array) {
                result.forEach((item) => {
                    item.errors && errors.push(...item.errors);
                });
            } else {
                result.errors && errors.push(...result.errors);
            }
            that.setErrors(errors);
        };
        this.parse();
    }
    createWorker(mod) {
        var funStr = mod.toString().replace(/^[^\)]+?\)/, '');
        var str = `function fun(hostname)${funStr}
            var parser = fun('${config.webWorkerHost}');
            self.onmessage = function(e) {
                var parseId = e.data.parseId;
                var result = parser.parse(e.data.text);
                self.postMessage({
                    result: result,
                    parseId: parseId
                });
            }`;
        return Util.createWorker(str);
    }
    onInsertContentAfter(nowLine, newLine) {
        if (!this.worker) {
            return;
        }
        clearTimeout(this.parseTimer);
        this.parseTimer = setTimeout(() => {
            this.parse();
        }, 300);
    }
    onDeleteContentAfter(nowLine, newLine) {
        if (!this.worker) {
            return;
        }
        clearTimeout(this.parseTimer);
        this.parseTimer = setTimeout(() => {
            this.parse();
        }, 300);
    }
    parse() {
        let text = this.getAllText();
        this.parseId++;
        this.worker.postMessage({
            text: text,
            parseId: this.parseId,
        });
    }
}
