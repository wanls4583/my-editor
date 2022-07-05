import Vue from 'vue';
import Context from '@/module/context/index';
import EventBus from '@/event';
import globalData from '@/data/globalData';
import Util from '@/common/util';
import JsBeautify from 'js-beautify';

const remote = window.require('@electron/remote');
const Prettier = window.require('prettier');
const contexts = Context.contexts;

export default class {
	constructor() {
		this.editorList = globalData.editorList;
		this.mode = remote ? 'app' : 'mode';
		this.init();
	}
	init() {
		EventBus.$on('editor-close', id => {
			this.closeTab(id);
		});
		EventBus.$on('editor-change', id => {
			this.changeTab(id);
		});
		EventBus.$on('editor-saved', id => {
			this.saveTab(id);
		});
		EventBus.$on('editor-close-to-left', id => {
			this.closeToLeft(id);
		});
		EventBus.$on('editor-close-to-right', id => {
			this.closeToRight(id);
		});
		EventBus.$on('editor-close-saved', id => {
			this.closeSaved(id);
		});
		EventBus.$on('editor-close-other', id => {
			this.closeOther(id);
		});
		EventBus.$on('editor-close-all', id => {
			this.closeAll();
		});
		EventBus.$on('editor-loaded', list => {
			this.loadEditor(list);
		});
		EventBus.$on('editor-content-change', data => {
			let tab = Util.getTabById(this.editorList, data.id);
			if (tab) {
				tab.saved = false;
				this.editorList.splice();
			}
		});
		EventBus.$on('editor-format', id => {
			this.formatCode(id);
		});
		EventBus.$on('language-check', () => {
			this.checkLanguage();
		});
		EventBus.$on('folder-opened', () => {
			this.editorList.empty();
			globalData.nowEditorId = null;
		});
	}
	changeTab(id) {
		let tab = Util.getTabById(this.editorList, id);
		if (tab && !tab.active) {
			if (tab.path && !tab.loaded) {
				//tab对应的文件内容还未加载
				EventBus.$emit('file-open', tab);
			} else {
				this.editorList.forEach(item => {
					item.active = false;
				});
				tab.active = true;
				globalData.nowEditorId = id;
				this.changeStatus();
			}
		} else {
			this.focusNowEditor();
		}
	}
	saveTab(id) {
		let tab = Util.getTabById(this.editorList, id);
		tab.saved = true;
	}
	changeStatus() {
		let changStatusId = this.changeStatus.id || 1;
		this.changeStatus.id = changStatusId;
		Vue.prototype.$nextTick(() => {
			if (this.changeStatus.id !== changStatusId) {
				return;
			}
			let editor = globalData.$mainWin.getNowEditor();
			let tab = Util.getTabById(this.editorList, globalData.nowEditorId);
			EventBus.$emit(`editor-changed`, {
				id: tab.id,
				path: tab.path,
				language: editor.language,
				tabSize: editor.tabSize,
				indent: editor.indent,
				line: editor.nowCursorPos ? editor.nowCursorPos.line : '?',
				column: editor.nowCursorPos ? editor.nowCursorPos.column : '?'
			});
		});
	}
	// 检查当前打开的文件的语言
	checkLanguage() {
		if (globalData.nowEditorId) {
			let tab = Util.getTabById(this.editorList, globalData.nowEditorId);
			let suffix = /\.[^\.]+$/.exec(tab.name);
			if (!suffix) {
				return;
			}
			for (let i = 0; i < globalData.languageList.length; i++) {
				let language = globalData.languageList[i];
				if (language.extensions && language.extensions.indexOf(suffix[0]) > -1) {
					Vue.prototype.$nextTick(() => {
						EventBus.$emit('language-change', { id: tab.id, language: language.value });
					});
					break;
				}
			}
		}
	}
	closeTab(id) {
		let tab = Util.getTabById(this.editorList, id || globalData.nowEditorId);
		let index = this.editorList.indexOf(tab);
		return new Promise((resolve, reject) => {
			if (!tab.saved) {
				_saveDialog.call(this, resolve);
			} else {
				_closeTab.call(this, resolve);
			}
		}).then(() => {
			EventBus.$emit('git-status-stop', tab.path);
			EventBus.$emit('file-watch-stop', tab.path);
		});

		function _closeTab(resolve) {
			this.editorList.splice(index, 1);
			contexts[id] = null;
			if (tab.active) {
				let _tab = this.editorList[index] || this.editorList[index - 1];
				globalData.nowEditorId = null;
				tab.active = false;
				if (_tab) {
					this.changeTab(_tab.id);
				} else {
					EventBus.$emit('editor-changed', null);
				}
			} else {
				this.focusNowEditor();
			}
			resolve();
		}

		function _saveDialog(resolve) {
			EventBus.$emit('dialog-show', {
				content: '文件尚未保存，是否先保存文件？',
				cancel: true,
				icon: 'my-icon-warn',
				iconColor: 'rgba(255,196,0)',
				btns: [
					{
						name: '保存',
						callback: () => {
							if (this.mode === 'app') {
								EventBus.$emit('file-save', {
									id: id,
									success: () => {
										_closeTab.call(this, resolve);
										EventBus.$emit('dialog-close');
									}
								});
							} else {
								_closeTab.call(this, resolve);
								EventBus.$emit('dialog-close');
							}
						}
					},
					{
						name: '不保存',
						callback: () => {
							_closeTab.call(this, resolve);
							EventBus.$emit('dialog-close');
						}
					}
				]
			});
		}
	}
	closeMultiple(editorList) {
		if (editorList.length) {
			this.closeTab(editorList.pop().id).then(() => {
				this.closeMultiple(editorList);
			});
		}
	}
	closeOther(id) {
		let editorList = this.editorList.filter(item => {
			return id !== item.id;
		});
		this.closeMultiple(editorList);
	}
	closeAll() {
		let editorList = this.editorList.slice();
		this.closeMultiple(editorList);
	}
	closeSaved() {
		let editorList = this.editorList.filter(item => {
			return item.saved;
		});
		this.closeMultiple(editorList);
	}
	closeToLeft(id) {
		let editorList = [];
		id = id || globalData.nowEditorId;
		for (let i = 0; i < this.editorList.length; i++) {
			let tab = this.editorList[i];
			if (tab.id !== id) {
				editorList.push(tab);
			} else {
				break;
			}
		}
		this.closeMultiple(editorList);
	}
	closeToRight(id) {
		let editorList = [];
		id = id || globalData.nowEditorId;
		for (let i = this.editorList.length - 1; i >= 0; i++) {
			let tab = this.editorList[i];
			if (tab.id !== id) {
				editorList.push(tab);
			} else {
				break;
			}
		}
		this.closeMultiple(editorList);
	}
	loadEditor(list) {
		let activeTab = null;
		list.forEach(tab => {
			if (tab.active) {
				activeTab = tab;
			}
			tab.active = false;
			this.editorList.push(tab);
			if (tab.path) {
				EventBus.$emit('file-watch-start', tab.path);
				EventBus.$emit('git-status-start', tab.path);
			}
		});
		activeTab && this.changeTab(activeTab.id);
	}
	focusNowEditor() {
		cancelAnimationFrame(this.closeTabTimer);
		this.closeTabTimer = requestAnimationFrame(() => {
			if (globalData.nowEditorId) {
				globalData.$mainWin.getNowEditor().focus();
			}
		});
	}
	formatCode(id) {
		clearTimeout(this.formatCodeTimer);
		this.formatCodeTimer = setTimeout(() => {
			let editor = globalData.nowEditorId && globalData.$mainWin.getNowEditor();
			let parser = editor && this.getFormatParser(editor.language);
			if (editor && parser && id === globalData.nowEditorId) {
				let context = contexts[globalData.nowEditorId];
				let cursorOffset = editor.nowCursorPos.column;
				let cursorComment = this.getCursorComment(editor.language);
				let text = context.getAllText();
				let result = null;
				let cursorPos = null;
				for (let i = 0; i < editor.nowCursorPos.line - 1; i++) {
					cursorOffset += context.htmls[i].text.length + 1;
				}
				text = text.slice(0, cursorOffset) + cursorComment + text.slice(cursorOffset);
				try {
					result = parser(text);
					if (text !== result) {
						let beforeText = '';
						let afterText = '';
						cursorOffset = result.indexOf(cursorComment);
						afterText = result.slice(cursorOffset + cursorComment.length);
						if (result[cursorOffset - 1] === '\n') {
							beforeText = result.slice(0, cursorOffset - 1);
						} else {
							beforeText = result.slice(0, cursorOffset);
						}
						result = beforeText + afterText;
						beforeText = beforeText.split(/\n/);
						cursorPos = { line: beforeText.length, column: beforeText.peek().length };
						EventBus.$emit('editor-formated', {
							id,
							cursorPos,
							text: result
						});
					}
				} catch (e) {}
			}
		}, 50);
	}
	getFormatParser(language) {
		let parser = null;
		switch (language) {
			case 'javascript':
			case 'javascriptreact':
			case 'typescript':
			case 'typescriptreact':
			case 'coffeescript':
				parser = JsBeautify.js;
				break;
			case 'html':
			case 'vue':
			case 'xml':
				parser = JsBeautify.html;
				break;
			case 'css':
			case 'scss':
			case 'less':
				parser = JsBeautify.css;
				break;
		}
		return parser;
	}
	getCursorComment(language) {
		let comment = '';
		switch (language) {
			case 'javascript':
			case 'javascriptreact':
			case 'typescript':
			case 'typescriptreact':
			case 'coffeescript':
			case 'css':
			case 'scss':
			case 'less':
				comment = `/*${Util.getUUID()}*/`;
				break;
			case 'html':
			case 'vue':
			case 'xml':
				comment = `<!--${Util.getUUID()}-->`;
				break;
		}
		return comment;
	}
}
