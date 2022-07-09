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
			let nowFileItem = globalData.nowFileItem;
			let tab = {};
			let name = '';
			if (!dirPath && nowFileItem) {
				dirPath = nowFileItem.rootPath;
			}
			dirPath = dirPath
				|| window.process.env.HOME
				|| window.process.env.HOMEPATH
				|| globalData.userPath;
			name = path.basename(dirPath);
			tab.name = name;
			tab.path = dirPath;
			tab.id = Util.getUUID();
			this.terminalList.push(tab);
			EventBus.$emit('terminal-change', tab.id);
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
	getTerminalTabById(id) {
		for (let i = 0; i < this.terminalList.length; i++) {
			if (id === this.terminalList[i].id) {
				return this.terminalList[i];
			}
		}
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
	}
	closeTerminalOther(id) {
		let tab = this.getTerminalTabById(id);
		this.terminalList.empty();
		this.terminalList.push(tab);
		EventBus.$emit('terminal-change', tab.id);
	}
	loadTerminal(list) {
		list.forEach((item) => {
			this.terminalList.push(item);
		});
	}
}
