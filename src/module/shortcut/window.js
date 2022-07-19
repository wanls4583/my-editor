/*
 * @Author: lisong
 * @Date: 2022-02-18 16:13:15
 * @Description:
 */
import EventBus from '@/event';
import globalData from '@/data/globalData';

const remote = window.require('@electron/remote');

export default class {
	constructor() { }
	onKeydown(e) {
		if(globalData.compositionstart) { //正在输中文，此时不做处理
			return;
		}
		if (e.ctrlKey && e.shiftKey) {
			switch (e.code) {
				case 'KeyS':
					e.preventDefault();
					EventBus.$emit('file-save-as', { id: globalData.nowEditorId });
					break;
				case 'KeyL':
					e.preventDefault();
					EventBus.$emit('sidebar-toggle');
					break;
				case 'KeyB':
					e.preventDefault();
					EventBus.$emit('statusbar-toggle');
					break;
				case 'KeyM':
					e.preventDefault();
					EventBus.$emit('minimap-toggle');
					break;
			}
		} else if (e.ctrlKey) {
			switch (e.code) {
				case 'KeyR':
					e.preventDefault();
					remote.getCurrentWindow().reload();
					break;
				case 'Add':
				case 'NumpadAdd':
				case 'Equal':
					e.preventDefault();
					globalData.zoomLevel += 1;
					remote.getCurrentWindow().webContents.setZoomLevel(globalData.zoomLevel);
					break;
				case 'Minus':
				case 'NumpadSubtract':
					e.preventDefault();
					globalData.zoomLevel -= 1;
					remote.getCurrentWindow().webContents.setZoomLevel(globalData.zoomLevel);
					break;
				case 'KeyS':
					e.preventDefault();
					EventBus.$emit('file-save', { id: globalData.nowEditorId });
					break;
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
				case 'Backquote': //ctrl+`
					e.preventDefault();
					EventBus.$emit('terminal-toggle');
					break;
			}
		} else {
			switch (e.code) {
				case 'F12':
					remote.getCurrentWindow().openDevTools();
					break;
			}
		}
	}
}
