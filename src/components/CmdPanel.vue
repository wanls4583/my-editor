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
				<Menu :checkable="checkable" :hover-check="hoverCheck" :menuList="cmdList" :value="value" @change="onChange" spellcheck="false" style="position: relative"></Menu>
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
				this.onCancel();
			});
			EventBus.$on('cmd-menu-open', (data) => {
				this.visible = true;
				this.isCmdSearch = false;
				this.searchText = data.input || '';
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
				this.searchText = data.input || '';
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
				let editor = globalData.nowEditorId && globalData.$mainWin.getNowEditor();
				if (editor) {
					this.cmdList = [{ name: `Current Line：${editor.cursor.nowCursorPos.line}，Type a Line number between 1 and ${editor.maxLine} to navigate to` }];
					this.goToLine();
				} else {
					this.cmdList = [{ name: 'Open a Editor first to go to a line' }];
				}
			} else {
				this.searchFile();
			}
		},
		searchFile() {
			let results = [];
			let searchText = this.searchText;
			let timestamp = Date.now();

			clearTimeout(this.searchFileTimer);
			this.searchFileTimer = setTimeout(() => {
				_search.call(this, globalData.fileTree.slice());
			}, 500);

			function _search(list) {
				if (list.length) {
					_readdir(list.shift()).then((children) => {
						children.forEach((item) => {
							if (item.type === 'file') {
								_match(item);
							} else if (!globalData.skipSearchDirs.test(item.path)) {
								list.push(item);
							}
						});
						if (Date.now() - timestamp >= 2) {
							this.cmdList = results;
							this.searchFileTimer = setTimeout(() => {
								_search.call(this, list);
							}, 0);
						} else {
							_search.call(this, list);
						}
					});
				} else {
					this.cmdList = results;
				}
			}

			function _readdir(item) {
				if (item.loaded) {
					return Promise.resolve(item.children);
				} else {
					return globalData.$fileTree.readdir(item);
				}
			}

			function _match(item) {
				if (searchText) {
					let m = Util.fuzzyMatch(item.name, searchText, true);
					if (m) {
						results.push({
							name: item.name,
							desc: item.path,
						});
					}
				} else {
					results.push({
						name: item.name,
						desc: item.path,
					});
				}
			}
		},
		goToLine() {
			let editor = globalData.nowEditorId && globalData.$mainWin.getNowEditor();
			if (editor) {
				let line = parseInt(this.searchText.slice(1));
				if (line > 0 && line <= editor.maxLine) {
					this.nowCursorPos = this.nowCursorPos || editor.nowCursorPos;
					this.scrollTop = this.scrollTop || editor.scrollTop;
					this.scrollLeft = this.scrollLeft || editor.scrollLeft;
					editor.scrollToLine(line);
					if (this.preCursorPos) {
						this.preCursorPos = editor.cursor.updateCursorPos(this.preCursorPos, line, 0);
					} else {
						this.preCursorPos = editor.cursor.addCursorPos({
							line: line,
							column: 0,
						});
					}
				}
			}
		},
		onEnter() {
			if (this.isCmdSearch) {
				if (this.searchText.startsWith(':')) {
					let editor = globalData.nowEditorId && globalData.$mainWin.getNowEditor();
					let line = parseInt(this.searchText.slice(1));
					if (editor && line && this.preCursorPos && this.preCursorPos.line === line) {
						editor.searcher.clearSearch();
						editor.cursor.setCursorPos(this.preCursorPos);
						editor.focus();
						this.visible = false;
					}
				}
			}
		},
		onCancel() {
			if (this.nowCursorPos) {
				let editor = globalData.nowEditorId && globalData.$mainWin.getNowEditor();
				if (editor) {
					editor.setStartLine(this.scrollTop);
					editor.scrollLeft = this.scrollLeft;
					editor.cursor.removeCursor(this.preCursorPos);
					editor.cursor.addCursorPos(this.nowCursorPos);
					editor.focus();
				}
				this.preCursorPos = null;
				this.nowCursorPos = null;
				this.scrollTop = 0;
				this.scrollLeft = 0;
			}
			clearTimeout(this.searchFileTimer);
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