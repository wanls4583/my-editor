<!--
 * @Author: lisong
 * @Date: 2021-12-24 11:00:11
 * @Description: 
-->
<template>
	<div @mousedown.stop class="my-cmd-panel my-list" v-if="visible">
		<div>
			<div class="my-cmd-search">
				<input @keydown.enter="onEnter" @keydown.esc="onCancel" ref="input" type="text" v-model="searchText" />
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
import Context from '@/module/context/index';

const contexts = Context.contexts;

export default {
	name: 'CmdPanel',
	components: {
		Menu,
	},
	data() {
		return {
			searchText: '',
			value: '',
			cmdList: [],
			visible: false,
			checkable: false,
			hoverCheck: false,
		};
	},
	watch: {
		searchText() {
			if (this.isCmdSearch) {
				this.searchCmd();
			} else {
				this.searchMenu();
			}
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
				this.isCmdSearch = false;
				this.searchText = data.searchText || '';
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
			EventBus.$on('cmd-search-open', (data) => {
				data = data || {};
				this.visible = true;
				this.isCmdSearch = true;
				this.checkable = true;
				this.hoverCheck = true;
				this.searchText = data.searchText || '';
				this.cmdList = [];
				this.searchCmd();
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
		searchCmd() {
			this.cmdList = [];
			if (this.searchText.startsWith(':')) {
				if (globalData.nowEditorId) {
					let editor = globalData.$mainWin.getNowEditor();
					this.cmdList = [{ name: `Current Line：${editor.cursor.nowCursorPos.line}，Type a Line number between 1 and ${editor.maxLine} to navigate to` }];
				} else {
					this.cmdList = [{ name: 'Open a Editor first to go to a line' }];
				}
			}
		},
		onEnter() {
			if (this.isCmdSearch && this.searchText.startsWith(':')) {
				let line = parseInt(this.searchText.slice(1));
				line = line < 0 ? 0 : line;
				if (globalData.nowEditorId) {
					let editor = globalData.$mainWin.getNowEditor();
					line = line > editor.maxLine ? editor.maxLine : line;
					editor.cursor.setCursorPos({
						line: line,
						column: 0,
					});
					editor.focus();
				}
				this.visible = false;
			}
		},
		onCancel() {
			this.visible = false;
		},
		onChange(item) {
			switch (item.op) {
				case 'changeTheme':
					this.theme.loadTheme(item);
					this.visible = false;
					break;
				case 'changeIconTheme':
					this.theme.loadIconTheme(item);
					this.visible = false;
					break;
				case 'selectLanguage':
					EventBus.$emit('language-change', { id: globalData.nowEditorId, language: item.value });
					this.visible = false;
					break;
				case 'changeTabSize':
					EventBus.$emit('tab-size-change', item.value);
					this.visible = false;
					break;
				case 'changeIndent':
					EventBus.$emit('indent-change', item.value);
					this.visible = false;
					break;
				case 'convertTabToSpace':
					EventBus.$emit('convert-to-space', item.value);
					this.visible = false;
					break;
				case 'convertSpaceToTab':
					EventBus.$emit('convert-to-tab', item.value);
					this.visible = false;
					break;
			}
		},
	},
};
</script>