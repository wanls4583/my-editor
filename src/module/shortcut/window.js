/*
 * @Author: lisong
 * @Date: 2022-02-18 16:13:15
 * @Description:
 */
import EventBus from '@/event';
import globalData from '@/data/globalData';

const remote = window.require('@electron/remote');

export const windowKeyMap = {
	'Ctrl+Shift+KeyS': {
		command: 'saveFileAs'
	},
	'Ctrl+Shift+KeyB': {
		command: 'toggleSatusbar'
	},
	'Ctrl+Shift+KeyM': {
		command: 'toggleMinimap'
	},
	'Ctrl+Shift+KeyF': {
		command: 'findInFiles'
	},
	'Ctrl+Shift+KeyH': {
		command: 'replaceInFiles'
	},
	'Ctrl+KeyR': {
		command: 'reloadWindow'
	},
	'Ctrl+Add': {
		command: 'zoomLevelPlus'
	},
	'Ctrl+NumpadAdd': {
		command: 'zoomLevelPlus'
	},
	'Ctrl+Equal': {
		command: 'zoomLevelPlus'
	},
	'Ctrl+Minus': {
		command: 'zoomLevelMinus'
	},
	'Ctrl+NumpadSubtract': {
		command: 'zoomLevelMinus'
	},
	'Ctrl+KeyS': {
		command: 'saveFile'
	},
	'Ctrl+KeyG': {
		command: 'gotoLine'
	},
	'Ctrl+KeyP': {
		command: 'openCmdPanel'
	},
	'Ctrl+L': {
		command: 'toggleSidebar'
	},
	'Ctrl+Backquote': {
		command: 'toggleTerminal'
	},
	'F12': {
		command: 'openDevTools'
	}
}

export class WindowCommand {
	constructor() { }
	saveFileAs() {
		EventBus.$emit('file-save-as', { id: globalData.nowEditorId });
	}
	toggleSatusbar() {
		EventBus.$emit('statusbar-toggle');
	}
	toggleMinimap() {
		EventBus.$emit('minimap-toggle');
	}
	toggleSidebar() {
		EventBus.$emit('sidebar-toggle');
	}
	toggleTerminal() {
		EventBus.$emit('terminal-toggle');
	}
	findInFiles() {
		EventBus.$emit('find-in-folder');
	}
	replaceInFiles() {
		EventBus.$emit('find-in-folder', { replace: true });
	}
	reloadWindow() {
		remote.getCurrentWindow().reload();
	}
	zoomLevelPlus() {
		globalData.zoomLevel += 1;
		remote.getCurrentWindow().webContents.setZoomLevel(globalData.zoomLevel);
	}
	zoomLevelMinus() {
		globalData.zoomLevel -= 1;
		remote.getCurrentWindow().webContents.setZoomLevel(globalData.zoomLevel);
	}
	saveFile() {
		EventBus.$emit('file-save', { id: globalData.nowEditorId });
	}
	gotoLine() {
		EventBus.$emit('menu-close');
		EventBus.$emit('cmd-search-open', { input: ':' });
	}
	openCmdPanel() {
		EventBus.$emit('menu-close');
		EventBus.$emit('cmd-search-open');
	}
	openDevTools() {
		remote.getCurrentWindow().openDevTools();
	}
}