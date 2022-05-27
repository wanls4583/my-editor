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
		if (!this.language) {
			return;
		}
		if (worker === null) {
			clearTimeout(this.initWorkTimer);
			this.initWorkTimer = setTimeout(() => {
				worker = child_process.fork(path.join(globalData.dirname, 'main/process/lint/index.js'));
				_bindMsg.call(this);
			}, 300);
		} else {
			_bindMsg.call(this);
		}

		function _bindMsg() {
			worker.on('message', data => {
				console.log(data);
				if (data.parseId === this.parseId) {
					this.setErrors(data.results);
				}
			});
			worker.on('close', () => {
				worker = null;
				this.initEvent();
			});
		}
	}
	onInsertContentAfter(nowLine, newLine) {
		this.parseId = '';
		this.parse();
	}
	onDeleteContentAfter(nowLine, newLine) {
		this.parseId = '';
		this.parse();
	}
	parse() {
		if (!this.language) {
			return;
		}
		clearTimeout(this.parseTimer);
		this.parseTimer = setTimeout(() => {
			const text = this.getAllText();
			this.parseId = Util.getUUID();
			worker.send({
				text: text,
				parseId: this.parseId,
				language: this.language,
			});
		}, 300);
	}
}
