/*
 * @Author: lisong
 * @Date: 2022-01-05 14:28:42
 * @Description:
 */
import Util from '@/common/util';
import globalData from '@/data/globalData';

const path = window.require('path');
const child_process = window.require('child_process');

let worker = null;
let parseIdMap = {};

function inttWorker() {
	if (worker === null) {
		clearTimeout(inttWorker.initWorkTimer);
		inttWorker.initWorkTimer = setTimeout(() => {
			worker = child_process.fork(path.join(globalData.dirname, 'main/process/lint/index.js'));
			_bindMsg();
		}, 300);
	} else {
		_bindMsg();
	}

	function _bindMsg() {
		worker.on('message', data => {
			if (typeof parseIdMap[data.parseId] === 'function') {
				parseIdMap[data.parseId](data.results);
				delete parseIdMap[data.parseId];
			}
		});
		worker.on('close', () => {
			worker = null;
			inttWorker();
		});
	}
}

inttWorker();

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
		this.parse();
	}
	onInsertContentAfter(nowLine, newLine) {
		this.parseId && delete parseIdMap[this.parseId];
		this.parse();
	}
	onDeleteContentAfter(nowLine, newLine) {
		this.parseId && delete parseIdMap[this.parseId];
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
			parseIdMap[this.parseId] = results => {
				this.setErrors(results);
			};
			worker.send({
				text: text,
				parseId: this.parseId,
				language: this.language,
			});
		}, 300);
	}
}
