/*
 * @Author: lisong
 * @Date: 2022-02-18 16:13:15
 * @Description:
 */
import Util from '@/common/util';
import globalData from '@/data/globalData';

const remote = window.require('@electron/remote');

export default class {
	constructor(win) {
		this.initProperties(win);
	}
	initProperties(win) {
		Util.defineProperties(this, win, []);
	}
	onKeydown(e) {
		if (e.ctrlKey) {
			switch (e.code) {
				case 'Equal':
					e.preventDefault();
					globalData.zoomLevel += 0.5;
					remote.getCurrentWindow().webContents.setZoomLevel(globalData.zoomLevel);
					break;
				case 'Minus':
					e.preventDefault();
					globalData.zoomLevel -= 0.5;
					remote.getCurrentWindow().webContents.setZoomLevel(globalData.zoomLevel);
					break;
			}
		}
	}
}
