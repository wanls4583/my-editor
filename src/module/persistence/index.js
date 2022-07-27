import Util from '../../common/util';
import globalData from '../../data/globalData';
import EventBus from '@/event';
import Context from '@/module/context/index';

const fs = window.require('fs');
const path = window.require('path');
const contexts = Context.contexts;

export default class {
	constructor() {
		this.storeTabDataTimer = {};
		EventBus.$on('window-close', () => {
			this.storeData();
		});
	}
	storeData() {
		this.storeGlobalData();
		this.storeFileTree();
		this.storeTabData();
		this.storeTerminalTabData();
		this.storeTempData();
	}
	storeGlobalData() {
		let data = {
			nowTheme: globalData.nowTheme,
			nowIconTheme: globalData.nowIconTheme,
			views: globalData.views,
			zoomLevel: globalData.zoomLevel,
			multiKeyCode: globalData.multiKeyCode
		};
		Util.writeFileSync(globalData.configPath, JSON.stringify(data));
	}
	storeFileTree() {
		let openedFileList = globalData.openedFileList;
		let results = [];
		for (let i = 0; i < openedFileList.length; i++) {
			let item = openedFileList[i];
			// 只记录根文件夹和打开的文件夹路径
			if (item.type === 'dir' && (item.open || !item.parentPath)) {
				results.push({
					path: item.path,
					parentPath: item.parentPath,
					rootPath: item.rootPath,
					open: item.open,
				});
			}
		}
		Util.writeFileSync(globalData.fileTreePath, JSON.stringify(results));
	}
	loadFileTree() {
		if (fs.existsSync(globalData.fileTreePath)) {
			Util.loadJsonFile(globalData.fileTreePath).then(data => {
				if (data && data.length && data.__proto__.constructor === Array) {
					EventBus.$emit('file-tree-loaded', data);
				}
			});
		}
	}
	storeTabData() {
		let data = [];
		let preItem = {};
		let active = false;
		globalData.editorList.forEach(item => {
			if (item.id !== preItem.id) {
				data.push({
					id: item.id,
					name: item.name,
					icon: item.icon,
					path: item.path,
					tempPath: (!item.saved && path.join(globalData.cachePath, item.id)) || '',
					active: item.active,
					saved: item.saved,
					isSetting: item.isSetting,
					isShortcut: item.isShortcut,
				});
				preItem = item;
				active = item.active;
			}
		});
		if (data.length && !active) {
			data[0].active = true;
		}
		Util.writeFileSync(globalData.tabPath, JSON.stringify(data));
	}
	loadTabData() {
		if (fs.existsSync(globalData.tabPath)) {
			Util.loadJsonFile(globalData.tabPath).then(data => {
				if (data && data.length && data.__proto__.constructor === Array) {
					EventBus.$emit('editor-loaded', data);
				}
			});
		}
	}
	storeTerminalTabData() {
		let data = [];
		let preItem = {};
		globalData.terminalList.map(item => {
			if (item.id !== preItem.id) {
				data.push({
					id: item.id,
					name: item.name,
					title: item.title,
					path: item.path,
					active: item.active,
				});
				preItem = item;
			}
		});
		Util.writeFileSync(globalData.terminalTabPath, JSON.stringify(data));
	}
	loadTerminalTabData() {
		if (fs.existsSync(globalData.terminalTabPath)) {
			Util.loadJsonFile(globalData.terminalTabPath).then(data => {
				if (data && data.length && data.__proto__.constructor === Array) {
					EventBus.$emit('terminal-loaded', data);
				}
			});
		}
	}
	storeTempData() {
		globalData.editorList.forEach(item => {
			if (!item.saved && !item.tempSaved) {
				Util.writeFileSync(path.join(globalData.cachePath, item.id), contexts[item.id].getAllText());
				item.tempSaved = true;
			}
		});
	}
	storeTempDataById(id) {
		let tab = Util.getTabById(globalData.editorList, id);
		if (tab) {
			tab.tempSaved = false;
			clearTimeout(this.storeTabDataTimer[id]);
			this.storeTabDataTimer[id] = setTimeout(() => {
				let tab = Util.getTabById(globalData.editorList, id);
				if (tab && !tab.saved && !tab.tempSaved) {
					Util.writeFile(path.join(globalData.cachePath, id), contexts[id].getAllText()).then(() => {
						tab.tempSaved = true;
					});
				}
			}, 5000);
		}
	}
	storeShortcutData(data) {
		Util.writeFile(globalData.shortcutPath, JSON.stringify(data)).then(() => {
			EventBus.$emit('shortcut-stored');
		});
	}
	loadShortcutData() {
		if (fs.existsSync(globalData.shortcutPath)) {
			Util.loadJsonFile(globalData.shortcutPath).then(data => {
				if (data && data.length && data.__proto__.constructor === Array) {
					EventBus.$emit('shortcut-loaded', data);
				}
			});
		}
	}
}
