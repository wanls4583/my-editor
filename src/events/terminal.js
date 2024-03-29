import EventBus from '@/event';
import Util from '@/common/util';
import globalData from '@/data/globalData';

const path = window.require('path');

export default class {
	constructor() {
		this.terminalList = globalData.terminalList;
		this.terminalId = 1;
		this.init();
	}
	init() {
		EventBus.$on('terminal-new', dirPath => {
			if (dirPath) {
				this.addTerminal(dirPath);
			} else if (globalData.fileTree.length) {
				this.selectTermialCwd();
			} else {
				this.addTerminal(globalData.homePath);
			}
		});
		EventBus.$on('terminal-cwd', dirPath => {
			this.addTerminal(dirPath);
		});
		EventBus.$on('terminal-close', id => {
			this.closeTerminal(id);
		});
		EventBus.$on('terminal-change', id => {
			this.changeTerminalTab(id);
		});
		EventBus.$on('terminal-close-to-left', id => {
			this.closeTerminalToLeft(id);
		});
		EventBus.$on('terminal-close-to-right', id => {
			this.closeTerminalToRight(id);
		});
		EventBus.$on('terminal-close-other', id => {
			this.closeTerminalOther(id);
		});
		EventBus.$on('terminal-close-all', id => {
			this.terminalList.empty();
			if (globalData.views.terminal) {
				EventBus.$emit('terminal-toggle');
			}
		});
		EventBus.$on('terminal-loaded', list => {
			this.loadTerminal(list);
		});
		EventBus.$on('terminal-title-change', ({ id, title }) => {
			let tab = this.getTerminalTabById(id);
			tab.title = title;
			this.terminalList.splice();
		});
	}
	addTerminal(dirPath) {
		let tab = {};
		let name = path.basename(dirPath);
		tab.name = name;
		tab.path = dirPath;
		tab.id = Util.getUUID();
		this.terminalList.push(tab);
		EventBus.$emit('terminal-change', tab.id);
		if (!globalData.views.terminal) {
			EventBus.$emit('terminal-toggle');
		}
	}
	changeTerminalTab(id) {
		this.terminalList.forEach(item => {
			item.active = item.id === id;
		});
		this.terminalList.splice();
		globalData.nowTerminalId = id;
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
		if (id === globalData.nowTerminalId) {
			globalData.nowTerminalId = null;
		}
		if (this.terminalList.length === 0 && globalData.views.terminal) {
			EventBus.$emit('terminal-toggle');
		}
	}
	closeTerminalToLeft(id) {
		for (let i = 0; i < this.terminalList.length; i++) {
			if (id != this.terminalList[i].id) {
				this.terminalList.splice(i, 1);
				i--;
			} else {
				break;
			}
		}
		this.changeTerminalTab(id);
	}
	closeTerminalToRight(id) {
		for (let i = this.terminalList.length - 1; i >= 0; i--) {
			let tab = this.terminalList[i];
			if (tab && id != tab.id) {
				this.terminalList.splice(i, 1);
			} else {
				break;
			}
		}
		this.changeTerminalTab(id);
	}
	closeTerminalOther(id) {
		let tab = this.getTerminalTabById(id);
		this.terminalList.empty();
		this.terminalList.push(tab);
		this.changeTerminalTab(id);
	}
	loadTerminal(list) {
		list.forEach((item) => {
			if (item && item.id && item.path) {
				if (item.active) {
					globalData.nowTerminalId = item.id;
				}
				this.terminalList.push(item);
			}
		});
	}
	selectTermialCwd() {
		let nowFileItem = globalData.nowFileItem || {};
		let cmdList = globalData.fileTree.map(item => {
			return {
				name: item.name,
				desc: item.path,
				value: item.path,
				op: 'selectTermialCwd',
				active: nowFileItem.rootPath === item.path
			}
		});
		EventBus.$emit('cmd-menu-open', {
			cmdList: cmdList,
		});
	}
	getTerminalTabById(id) {
		for (let i = 0; i < this.terminalList.length; i++) {
			if (id === this.terminalList[i].id) {
				return this.terminalList[i];
			}
		}
	}
}
