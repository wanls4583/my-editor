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
const lintSupport = { css: true, scss: true, less: true, html: true, javascript: true };

let worker = null;

export default class {
	constructor(editor, context) {
		this.editor = editor;
		this.context = context;
		this.initLanguage(editor.language);
		EventBus.$on('lint-worker-done', this.workerFn = (data) => {
            if (data.parseId === this.parseId) {
				this.editor.setErrors(data.results);
				this.parseId = '';
			}
        });
	}
	initLanguage(language) {
		if (this.language === language) {
			return;
		}
		this.language = language;
		this.editor.setErrors([]);
		this.parse();
	}
	onInsertContentAfter(nowLine, newLine) {
		this.parse();
	}
	onDeleteContentAfter(nowLine, newLine) {
		this.parse();
	}
	destroy() {
		this.editor = null;
		this.context = null;
		clearTimeout(this.runTimer);
		clearTimeout(this.closeWorkTimer);
		EventBus.$off('lint-worker-done', this.workerFn);
		if (worker) {
			worker.kill();
			worker = null;
		}
	}
	parse() {
		if (!lintSupport[this.language]) {
			return;
		}
		clearTimeout(this.runTimer);
		clearTimeout(this.closeWorkTimer);
		this.runTimer = setTimeout(() => {
			if (worker && this.parseId) {
				worker.kill();
				worker = null;
			}
			if (this.parseId || !worker) {
				this.createProcess();
			}
			_send.call(this);
		}, 500);

		function _send() {
			const text = this.context.getAllText();
			this.parseId = Util.getUUID();
			worker.send({
				text: text,
				parseId: this.parseId,
				language: this.language
			});
		}
	}
	createProcess() {
		worker = child_process.fork(path.join(globalData.dirname, 'main/process/lint/index.js'));
		worker.on('message', data => {
			EventBus.$emit('lint-worker-done', data);
			// 30秒后，如果没有活动，则关闭子进程
			this.closeWorkTimer = setTimeout(() => {
				worker && worker.kill();
				worker = null;
			}, 30000);
		});
	}
}
