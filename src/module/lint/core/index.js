/*
 * @Author: lisong
 * @Date: 2022-01-05 14:28:42
 * @Description: 
 */
import Util from '@/common/Util';
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
        Util.defineProperties(this, editor, ['setErrorMap']);
    }
    initLanguage(language) {
        let that = this;
        if (this.language === language) {
            return;
        }
        this.language = language;
        this.worker && this.worker.terminate();
        this.worker = null;
        this.setErrorMap({});
        switch (language) {
            case 'HTML':
                this.worker = this.createWorker(htmlLint);
                break;
            case 'JavaScript':
                this.worker = this.createWorker(jsLint);
                break;
            case 'CSS':
                this.worker = this.createWorker(cssLint);
                break;
        }
        if (!this.worker) {
            return;
        }
        this.worker.onmessage = (e) => {
            let parseId = e.data.parseId;
            let result = e.data.result;
            let errorMap = {};
            if (that.parseId != parseId || !result) {
                that.setErrorMap(errorMap);
                return;
            }
            if (result instanceof Array) {
                result.forEach((item) => {
                    item.errors && _formatError(errorMap, item.errors);
                });
            } else {
                result.errors && _formatError(errorMap, result.errors);
            }
            that.setErrorMap(errorMap);
        }
        this.parse();

        function _formatError(errorMap, errors) {
            let index = 0;
            while (index < errors.length) {
                let line = errors[index].line;
                let arr = [];
                while (index < errors.length && errors[index].line === line) {
                    arr.push(errors[index].reason);
                    index++;
                }
                line = line || that.htmls.length;
                errorMap[line] = arr.join('<br>');
            }
        }
    }
    createWorker(mod) {
        var funStr = mod.toString().replace(/^[^\)]+?\)/, '');
        var str =
            `function fun(hostname)${funStr}
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
            parseId: this.parseId
        });
    }
}