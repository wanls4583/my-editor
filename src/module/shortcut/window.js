/*
 * @Author: lisong
 * @Date: 2022-02-18 16:13:15
 * @Description:
 */
import EventBus from '@/event';
import globalData from '@/data/globalData';

const remote = window.require('@electron/remote');

export const windowComands = [
	{
		name: 'Save As',
		key: 'Ctrl+Shift+S',
		command: 'saveFileAs',
		when: 'editorFocus'
	},
	{
		name: 'Statusbar',
		label: 'Toggle Statusbar',
		key: 'Ctrl+Shift+B',
		command: 'toggleStatusbar'
	},
	{
		name: 'Minimap',
		label: 'Toggle Minimap',
		key: 'Ctrl+Shift+M',
		command: 'toggleMinimap'
	},
	{
		name: 'Find in Files',
		key: 'Ctrl+Shift+F',
		command: 'findInFiles'
	},
	{
		name: 'Replace in Files',
		key: 'Ctrl+Shift+H',
		command: 'replaceInFiles'
	},
	{
		name: 'Save Workspace As',
		key: 'Ctrl+Shift+W',
		command: 'saveWorkspaceAs'
	},
	{
		name: 'OpenWorkspace',
		key: 'Ctrl+W',
		command: 'openWorkspace'
	},
	{
		name: 'Reload',
		key: 'Ctrl+R',
		command: 'reloadWindow'
	},
	{
		name: 'Zoom In',
		key: 'Ctrl+=',
		command: 'zoomLevelPlus'
	},
	{
		name: 'Zoom In',
		key: 'Ctrl+Add',
		command: 'zoomLevelPlus'
	},
	{
		name: 'Zoom In',
		key: 'Ctrl+NumAdd',
		command: 'zoomLevelPlus'
	},
	{
		name: 'Zoom Out',
		key: 'Ctrl+-',
		command: 'zoomLevelMinus'
	},
	{
		name: 'Zoom Out',
		key: 'Ctrl+Num-',
		command: 'zoomLevelMinus'
	},
	{
		name: 'New File',
		label: 'Add Untitled Editor',
		key: 'Ctrl+N',
		command: 'newFile'
	},
	{
		name: 'Open File',
		key: 'Ctrl+O',
		command: 'openFile'
	},
	{
		name: 'Save',
		key: 'Ctrl+S',
		command: 'saveFile',
		when: 'editorFocus'
	},
	{
		name: 'Go to Line',
		key: 'Ctrl+G',
		command: 'gotoLine'
	},
	{
		name: 'Command Palette',
		key: 'Ctrl+P',
		command: 'openCmdPanel'
	},
	{
		name: 'Sidebar',
		label: 'Toggle Sidebar',
		key: 'Ctrl+L',
		command: 'toggleSidebar'
	},
	{
		name: 'Terminal',
		label: 'Toggle Terminal',
		key: 'Ctrl+`',
		command: 'toggleTerminal'
	},
	{
		name: 'Color Theme',
		key: 'Ctrl+K Ctrl+T',
		command: 'changeTheme'
	},
	{
		name: 'Icon Theme',
		key: 'Ctrl+K Ctrl+I',
		command: 'changeIconTheme'
	},
	{
		name: 'Open Folder',
		key: 'Ctrl+K Ctrl+O',
		command: 'openFolder'
	},
	{
		name: 'Keyboard Shortcuts',
		key: 'Ctrl+K Ctrl+S',
		command: 'openShortcut'
	},
	{
		name: 'Add Folder to Workspace',
		key: 'Ctrl+K Ctrl+O',
		command: 'addFolder'
	},
	{
		name: `Switch ${globalData.multiKeyCode === 'alt' ? 'Ctrl' : 'Alt'}+Click to Multi-Cursor`,
		key: '',
		command: 'switchMultiKeyCode',
		keyCode: 'ctrl',
	},
	{
		name: 'Open DevTools',
		key: 'F12',
		command: 'openDevTools'
	}
	,
	{
		name: 'Exit',
		key: '',
		command: 'exit'
	}
]

export class WindowCommand {
	constructor() { }
	execComand(command) {
		if (this[command.command]) {
			this[command.command](command);
		}
	}
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
	addFolder() {
		EventBus.$emit('folder-add');
	}
	openDevTools() {
		remote.getCurrentWindow().openDevTools();
	}
	switchMultiKeyCode(command) {
		globalData.multiKeyCode = globalData.multiKeyCode === 'ctrl' ? 'alt' : 'ctrl';
		command.keyCode = globalData.multiKeyCode;
		command.name = `Switch ${command.keyCode === 'alt' ? 'Ctrl' : 'Alt'}+Click to Multi-Cursor`;
		EventBus.$emit('shortcut-refresh');
		EventBus.$emit('multiKeyCode-change');
	}
	exit() {
		remote.getCurrentWindow().close();
	}
}