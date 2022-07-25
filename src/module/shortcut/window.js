/*
 * @Author: lisong
 * @Date: 2022-02-18 16:13:15
 * @Description:
 */
import EventBus from '@/event';
import globalData from '@/data/globalData';

const remote = window.require('@electron/remote');

export const windowKeyMap = {
	'Ctrl+Shift+S': {
		command: 'saveFileAs'
	},
	'Ctrl+Shift+B': {
		command: 'toggleStatusbar'
	},
	'Ctrl+Shift+M': {
		command: 'toggleMinimap'
	},
	'Ctrl+Shift+F': {
		command: 'findInFiles'
	},
	'Ctrl+Shift+H': {
		command: 'replaceInFiles'
	},
	'Ctrl+R': {
		command: 'reloadWindow'
	},
	'Ctrl+=': {
		command: 'zoomLevelPlus'
	},
	'Ctrl+Add': {
		command: 'zoomLevelPlus'
	},
	'Ctrl+NumAdd': {
		command: 'zoomLevelPlus'
	},
	'Ctrl+-': {
		command: 'zoomLevelMinus'
	},
	'Ctrl+Num-': {
		command: 'zoomLevelMinus'
	},
	'Ctrl+S': {
		command: 'saveFile'
	},
	'Ctrl+G': {
		command: 'gotoLine'
	},
	'Ctrl+P': {
		command: 'openCmdPanel'
	},
	'Ctrl+L': {
		command: 'toggleSidebar'
	},
	'Ctrl+`': {
		command: 'toggleTerminal'
	},
	'Ctrl+K S': {
		command: 'openShortcut'
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
	toggleStatusbar() {
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
	openShortcut() {
		EventBus.$emit('shortcut-open');
	}
}