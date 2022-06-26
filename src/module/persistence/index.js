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
	}
	storeData() {
		this.storeGlobalData();
		this.storeFileTree();
		this.storeTabData();
		this.storeTempData();
	}
	storeGlobalData() {
		let data = {
			nowTheme: globalData.nowTheme,
			nowIconTheme: globalData.nowIconTheme,
		};
		Util.writeFileSync(globalData.configPath, JSON.stringify(data));
	}
	storeFileTree() {
		let openedFileList = globalData.openedFileList;
		let results = [];
		for (let i = 0; i < openedFileList.length; i++) {
			let item = openedFileList[i];
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
				if (data && data.length) {
					EventBus.$emit('file-tree-loaded', data);
				}
			});
		}
	}
	storeTabData() {
		let data = globalData.editorList.map(item => {
			return {
				id: item.id,
				name: item.name,
				path: item.path,
				tempPath: (!item.saved && path.join(globalData.cachePath, item.id)) || '',
				active: item.active,
				saved: item.saved,
			};
		});
		Util.writeFileSync(globalData.tabPath, JSON.stringify(data));
	}
	loadTabData() {
		if (fs.existsSync(globalData.tabPath)) {
			Util.loadJsonFile(globalData.tabPath).then(data => {
				if (data && data.length) {
					EventBus.$emit('editor-loaded', data);
				}
			});
		}
	}
	storeTempData() {
		globalData.editorList.forEach(item => {
			if (!tab.saved && !tab.tempSaved) {
				Util.writeFileSync(path.join(globalData.cachePath, item.id), contexts[item.id].getAllText());
				tab.tempSaved = true;
			}
		});
	}
	storeTempDataById(id) {
		let tab = Util.getTabById(globalData.editorList, id);
		tab.tempSaved = false;
		clearTimeout(this.storeTabDataTimer[id]);
		this.storeTabDataTimer[id] = setTimeout(() => {
			if (tab && !tab.saved && !tab.tempSaved) {
				Util.writeFileSync(path.join(globalData.cachePath, id), contexts[id].getAllText());
				tab.tempSaved = true;
			}
		}, 5000);
	}
}
