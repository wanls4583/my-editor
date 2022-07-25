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
		command: 'saveFileAs',
		when: 'editorFocus'
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
	'Ctrl+Shift+W': {
		command: 'saveWorkspaceAs'
	},
	'Ctrl+W': {
		command: 'openWorkspace'
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
	'Ctrl+N': {
		command: 'newFile'
	},
	'Ctrl+O': {
		command: 'openFile'
	},
	'Ctrl+S': {
		command: 'saveFile',
		when: 'editorFocus'
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
	'Ctrl+K Ctrl+T': {
		command: 'changeTheme'
	},
	'Ctrl+K Ctrl+I': {
		command: 'changeIconTheme'
	},
	'Ctrl+K Ctrl+O': {
		command: 'openFolder'
	},
	'Ctrl+K Ctrl+S': {
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
	findInFiles() {
		EventBus.$emit('find-in-folder');
	}
	replaceInFiles() {
		EventBus.$emit('find-in-folder', { replace: true });
	}
	saveWorkspaceAs() {
		EventBus.$emit('workspace-save-as');
	}
	openWorkspace() {
		EventBus.$emit('workspace-open');
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
	newFile() {
		EventBus.$emit('file-open');
	}
	openFile() {
		EventBus.$emit('file-open', null, true);
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
	toggleSidebar() {
		EventBus.$emit('sidebar-toggle');
	}
	toggleTerminal() {
		EventBus.$emit('terminal-toggle');
	}
	changeTheme() {
		EventBus.$emit('cmd-menu-theme-open');
	}
	changeIconTheme() {
		EventBus.$emit('cmd-menu-icon-theme-open');
	}
	openFolder() {
		EventBus.$emit('folder-open');
	}
	openShortcut() {
		EventBus.$emit('shortcut-open');
	}
	openDevTools() {
		remote.getCurrentWindow().openDevTools();
	}
}