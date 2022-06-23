import Util from '../../common/util';
import globalData from '../../data/globalData';
import EventBus from '@/event';

const fs = window.require('fs');

export default class {
	constructor() {}
	storeData() {
		this.storeGlobalData();
		this.storeFileTree();
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
}
