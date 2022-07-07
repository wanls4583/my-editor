/*
 * @Author: lisong
 * @Date: 2022-01-05 14:28:42
 * @Description:
 */
import Util from '@/common/util';
import globalData from '@/data/globalData';

const path = window.require('path');
const child_process = window.require('child_process');

export default class {
    constructor(editor, context) {
        this.editor = editor;
        this.context = context;
    }
    onInsertContentAfter(nowLine, newLine) {
        this.format();
    }
    onDeleteContentAfter(nowLine, newLine) {
        this.format();
    }
    destroy() {
        this.editor = null;
        this.context = null;
        clearTimeout(this.formatTimer);
        clearTimeout(this.closeWorkTimer);
        if (this.worker) {
            this.worker.kill();
            this.worker = null;
        }
    }
    format() {
        clearTimeout(this.formatTimer);
        clearTimeout(this.closeWorkTimer);
        this.formatTimer = setTimeout(() => {
            if (this.worker && this.workerId) {
                this.worker.kill();
                this.worker = null;
            }
            if (this.workerId || !this.worker) {
                this.createProcess();
            }
            _send.call(this);
        }, 50);

        function _send() {
            const text = this.context.getAllText();
            this.workerId = Util.getUUID();
            this.worker.send({
                text: text,
                workerId: this.workerId,
                cursorPos: this.editor.nowCursorPos,
                language: this.editor.language
            });
        }
    }
    createProcess() {
        this.worker = child_process.fork(path.join(globalData.dirname, 'main/process/format/index.js'));
        this.worker.on('message', data => {
            if (data.workerId === this.workerId) {
                this.context.reload(data.text);
                this.editor.cursor.setCursorPos(data.cursorPos);
                this.workerId = '';
                // 30秒后，如果没有编辑内容，则关闭子进程
                this.closeWorkTimer = setTimeout(() => {
                    this.worker && this.worker.kill();
                    this.worker = null;
                }, 30000);
            }
        });
    }
}
