import Vue from 'vue';
import Context from '@/module/context/index';
import EventBus from '@/event';
import globalData from '@/data/globalData';
import Util from '@/common/util';

const contexts = Context.contexts;

export default class {
	constructor() {
		this.editorList = globalData.editorList;
		this.init();
	}
	init() {
		EventBus.$on('editor-close', id => {
			this.closeTab(id);
		});
		EventBus.$on('editor-change', ({ id, blur }) => {
			this.changeTab(id, blur);
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
		EventBus.$on('language-check', (id) => {
			this.checkLanguage(id);
		});
		EventBus.$on('folder-opened', () => {
			this.editorList.empty();
			globalData.nowEditorId = null;
		});
		EventBus.$on('shortcut-open', () => {
			this.openShortCut();
		});
	}
	changeTab(id, blur) {
		cancelAnimationFrame(this.changeTabTimer);
		this.changeTabTimer = requestAnimationFrame(() => {
			let tab = Util.getTabById(this.editorList, id);
			if (tab && !tab.active) {
				globalData.nowEditorId = id;
				if (tab.path && !tab.loaded) {
					//tab对应的文件内容还未加载
					EventBus.$emit('file-open', tab);
				} else {
					this.editorList.forEach(item => {
						item.active = false;
					});
					tab.active = true;
					this.changeStatus();
					!blur && this.focusNowEditor();
				}
			} else if (tab) {
				if (tab.cursorPos) {
					//点击左侧文件内容搜索结果，跳转到相应位置
					let editor = globalData.$mainWin.getNowEditor();
					editor.cursor.setCursorPos(tab.cursorPos);
					editor.scrollToLine(tab.cursorPos.line, tab.cursorPos.column);
					delete tab.cursorPos;
				}
				!blur && this.focusNowEditor();
			}
		})
	}
	saveTab(id) {
		let tab = Util.getTabById(this.editorList, id);
		tab.saved = true;
	}
	changeStatus() {
		clearTimeout(this.changeStatusTimer);
		this.changeStatusTimer = setTimeout(() => {
			let editor = globalData.$mainWin.getNowEditor();
			let tab = Util.getTabById(this.editorList, globalData.nowEditorId);
			if (editor) {
				EventBus.$emit(`editor-changed`, {
					id: tab.id,
					path: tab.path,
					language: editor.language,
					tabSize: editor.tabSize,
					indent: editor.indent,
					line: editor.nowCursorPos ? editor.nowCursorPos.line : '?',
					column: editor.nowCursorPos ? editor.nowCursorPos.column : '?'
				});
			}
		});
	}
	// 检查当前打开的文件的语言
	checkLanguage(id) {
		id = id || globalData.nowEditorId;
		if (id) {
			let tab = Util.getTabById(this.editorList, id);
			let suffix = /\.[^\.]+$/.exec(tab.name);
			if (!suffix) {
				return;
			}
			for (let i = 0; i < globalData.languageList.length; i++) {
				let language = globalData.languageList[i];
				if (language.extensions && language.extensions.indexOf(suffix[0]) > -1) {
					EventBus.$emit('language-change', { id: tab.id, language: language.value });
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
							EventBus.$emit('file-save', {
								id: id,
								success: () => {
									_closeTab.call(this, resolve);
									EventBus.$emit('dialog-close');
								}
							});
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
		Promise.resolve().then(() => {
			globalData.nowEditorId = null;
			EventBus.$emit('editor-changed', null);
		});
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
		for (let i = this.editorList.length - 1; i >= 0; i--) {
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
			if(tab && tab.id) {
				if (tab.active) {
					activeTab = tab;
				}
				tab.active = false;
				this.editorList.push(tab);
				if (tab.path) {
					EventBus.$emit('file-watch-start', tab.path);
					EventBus.$emit('git-status-start', tab.path);
				}
			}
		});
		activeTab && this.changeTab(activeTab.id);
	}
	focusNowEditor() {
		cancelAnimationFrame(this.closeTabTimer);
		this.closeTabTimer = requestAnimationFrame(() => {
			let editor = globalData.$mainWin.getNowEditor();
			if (editor) {
				editor.focus();
			}
		});
	}
	openShortCut() {
		let shortcutTab = this.findShortcutTab();
		if (shortcutTab) {
			this.changeTab(shortcutTab.id);
			return;
		}
		let tab = Util.getTabById(this.editorList, globalData.nowEditorId);
		let index = this.editorList.indexOf(tab);
		tab = {
			id: 'shortcut-' + Util.getUUID(),
			name: 'Keyboard Shortcuts',
			icon: 'my-file-icon my-file-icon-file',
			isShortcut: true,
			isSetting: true,
			saved: true,
			active: false
		};
		this.editorList.splice(index + 1, 0, tab);
		this.changeTab(tab.id);
	}
	findShortcutTab() {
		for (let i = 0; i < this.editorList.length; i++) {
			if (this.editorList[i].isShortcut) {
				return this.editorList[i];
			}
		}
	}
}
