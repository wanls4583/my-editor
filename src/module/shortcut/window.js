/*
 * @Author: lisong
 * @Date: 2022-02-18 16:13:15
 * @Description:
 */
import Util from '@/common/util';
import EventBus from '@/event';
import globalData from '@/data/globalData';

const remote = window.require('@electron/remote');

export default class {
	constructor() { }
	onKeydown(e) {
		if (e.ctrlKey) {
			if (e.shiftKey) {
				switch (e.code) {
					case 'KeyS':
						e.preventDefault();
						EventBus.$emit('file-save-as', { id: globalData.nowEditorId });
				}
			} else {
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
					case 'KeyS':
						e.preventDefault();
						EventBus.$emit('file-save', { id: globalData.nowEditorId });
					case 'KeyG': //ctrl+g，跳转
						e.preventDefault();
						EventBus.$emit('menu-close');
						EventBus.$emit('cmd-search-open', { input: ':' });
						break;
					case 'KeyP': //ctrl+p，命令面板
						e.preventDefault();
						EventBus.$emit('menu-close');
						EventBus.$emit('cmd-search-open');
						break;
				}
			}
		}
	}
}
