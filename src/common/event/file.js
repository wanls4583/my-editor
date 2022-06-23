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
		EventBus.$on('file-save-as', option => {
			this.saveFile(option.id, true).then(() => {
				option.success && option.success();
			});
		});
		EventBus.$on('file-changed', filePath => {
			let stat = fs.statSync(filePath);
			let tab = Util.getTabByPath(this.editorList, filePath);
			// 文件改变后与当前打开内容不一致
			if (tab && tab.saved && tab.mtimeMs !== stat.mtimeMs) {
				Util.readFile(filePath).then(text => {
					contexts[tab.id].reload(text);
					tab.saved = true;
				});
			}
		});
		EventBus.$on('folder-open', () => {
			this.openFolder();
		});
		EventBus.$on('folder-add', () => {
			this.openFolder(true);
		});
		EventBus.$on('folder-remove', dirPath => {
			this.removeFolder(dirPath);
		});
		EventBus.$on('reveal-in-file-explorer', path => {
			if (path) {
				remote.shell.showItemInFolder(path);
			}
		});
		EventBus.$on('file-copy', fileObj => {
			this.cutPath = '';
			this.copyFileToClip(fileObj);
		});
		EventBus.$on('file-cut', fileObj => {
			this.cutPath = fileObj.path;
			this.cutFileToClip(fileObj);
		});
		EventBus.$on('file-paste', fileObj => {
			this.pasteFileFromClip(fileObj, this.cutPath);
			this.cutPath = '';
		});
		EventBus.$on('file-rename', (filePath, newFileNmme) => {
			ipcRenderer.send('file-rename', filePath, newFileNmme);
		});
		EventBus.$on('file-create', filePath => {
			ipcRenderer.send('file-create', filePath);
		});
		EventBus.$on('folder-create', filePath => {
			ipcRenderer.send('folder-create', filePath);
		});
		EventBus.$on('file-delete', fileObj => {
			ipcRenderer.send('file-delete', fileObj.path);
		});
		EventBus.$on('workspace-save-as', () => {
			this.saveWorkspace(true);
		});
		EventBus.$on('workspace-open', () => {
			this.openWorkspace();
		});
	}
	openFolder(addToWorkspace) {
		this.choseFolder().then(results => {
			if (results) {
				if (addToWorkspace) {
					let rootPathMap = {};
					globalData.fileTree.forEach(item => {
						rootPathMap[item.path] = true;
					});
					results = results.filter(item => {
						return !rootPathMap[item.path];
					});
					results.length && globalData.fileTree.push(...results);
					EventBus.$emit('folder-added');
				} else {
					globalData.fileTree.empty();
					globalData.fileTree.push(...results);
					EventBus.$emit('folder-opened');
				}
				this.saveWorkspace();
			}
		});
	}
	removeFolder(dirPath) {
		for (let i = 0; i < globalData.fileTree.length; i++) {
			if (globalData.fileTree[i].path === dirPath) {
				globalData.fileTree.splice(i, 1);
				EventBus.$emit('folder-removed');
				this.saveWorkspace();
				break;
			}
		}
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
						results.push(this.createRootItem(item));
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
			if (this.editorList.length) {
				tab = Util.getTabById(this.editorList, globalData.nowEditorId);
				index = this.editorList.indexOf(tab); //在当前活动标签之后新增
			}
			if (choseFile) {
				//从资源管理器中选择文件
				this.choseFile().then(results => {
					if (results) {
						let editorMap = this.getEditorMap();
						let firstId = results[0].id;
						// 过滤已经打开过的文件
						results = results.filter(item => {
							return !editorMap[item.id];
						});
						if (results.length) {
							let editorList = this.editorList.slice(0, index).concat(results).concat(this.editorList.slice(index));
							tab = results[0];
							this.editorList.empty();
							this.editorList.push(...editorList);
						} else {
							tab = editorMap[firstId];
						}
						_done.call(this);
					}
				});
			} else {
				tab = {
					id: fileObj.id || titleCount,
					name: fileObj.name || `Untitled${titleCount}`,
					path: fileObj.path || '',
					icon: fileObj.icon || '',
					status: fileObj.status || '',
					statusColor: fileObj.statusColor || '',
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
				tab.mtimeMs = fs.statSync(tab.path).mtimeMs;
				tab.loaded = true;
				Util.readFile(tab.path)
					.then(data => {
						contexts[tab.id].reload(data);
						EventBus.$emit('file-saved', tab.path);
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
						let statusColor = '';
						let status = '';
						let fileObj = Util.getFileItemByPath(globalData.fileTree, item);
						let icon = Util.getIconByPath({
							iconData: globalData.nowIconData,
							filePath: item,
							fileType: 'file',
							thmeType: globalData.nowTheme.type,
						});
						icon = icon ? `my-file-icon my-file-icon-${icon}` : '';
						if (fileObj) {
							status = Util.getFileStatus(globalData.fileStatus, fileObj.relativePath, fileObj.rootPath);
							statusColor = status.statusColor;
							status = obj.status.status;
						}
						let obj = {
							id: Util.getIdFromStat(fs.statSync(item)),
							name: item.match(/[^\\\/]+$/)[0],
							path: item,
							icon: icon,
							status: status,
							statusColor: statusColor,
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
	saveFile(id, saveAs) {
		let tab = Util.getTabById(this.editorList, id);
		if (this.mode === 'web') {
			return Promise.resolve();
		}
		if (!tab.saved || saveAs) {
			if (tab.path && !saveAs) {
				return Util.writeFile(tab.path, contexts[id].getAllText()).then(() => {
					tab.saved = true;
					tab.mtimeMs = fs.statSync(tab.path).mtimeMs;
					EventBus.$emit('file-saved', tab.path);
				});
			} else {
				let win = remote.getCurrentWindow();
				let options = {
					title: '请选择要保存的文件名',
					buttonLabel: '保存',
				};
				return remote.dialog.showSaveDialog(win, options).then(result => {
					if (!result.canceled && result.filePath) {
						return Util.writeFile(result.filePath, contexts[id].getAllText()).then(() => {
							if (!tab.path) {
								tab.path = result.filePath;
								tab.mtimeMs = fs.statSync(tab.path).mtimeMs;
								tab.name = tab.path.match(/[^\\\/]+$/)[0];
								tab.saved = true;
							}
						});
					} else {
						return Promise.reject();
					}
				});
			}
		}
		return Promise.resolve();
	}
	openWorkspace() {
		let win = remote.getCurrentWindow();
		let options = {
			title: '选择文件',
			properties: ['openFile'],
		};
		return remote.dialog
			.showOpenDialog(win, options)
			.then(result => {
				if (!result.canceled && result.filePaths) {
					let workSpacePath = result.filePaths[0];
					Util.loadJsonFile(workSpacePath).then(data => {
						let folders = data.folders;
						let exsitMap = {};
						globalData.fileTree.forEach(item => {
							exsitMap[item.path] = true;
						});
						folders = folders.filter(item => {
							return !exsitMap[item.path];
						});
						folders = folders.map(item => {
							return this.createRootItem(item.path);
						});
						globalData.fileTree.push(...folders);
						EventBus.$emit('workspace-opened');
						globalData.workSpacePath = workSpacePath;
					});
				}
			})
			.catch(err => {
				console.log(err);
			});
	}
	saveWorkspace(saveAs) {
		let list = globalData.fileTree.map(item => {
			return { path: item.path };
		});
		let data = JSON.stringify({
			folders: list,
		});
		if (saveAs) {
			let win = remote.getCurrentWindow();
			let options = {
				title: '请选择要保存的文件名',
				buttonLabel: '保存',
			};
			return remote.dialog.showSaveDialog(win, options).then(result => {
				if (!result.canceled && result.filePath) {
					return Util.writeFile(result.filePath, data);
				} else {
					return Promise.reject();
				}
			});
		} else if (globalData.workSpacePath) {
			return Util.writeFile(globalData.workSpacePath, data);
		}
	}
	copyFileToClip(fileObj) {
		ipcRenderer.send('file-copy', [fileObj.path]);
	}
	cutFileToClip(fileObj) {
		ipcRenderer.send('file-cut', [fileObj.path]);
	}
	pasteFileFromClip(fileObj, cutPath) {
		ipcRenderer.send('file-paste', fileObj.path, cutPath);
	}
	createRootItem(filePath) {
		return {
			id: Util.getIdFromStat(fs.statSync(filePath)),
			name: filePath.match(/[^\\\/]+$/)[0],
			path: filePath,
			parentPath: '',
			relativePath: '',
			rootPath: filePath,
			parent: null,
			type: 'dir',
			active: false,
			open: false,
			children: [],
		};
	}
	getEditorMap() {
		let editorMap = {};
		this.editorList.forEach(item => {
			editorMap[item.id] = item;
		});
		return editorMap;
	}
}
