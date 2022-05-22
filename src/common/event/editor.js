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
		EventBus.$on('icon-change', () => {
			this.changeBarIcon();
		});
		EventBus.$on('theme-change', () => {
			this.changeBarIcon();
		});
		EventBus.$on('editor-close', id => {
			this.closeTab(id);
		});
		EventBus.$on('editor-change', id => {
			this.changeTab(id);
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
		EventBus.$on('editor-content-change', id => {
			let tab = Util.getTabById(this.editorList, id);
			tab.saved = false;
			this.editorList.splice();
		});
		EventBus.$on('language-check', () => {
			this.checkLanguage();
		});
		EventBus.$on('folder-opened', () => {
			this.editorList.empty();
			globalData.nowId = null;
		});
	}
	changeBarIcon() {
		this.editorList.forEach(item => {
			if (globalData.nowIconTheme.value) {
				let icon = Util.getIconByPath({
					iconData: globalData.nowIconData,
					filePath: item.path,
					fileType: 'file',
					themeType: globalData.nowTheme.type,
				});
				item.icon = icon ? `my-file-icon my-file-icon-${icon}` : '';
			} else {
				item.icon = '';
			}
		});
		this.editorList.splice();
	}
	changeTab(id) {
		let tab = Util.getTabById(this.editorList, id);
		if (tab && !tab.active) {
			this.editorList.forEach(item => {
				item.active = false;
			});
			tab.active = true;
			globalData.nowId = id;
			this.changeStatus();
		} else {
			this.focusNowEditor();
		}
	}
	changeStatus() {
		let changStatusId = this.changeStatus.id || 1;
		this.changeStatus.id = changStatusId;
		Vue.prototype.$nextTick(() => {
			if (this.changeStatus.id !== changStatusId) {
				return;
			}
			let editor = globalData.$mainWin.getNowEditor();
			let tab = Util.getTabById(this.editorList, globalData.nowId);
			EventBus.$emit(`editor-changed`, {
				id: tab.id,
				path: tab.path,
				language: editor.language,
				tabSize: editor.tabSize,
				line: editor.nowCursorPos ? editor.nowCursorPos.line : '?',
				column: editor.nowCursorPos ? editor.nowCursorPos.column : '?',
			});
		});
	}
	// 检查当前打开的文件的语言
	checkLanguage() {
		if (globalData.nowId) {
			let tab = Util.getTabById(this.editorList, globalData.nowId);
			let suffix = /\.[^\.]+$/.exec(tab.name);
			if (!suffix) {
				return;
			}
			for (let i = 0; i < globalData.languageList.length; i++) {
				let language = globalData.languageList[i];
				if (language.extensions && language.extensions.indexOf(suffix[0]) > -1) {
					Vue.prototype.$nextTick(() => {
						EventBus.$emit('language-change', language.value);
					});
					break;
				}
			}
		}
	}
	closeTab(id) {
		let tab = Util.getTabById(this.editorList, id || globalData.nowId);
		let index = this.editorList.indexOf(tab);
		return new Promise((resolve, reject) => {
			if (!tab.saved) {
				_saveDialog.call(this, resolve);
			} else {
				_closeTab.call(this, resolve);
			}
		});

		function _closeTab(resolve) {
			this.editorList.splice(index, 1);
			contexts[id] = null;
			if (tab.active) {
				globalData.nowId = null;
				tab.active = false;
				tab = this.editorList[index] || this.editorList[index - 1];
				if (tab) {
					this.changeTab(tab.id);
				} else {
					EventBus.$emit('editor-changed', null);
				}
			} else {
				this.focusNowEditor();
			}
			resolve();
		}

		function _saveDialog(resolve) {
			this.win.showDialog({
				content: '文件尚未保存，是否先保存文件？',
				cancel: true,
				icon: 'my-icon-warn',
				iconColor: 'rgba(255,196,0)',
				btns: [
					{
						name: '保存',
						callback: () => {
							if (this.mode === 'app') {
								this.saveFile(id).then(() => {
									_closeTab.call(this, resolve);
									this.win.closeDialog();
								});
							} else {
								_closeTab.call(this, resolve);
								this.win.closeDialog();
							}
						},
					},
					{
						name: '不保存',
						callback: () => {
							_closeTab.call(this, resolve);
							this.win.closeDialog();
						},
					},
				],
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
		id = id || globalData.nowId;
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
		id = id || globalData.nowId;
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
	focusNowEditor() {
		cancelAnimationFrame(this.closeTabTimer);
		this.closeTabTimer = requestAnimationFrame(() => {
			if (globalData.nowId) {
				globalData.$mainWin.getNowEditor().focus();
			}
		});
	}
}
