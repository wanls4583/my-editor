/*
 * @Author: lisong
 * @Date: 2022-01-05 14:28:42
 * @Description:
 */
import Util from '@/common/util';
import globalData from '@/data/globalData';

const path = window.require('path');
const child_process = window.require('child_process');
const lintSupport = { css: true, scss: true, less: true, html: true, javascript: true };

export default class {
	constructor(editor, context) {
		this.editor = editor;
		this.context = context;
		this.initLanguage(editor.language);
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
		clearTimeout(this.parseTimer);
		clearTimeout(this.closeWorkTimer);
		if (this.worker) {
			this.worker.kill();
			this.worker = null;
		}
	}
	parse() {
		if (!lintSupport[this.language]) {
			return;
		}
		clearTimeout(this.parseTimer);
		clearTimeout(this.closeWorkTimer);
		this.parseTimer = setTimeout(() => {
			if (this.worker && this.parseId) {
				this.worker.kill();
				this.worker = null;
			}
			if (this.parseId || !this.worker) {
				this.createProcess();
			}
			_send.call(this);
		}, 500);

		function _send() {
			const text = this.context.getAllText();
			this.parseId = Util.getUUID();
			this.worker.send({
				text: text,
				parseId: this.parseId,
				language: this.language
			});
		}
	}
	createProcess() {
		this.worker = child_process.fork(path.join(globalData.dirname, 'main/process/lint/index.js'));
		this.worker.on('message', data => {
			if (data.parseId === this.parseId) {
				this.editor.setErrors(data.results);
				this.parseId = '';
				// 30秒后，如果没有编辑内容，则关闭子进程
				this.closeWorkTimer = setTimeout(() => {
					this.worker && this.worker.kill();
					this.worker = null;
				}, 30000);
			}
		});
	}
}
