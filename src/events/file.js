import EventBus from '@/event';
import Context from '@/module/context/index';
import globalData from '@/data/globalData';
import Util from '@/common/util';

const {
	ipcRenderer
} = window.require('electron');
const remote = window.require('@electron/remote');
const fs = window.require('fs');
const path = window.require('path');
const contexts = Context.contexts;

export default class {
	constructor() {
		this.titleCount = 1;
		this.editorList = globalData.editorList;
		this.fileWatcherMap = {};
		this.fileWatcherTimer = {};
		this.init();
	}
	init() {
		EventBus.$on('file-open', (fileObj, choseFile, blur) => {
			this.openFile({
				fileObj,
				choseFile,
				blur
			});
		});
		EventBus.$on('file-open-with', (filePath, active) => {
			this.openFile({
				fileObj: this.createTabItem(filePath),
				active: active
			});
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
					globalData.fileTree.forEach(item => {
						EventBus.$emit('git-status-stop', item.path);
					});
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
				EventBus.$emit('git-status-stop', dirPath);
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
						results.push(this.createRootDirItem(item));
					});
					return results;
				}
			})
			.catch(err => {
				console.log(err);
			});
	}
	openFile({
		fileObj,
		choseFile = false,
		blur = false,
		active = true
	}) {
		let tab = fileObj && Util.getTabByPath(this.editorList, fileObj.path);
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
							results.forEach(item => {
								EventBus.$emit('git-status-start', item.path);
							});
						} else {
							tab = editorMap[firstId];
						}
						_done.call(this);
					}
				});
			} else {
				if (fileObj) {
					tab = Object.assign({}, fileObj);
					if (fileObj.path) {
						EventBus.$emit('git-status-start', fileObj.path);
					}
				} else {
					tab = this.createEmptyTabItem();
				}
				tab.saved = true;
				tab.active = false;
				this.editorList.splice(index + 1, 0, tab);
				active && _done.call(this);
			}
		} else {
			active && _done.call(this);
		}

		function _done() {
			if (tab && (tab.path || tab.tempPath) && !tab.loaded) {
				let filePath = tab.tempPath || tab.path;
				if (fs.existsSync(filePath)) {
					tab.loaded = true;
					Util.readFile(filePath).then(data => {
						if (contexts[tab.id]) { //此时tab可能已经关闭
							let saved = tab.saved;
							contexts[tab.id].reload(data);
							EventBus.$emit('file-opened', filePath);
							if (!tab.tempPath || saved) {
								EventBus.$emit('file-saved', tab.path);
								tab.saved = true;
							}
							//点击搜索结果
							if (fileObj && fileObj.range) {
								tab.cursorPos = Object.assign({}, fileObj.range.start);
							}
							tab.mtimeMs = fs.statSync(filePath).mtimeMs;
							EventBus.$emit('editor-change', {
								id: tab.id,
								blur
							});
							EventBus.$emit('language-check', tab.id);
						}
					});
				}
			} else {
				if (fileObj && fileObj.range) {
					tab.cursorPos = Object.assign({}, fileObj.range.start);
				}
				EventBus.$emit('editor-change', {
					id: tab.id,
					blur
				});
			}
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
						let obj = this.createTabItem(item);
						results.push(obj);
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
							return this.createRootDirItem(item.path);
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
			return {
				path: item.path
			};
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
	createRootDirItem(filePath) {
		return {
			id: Util.getIdFromPath(filePath),
			name: filePath.match(/[^\\\/]+$/)[0],
			path: filePath,
			parentPath: '',
			relativePath: '',
			rootPath: filePath,
			type: 'dir',
			active: false,
			open: false,
			deep: 0,
			children: [],
		};
	}
	createTabItem(filePath) {
		let fileObj = Util.getFileItemByPath(globalData.fileTree, filePath);
		fileObj.sort((a, b) => {
			return b.rootPath.length - a.rootPath.length;
		});
		fileObj = fileObj[0];
		if (fileObj) {
			fileObj = Object.assign({}, fileObj);
			fileObj.active = false;
			fileObj.saved = true;
		} else {
			let icon = Util.getIconByPath({
				filePath: filePath,
				fileType: 'file',
			});
			icon = icon ? `my-file-icon my-file-icon-${icon}` : '';
			fileObj = {
				id: Util.getIdFromPath(filePath),
				name: filePath.match(/[^\\\/]+$/)[0],
				path: filePath,
				parentPath: path.dirname(filePath),
				relativePath: '',
				rootPath: '',
				icon: icon,
				active: false,
				saved: true,
			};
		}
		return fileObj;
	}
	createEmptyTabItem() {
		let titleCount = this.titleCount++;
		let icon = Util.getIconByPath({
			filePath: '',
			fileType: 'file',
		});
		icon = icon ? `my-file-icon my-file-icon-${icon}` : '';
		return {
			id: 'file-' + titleCount,
			name: 'Untitled' + titleCount,
			path: '',
			parentPath: '',
			relativePath: '',
			rootPath: '',
			icon: icon,
			active: false,
			saved: true,
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