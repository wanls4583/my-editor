<!--
 * @Author: lisong
 * @Date: 2021-12-24 11:00:11
 * @Description: 
-->
<template>
	<div @mousedown.stop class="my-cmd-panel my-list" v-if="visible">
		<div>
			<div class="my-cmd-search">
				<input ref="input" type="text" v-model="searchText" />
			</div>
			<div>
				<Menu :checkable="checkable" :hover-check="hoverCheck" :menuList="cmdList" :value="value" @change="onChange" class="my-scroll-overlay my-scroll-mini" spellcheck="false" style="position: relative"></Menu>
			</div>
		</div>
	</div>
</template>
<script>
import Util from '@/common/util';
import Theme from '@/module/theme';
import Menu from './Menu';
import EventBus from '@/event';
import globalData from '@/data/globalData';

export default {
	name: 'CmdPanel',
	components: {
		Menu,
	},
	data() {
		return {
			searchText: '',
			cmdList: [],
			visible: false,
			checkable: false,
			hoverCheck: false,
		};
	},
	watch: {
		searchText() {
			this.searchMenu();
		},
	},
	created() {
		this.theme = new Theme();
		this.initEventBus();
	},
	methods: {
		initEventBus() {
			EventBus.$on('close-menu', () => {
				this.visible = false;
			});
			EventBus.$on('cmd-menu-open', (data) => {
				this.visible = true;
				this.searchText = '';
				this.originCmdList = data.cmdList;
				this.checkable = data.checkable === undefined ? true : data.checkable;
				this.hoverCheck = data.hoverCheck === undefined ? false : data.hoverCheck;
				this.value = data.value;
				if (this.originCmdList[0] && !(this.originCmdList[0] instanceof Array)) {
					this.originCmdList = [this.originCmdList];
				}
				this.searchMenu();
				requestAnimationFrame(() => {
					this.$refs.input.focus();
				});
			});
		},
		searchMenu() {
			if (this.searchText) {
				let menu = [];
				this.originCmdList[0].forEach((item) => {
					let result = Util.fuzzyMatch(this.searchText, item.name, true);
					if (result) {
						menu.push([item, result]);
					}
				});
				menu = menu
					.sort((a, b) => {
						return b[1].score - a[1].score;
					})
					.map((item) => {
						return item[0];
					});
				this.cmdList = [menu];
			} else {
				this.cmdList = this.originCmdList.slice();
			}
		},
		onChange(item) {
			switch (item.op) {
				case 'changeTheme':
					this.theme.loadTheme(item);
					break;
				case 'changeIconTheme':
					this.theme.loadIconTheme(item);
					break;
				case 'selectLanguage':
					EventBus.$emit('language-change', { id: globalData.nowEditorId, language: item.value });
					break;
				case 'changeTabSize':
					EventBus.$emit('tab-size-change', item.value);
					break;
				case 'changeIndent':
					EventBus.$emit('indent-change', item.value);
					break;
			}
			this.visible = false;
		},
	},
};
</script>