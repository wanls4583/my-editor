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
					return Object.assign({ op: 'changeTheme' }, item);
				});
			});
			EventBus.$emit('cmd-menu-open', {
				cmdList: cmdList,
				value: globalData.nowTheme.value,
			});
		});
		EventBus.$on('cmd-menu-icon-theme-open', () => {
			const cmdList = globalData.iconThemes.map(item => {
				return Object.assign({ op: 'changeIconTheme' }, item);
			});
			cmdList.push({
				name: 'None',
				value: 'none',
				op: 'changeIconTheme',
			});
			EventBus.$emit('cmd-menu-open', {
				cmdList: cmdList,
				value: globalData.nowIconTheme.value,
			});
		});
	}
	changeFileIcon() {
		this.editorList.forEach(item => {
			if (globalData.nowIconTheme.value) {
				let icon = Util.getIconByPath({
					iconData: globalData.nowIconData,
					filePath: item.path,
					fileType: 'file',
					themeType: globalData.nowTheme.type,
				});
				item.icon = icon ? `my-file-icon my-file-icon-${icon}` : '';
			} else {
				item.icon = '';
			}
		});
		this.editorList.splice();
	}
}
