/*
 * @Author: lisong
 * @Date: 2022-01-05 14:28:42
 * @Description:
 */
import Util from '@/common/util';
import EventBus from '@/event';
import globalData from '@/data/globalData';

const path = window.require('path');
const child_process = window.require('child_process');

let worker = null;

export default class {
    constructor(editor, context) {
        this.editor = editor;
        this.context = context;
        EventBus.$on('format-worker-done', this.workerFn = (data) => {
            if (data.workerId === this.workerId) {
                this.context.reload(data.text);
                this.editor.cursor.setCursorPos(data.cursorPos);
                this.workerId = '';
            }
        });
    }
    onInsertContentAfter(nowLine, newLine) { }
    onDeleteContentAfter(nowLine, newLine) { }
    destroy() {
        this.editor = null;
        this.context = null;
        clearTimeout(this.runTimer);
        EventBus.$off('format-worker-done', this.workerFn);
        if (worker) {
            worker.kill();
            worker = null;
        }
    }
    run() {
        if (!worker) {
            this.createProcess();
        }
        clearTimeout(this.runTimer);
        this.runTimer = setTimeout(() => {
            _send.call(this);
        }, 50);

        function _send() {
            const text = this.context.getAllText();
            this.workerId = Util.getUUID();
            worker.send({
                text: text,
                workerId: this.workerId,
                cursorPos: this.editor.nowCursorPos,
                language: this.editor.language
            });
        }
    }
    createProcess() {
        worker = child_process.fork(path.join(globalData.dirname, 'main/process/format/index.js'));
        worker.on('message', data => {
            EventBus.$emit('format-worker-done', data)
        });
        worker.on('close', () => {
            this.createProcess();
        });
    }
}
