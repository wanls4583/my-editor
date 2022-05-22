import Vue from 'vue';
import Context from '@/module/context/index';
import EventBus from '@/event';
import globalData from '@/data/globalData';
import Util from '@/common/util';

const remote = window.require('@electron/remote');
const contexts = Context.contexts;

export default class {
	constructor(win) {
		this.win = win;
		this.editorList = globalData.editorList;
		this.nowId = 0;
		this.idCount = 1;
		this.titleCount = 1;
		this.init(win);
	}
	init(win) {
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
			let tab = this.getTabById(id);
			tab.saved = false;
			this.editorList.splice();
		});
		EventBus.$on('file-open', (fileObj, choseFile) => {
			this.openFile(fileObj, choseFile);
		});
		EventBus.$on('file-save', id => {
			this.saveFile(id);
		});
		EventBus.$on('folder-open', () => {
			this.openFolder();
		});
		EventBus.$on('language-check', () => {
			this.checkLanguage();
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
		let tab = this.getTabById(id);
		if (tab && !tab.active) {
			this.editorList.forEach(item => {
				item.active = false;
			});
			tab.active = true;
			this.nowId = id;
			this.win.nowId = id;
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
			let editor = this.getNowEditor();
			let tab = this.getTabById(this.nowId);
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
		if (this.nowId) {
			let tab = this.getTabById(this.nowId);
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
		let tab = this.getTabById(id || this.nowId);
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
				this.nowId = null;
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
		id = id || this.nowId;
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
		id = id || this.nowId;
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
			if (this.nowId) {
				this.getNowEditor().focus();
			}
		});
	}
	openFolder() {
		this.choseFolder().then(results => {
			if (results) {
				globalData.fileTree.empty();
				globalData.fileTree.push(...results);
				this.editorList.empty();
				this.nowId = null;
			}
		});
	}
	choseFolder() {
		let win = remote.getCurrentWindow();
		let options = {
			title: '选择文件夹',
			properties: ['openDirectory', 'multiSelections'],
		};
		return remote.dialog
			.showOpenDialog(win, options)
			.then(result => {
				let results = [];
				if (!result.canceled && result.filePaths) {
					result.filePaths.forEach(item => {
						let obj = {
							name: item.match(/[^\\\/]+$/)[0],
							path: item,
							type: 'dir',
							active: false,
							open: false,
							children: [],
						};
						results.push(Object.assign({}, obj));
					});
					return results;
				}
			})
			.catch(err => {
				console.log(err);
			});
	}
	openFile(fileObj, choseFile) {
		let tab = fileObj && this.getTabByPath(fileObj.path);
		if (!tab) {
			let index = -1;
			let name = (fileObj && fileObj.name) || `Untitled${this.titleCount++}`;
			if (this.editorList.length) {
				tab = this.getTabById(this.nowId);
				index = this.editorList.indexOf(tab);
			}
			if (choseFile) {
				//从资源管理器中选择文件
				this.choseFile().then(results => {
					if (results) {
						let editorList = this.editorList.slice(0, index).concat(results).concat(this.editorList.slice(index));
						tab = results[0];
						this.editorList.empty();
						this.editorList.push(...editorList);
						_done.call(this);
					}
				});
			} else {
				tab = {
					id: this.idCount++,
					name: name,
					path: (fileObj && fileObj.path) || '',
					icon: (fileObj && fileObj.icon) || '',
					saved: true,
					active: false,
				};
				if (!tab.icon) {
					let icon = Util.getIconByPath({
						iconData: globalData.nowIconData,
						filePath: (fileObj && fileObj.path) || '',
						fileType: 'file',
						themeType: globalData.nowTheme.type,
					});
					tab.icon = icon ? `my-file-icon my-file-icon-${icon}` : '';
				}
				this.editorList.splice(index + 1, 0, tab);
				_done.call(this);
			}
		} else {
			_done.call(this);
		}

		function _done() {
			if (tab && tab.path && !tab.loaded) {
				tab.loaded = true;
				Util.readFile(tab.path)
					.then(data => {
						this.getContext(tab.id).insertContent(data);
						tab.saved = true;
						//点击搜索结果
						if (fileObj && fileObj.range) {
							this.win.getEditor(tab.id).cursor.setCursorPos(Object.assign({}, fileObj.range.start));
						}
					})
					.catch(() => {
						tab.loaded = false;
					});
			} else if (fileObj && fileObj.range) {
				this.win.getEditor(tab.id).cursor.setCursorPos(Object.assign({}, fileObj.range.start));
			}
			this.changeTab(tab.id);
			this.checkLanguage();
		}
	}
	choseFile() {
		let win = remote.getCurrentWindow();
		let options = {
			title: '选择文件',
			properties: ['openFile', 'multiSelections'],
		};
		return remote.dialog
			.showOpenDialog(win, options)
			.then(result => {
				let results = [];
				if (!result.canceled && result.filePaths) {
					result.filePaths.forEach(item => {
						let icon = Util.getIconByPath({
							iconData: globalData.nowIconData,
							filePath: item,
							fileType: 'file',
							thmeType: globalData.nowTheme.type,
						});
						icon = icon ? `my-file-icon my-file-icon-${icon}` : '';
						let obj = {
							id: this.idCount++,
							name: item.match(/[^\\\/]+$/)[0],
							path: item,
							icon: icon,
							saved: true,
							active: false,
						};
						results.push(Object.assign({}, obj));
					});
					return results;
				}
			})
			.catch(err => {
				console.log(err);
			});
	}
	saveFile(id) {
		let tab = this.getTabById(id);
		if (this.mode === 'web') {
			return Promise.resolve();
		}
		if (!tab.saved) {
			if (tab.path) {
				this.writeFile(tab.path, contexts[id].getAllText());
				tab.saved = true;
				return Promise.resolve();
			} else {
				let win = remote.getCurrentWindow();
				let options = {
					title: '请选择要保存的文件名',
					buttonLabel: '保存',
				};
				return remote.dialog.showSaveDialog(win, options).then(result => {
					if (!result.canceled && result.filePath) {
						tab.path = result.filePath;
						tab.name = tab.path.match(/[^\\\/]+$/)[0];
						this.writeFile(tab.path, contexts[id].getAllText());
						tab.saved = true;
					} else {
						return Promise.reject();
					}
				});
			}
		}
	}
	writeFile(path, text) {
		fs.writeFileSync(path, text, { encoding: 'utf-8' });
	}
	getTabById(id) {
		for (let i = 0; i < this.editorList.length; i++) {
			if (this.editorList[i].id === id) {
				return this.editorList[i];
			}
		}
	}
	getTabByPath(path) {
		for (let i = 0; i < this.editorList.length; i++) {
			if (this.editorList[i].path === path) {
				return this.editorList[i];
			}
		}
	}
	getNowEditor() {
		return this.win.getEditor(this.nowId);
	}
	getContext(id) {
		return contexts[id];
	}
	getNowContext() {
		return this.getContext(this.nowId);
	}
}
