/*
 * @Author: lisong
 * @Date: 2022-01-05 14:28:42
 * @Description:
 */
import Util from '@/common/util';
import globalData from '@/data/globalData';

const require = window.require || window.parent.require || function () {};
const path = require('path');
const child_process = require('child_process');

let worker = null;

export default class {
    constructor(editor, context) {
        this.initProperties(editor, context);
        this.initLanguage(editor.language);
        this.initEvent();
    }
    initProperties(editor, context) {
        Util.defineProperties(this, context, ['htmls', 'getAllText']);
        Util.defineProperties(this, editor, ['setErrors']);
    }
    initLanguage(language) {
        if (this.language === language) {
            return;
        }
        this.language = language;
        this.setErrors([]);
        this.initEvent();
        this.parse();
    }
    initEvent() {
        if (worker === null) {
            worker = child_process.fork(path.join(globalData.dirname, 'process/linter.js'));
            worker.on('message', (data) => {
                console.log(data);
                if (data.parseId === this.parseId) {
                    this.setErrors(data.results);
                }
            });
        }
        worker.on('close', () => {
            worker = null;
            this.initEvent();
        });
    }
    onInsertContentAfter(nowLine, newLine) {
        clearTimeout(this.parseTimer);
        this.parseId = '';
        this.parseTimer = setTimeout(() => {
            this.parse();
        }, 300);
    }
    onDeleteContentAfter(nowLine, newLine) {
        clearTimeout(this.parseTimer);
        this.parseId = '';
        this.parseTimer = setTimeout(() => {
            this.parse();
        }, 300);
    }
    parse() {
        if (!this.language) {
            return;
        }
        const text = this.getAllText();
        this.parseId = Util.getUUID();
        worker.send({
            text: text,
            parseId: this.parseId,
            language: this.language,
        });
    }
}
