<!--
 * @Author: lisong
 * @Date: 2021-12-24 11:00:11
 * @Description: 
-->
<template>
	<div @mousedown.stop class="my-cmd-panel my-list" v-if="visible">
		<div>
			<div class="my-cmd-search">
				<input @keydown.enter="onEnter" @keydown.esc="onCancel" ref="input" spellcheck="false" type="text" v-model="searchText" />
			</div>
			<div>
				<Menu :checkable="checkable" :hover-check="hoverCheck" :menuList="cmdList" :top="scrollTop" @change="onChange" @scroll="onScroll" ref="menu" style="position: relative"></Menu>
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

const path = window.require('path');
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
			scrollTop: 0,
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
				this.hoverCheck = false;
				this.searchText = data.input || '';
				this.cmdList = [];
				this.searchCmd(1);
				requestAnimationFrame(() => {
					this.$refs.input.focus();
				});
			});
		},
		searchMenu() {
			this.scrollTop = 0;
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
			this.scrollTop = 0;
			if (this.searchText.startsWith(':')) {
				let editor = globalData.nowEditorId && globalData.$mainWin.getNowEditor();
				if (editor) {
					this.cmdList = [{ name: `Current Line：${editor.nowCursorPos.line}，Type a Line number between 1 and ${editor.maxLine} to navigate to` }];
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
			let timestamp = Date.now();
			let searchId = Util.getUUID();
			let searchText = _reverseString(this.searchText.replace(/[\\\/]/g, path.sep));
			this.searchId = searchId;

			clearTimeout(this.searchFileTimer);
			this.searchFileTimer = null;
			globalData.scheduler.removeTask(this.searchFileTask);
			_search.call(this, globalData.fileTree.slice());

			function _search(list) {
				if (list.length) {
					let item = list.shift();
					if (item.loaded) {
						_checkFile.call(this, item.children, list);
					} else {
						globalData.$fileTree.readdir(item).then(() => {
							_checkFile.call(this, item.children, list);
						});
					}
				} else {
					clearTimeout(this.searchFileTimer);
					this.$nextTick(() => {
						this.$refs.menu.setMenuList(_sort(results));
					});
				}
				if (!this.searchFileTimer) {
					this.searchFileTimer = setTimeout(
						() => {
							this.$refs.menu.setMenuList(_sort(results));
							this.searchFileTimer = null;
						},
						results.length ? 60 : 0
					);
				}
			}

			function _checkFile(children, list) {
				if (searchId !== this.searchId) {
					return;
				}
				children.forEach((item) => {
					if (item.type === 'file') {
						_match(item);
					} else if (!globalData.skipSearchDirs.test(item.path)) {
						list.push(item);
					}
				});
				this.searchFileTask = globalData.scheduler.addTask(() => {
					_search.call(this, list);
				});
			}

			function _match(item) {
				let icon = Util.getIconByPath({ filePath: item.path, fileType: 'file' });
				icon = icon ? `my-file-icon my-file-icon-${icon}` : '';
				if (searchText) {
					let m = Util.fuzzyMatch(searchText, _reverseString(item.path), true);
					if (m) {
						let nameIndexs = [];
						let descIndexs = [];
						m.indexs.forEach((index) => {
							descIndexs.push(item.path.length - 1 - index);
							if (item.name.length - 1 - index >= 0) {
								nameIndexs.push(item.name.length - 1 - index);
							}
						});
						nameIndexs.reverse();
						descIndexs.reverse();
						results.push({
							name: item.name,
							desc: item.path,
							op: 'openFile',
							item: item,
							score: m.score,
							descIndexs,
							nameIndexs,
							icon,
						});
					}
				} else {
					results.push({
						name: item.name,
						desc: item.path,
						item: item,
						op: 'openFile',
						score: 0,
						icon,
					});
				}
			}

			function _reverseString(str) {
				return str.split('').reduce((reversed, character) => character + reversed, '');
			}

			function _sort(results) {
				return results.sort((a, b) => {
					return b.score - a.score;
				});
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
			globalData.scheduler.removeTask(this.searchFileTask);
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
				case 'openFile':
					EventBus.$emit('file-open', item.item);
					this.onCancel();
					break;
			}
		},
		onScroll(e) {
			this.scrollTop = e;
		},
	},
};
</script>