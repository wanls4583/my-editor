/*
 * @Author: lisong
 * @Date: 2022-02-18 16:13:15
 * @Description:
 */
import EventBus from '@/event';
import globalData from '@/data/globalData';

const remote = window.require('@electron/remote');

export const windowKeyMap = {
	'control+shift+KeyS': {
		command: 'saveFileAs'
	},
	'control+shift+KeyB': {
		command: 'toggleSatusbar'
	},
	'control+shift+KeyM': {
		command: 'toggleMinimap'
	},
	'control+KeyR': {
		command: 'reloadWindow'
	},
	'control+Add': {
		command: 'zoomLevelPlus'
	},
	'control+NumpadAdd': {
		command: 'zoomLevelPlus'
	},
	'control+Equal': {
		command: 'zoomLevelPlus'
	},
	'control+Minus': {
		command: 'zoomLevelMinus'
	},
	'control+NumpadSubtract': {
		command: 'zoomLevelMinus'
	},
	'control+KeyS': {
		command: 'saveFile'
	},
	'control+KeyG': {
		command: 'gotoLine'
	},
	'control+KeyP': {
		command: 'openCmdPanel'
	},
	'control+L': {
		command: 'toggleSidebar'
	},
	'control+Backquote': {
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