import EventBus from '@/event';
import globalData from '@/data/globalData';
import Util from '@/common/util';

export default class {
	constructor() {
		this.editorList = globalData.editorList;
		this.init();
	}
	init() {
		EventBus.$on('icon-changed', () => {
			this.changeFileIcon();
		});
		EventBus.$on('theme-changed', () => {
			this.changeFileIcon();
		});
		EventBus.$on('cmd-menu-theme-open', () => {
			const cmdList = globalData.themes.map(item => {
				return item.map(item => {
					item = Object.assign({ op: 'changeTheme' }, item);
					item.active = item.value === globalData.nowTheme.value;
					item.selected = item.active;
					return item;
				});
			});
			EventBus.$emit('cmd-menu-open', {
				cmdList: cmdList
			});
		});
		EventBus.$on('cmd-menu-icon-theme-open', () => {
			const cmdList = globalData.iconThemes.map(item => {
				item = Object.assign({ op: 'changeIconTheme' }, item);
				item.active = item.value === globalData.nowIconTheme.value;
				item.selected = item.active;
				return item;
			});
			cmdList.push({
				name: 'None',
				value: 'none',
				op: 'changeIconTheme',
				active: 'none' === globalData.nowIconTheme.value,
				selected: 'none' === globalData.nowIconTheme.value
			});
			EventBus.$emit('cmd-menu-open', {
				cmdList: cmdList
			});
		});
	}
	changeFileIcon() {
		this.editorList.forEach(item => {
			if (globalData.nowIconTheme.value) {
				let icon = Util.getIconByPath({
					filePath: item.path,
					fileType: 'file'
				});
				item.icon = icon ? `my-file-icon my-file-icon-${icon}` : '';
			} else {
				item.icon = '';
			}
		});
		this.editorList.splice();
	}
}
