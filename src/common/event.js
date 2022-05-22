import EventBus from '@/event';
import globalData from '../data/globalData';

const remote = window.require('@electron/remote');
const path = window.require('path');

export default class {
	constructor() {
		this.terminalList = globalData.terminalList;
		this.terminalId = 1;
		this.nowTerminalId = 0;
	}
	init() {
		EventBus.$on('reveal-in-file-explorer', path => {
			if (path) {
				remote.shell.showItemInFolder(path);
			}
		});
		EventBus.$on('terminal-new', () => {
			let nowFileItem = globalData.nowFileItem;
			let tab = {};
			let name = '';
			var dirPath = window.process.env.HOME;
			if (nowFileItem) {
				if (nowFileItem.type === 'file') {
					dirPath = path.basename(nowFileItem.path);
				} else {
					dirPath = nowFileItem.path;
				}
			}
			name = path.basename(dirPath);
			tab.name = name;
			tab.path = dirPath;
			tab.id = this.terminalId++;
			this.terminalList.push(tab);
			EventBus.$emit('terminal-change', tab.id);
		});
		EventBus.$on('terminal-close', id => {
			this.closeTerminal(id);
		});
		EventBus.$on('terminal-change', id => {
			this.changeTerminalTab(id);
		});
	}
	changeTerminalTab(id) {
		this.terminalList.forEach(item => {
			item.active = item.id === id;
		});
		this.terminalList.splice();
	}
	closeTerminal(id) {
		for (let i = 0; i < this.terminalList.length; i++) {
			if (id === this.terminalList[i].id) {
				let tab = null;
				this.terminalList.splice(i, 1);
				tab = this.terminalList[i] || this.terminalList[i - 1];
				if (tab) {
					this.changeTerminalTab(tab.id);
				}
				break;
			}
		}
	}
}
