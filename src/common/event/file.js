import EventBus from '@/event';
import Context from '@/module/context/index';
import globalData from '@/data/globalData';
import Util from '@/common/util';

const { ipcRenderer } = window.require('electron');
const remote = window.require('@electron/remote');
const fs = window.require('fs');
const contexts = Context.contexts;

export default class {
	constructor() {
		this.titleCount = 1;
		this.editorList = globalData.editorList;
		this.init();
	}
	init() {
		EventBus.$on('file-open', (fileObj, choseFile) => {
			this.openFile(fileObj, choseFile);
		});
		EventBus.$on('file-save', option => {
			this.saveFile(option.id).then(() => {
				option.success && option.success();
			});
		});
		EventBus.$on('folder-open', () => {
			this.openFolder();
		});
		EventBus.$on('reveal-in-file-explorer', path => {
			if (path) {
				remote.shell.showItemInFolder(path);
			}
		});
		EventBus.$on('file-copy', fileObj => {
			this.copyFileToClip(fileObj);
		});
		EventBus.$on('file-cut', fileObj => {
			this.cutFileToClip(fileObj);
		});
	}
	openFolder() {
		this.choseFolder().then(results => {
			if (results) {
				globalData.fileTree.empty();
				globalData.fileTree.push(...results);
				EventBus.$emit('folder-opened');
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
						let stat = fs.statSync(item);
						let obj = {
							id: stat.dev + ',' + stat.ino,
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
		let tab = fileObj && Util.getTabByPath(this.editorList, fileObj.path);
		let titleCount = this.titleCount++;
		titleCount += '';
		fileObj = fileObj || {};
		if (!tab) {
			let index = -1;
			let name = fileObj.name || `Untitled${titleCount}`;
			if (this.editorList.length) {
				tab = Util.getTabById(this.editorList, globalData.nowId);
				index = this.editorList.indexOf(tab); //在当前活动标签之后新增
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
					id: fileObj.id || titleCount,
					name: name,
					path: fileObj.path || '',
					icon: fileObj.icon || '',
					saved: true,
					active: false,
				};
				if (!tab.icon) {
					let icon = Util.getIconByPath({
						iconData: globalData.nowIconData,
						filePath: fileObj.path || '',
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
						contexts[tab.id].insertContent(data);
						tab.saved = true;
						//点击搜索结果
						if (fileObj.range) {
							globalData.$mainWin.getEditor(tab.id).cursor.setCursorPos(Object.assign({}, fileObj.range.start));
						}
					})
					.catch(() => {
						tab.loaded = false;
					});
			} else if (fileObj.range) {
				globalData.$mainWin.getEditor(tab.id).cursor.setCursorPos(Object.assign({}, fileObj.range.start));
			}
			EventBus.$emit('editor-change', tab.id);
			EventBus.$emit('language-check');
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
						let stat = fs.statSync(item);
						let obj = {
							id: stat.dev + ',' + stat.ino,
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
		let tab = Util.getTabById(this.editorList, id);
		if (this.mode === 'web') {
			return Promise.resolve();
		}
		if (!tab.saved) {
			if (tab.path) {
				Util.writeFile(tab.path, contexts[id].getAllText());
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
						Util.writeFile(tab.path, contexts[id].getAllText());
						tab.saved = true;
					} else {
						return Promise.reject();
					}
				});
			}
		}
	}
	copyFileToClip(fileObj) {
		ipcRenderer.send('file-copy', [fileObj.path]);
	}
	cutFileToClip(fileObj) {
		ipcRenderer.send('file-cut', [fileObj.path]);
	}
}
