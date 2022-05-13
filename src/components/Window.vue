<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
	<div
		:class="{ 'my-theme-dark': themeType === 'dark', 'my-theme-light': themeType === 'light' }"
		:style="{ 'padding-top': _topBarHeight, 'padding-bottom': _statusHeight }"
		@contextmenu.prevent.stop
		@mousedown="onWindMouseDown"
		class="my-window"
		ref="window"
	>
		<div :style="{ width: leftWidth + 'px' }" class="my-left-warp" v-if="mode === 'app'">
			<!-- 侧边栏 -->
			<activity-bar ref="activityBar"></activity-bar>
			<div style="width: 100%; flex-grow: 1">
				<side-bar ref="sideBar" v-show="activity === 'files'"></side-bar>
				<file-content-search v-show="activity === 'search'"></file-content-search>
			</div>
			<div @mousedown="onLeftSashBegin" class="my-sash-v"></div>
		</div>
		<div class="my-right-wrap" ref="rightWrap">
			<!-- tab栏 -->
			<editor-bar
				:editorList="editorList"
				@change="onChangeTab"
				@close="onCloseTab"
				@close-all="onCloseAll"
				@close-saved="onCloseSaved"
				@close-to-left="onCloseToLeft"
				@close-to-right="onCloseToRight"
				v-show="editorList.length"
			></editor-bar>
			<!-- 编辑区 -->
			<template v-for="item in editorList">
				<editor :active="item.active" :id="item.id" :key="item.id" :path="item.path" :ref="'editor' + item.id" @change="onFileChange(item.id)" @save="onSaveFile(item.id)" v-show="item.active"></editor>
			</template>
            <div @mousedown="onTerminalSashBegin" class="my-sash-h"></div>
			<div :style="{height: terminalHeight+'px'}" class="my-terminal-wrap">
				<div class="my-terminal"></div>
			</div>
		</div>
		<!-- 顶部菜单栏 -->
		<title-bar :height="topBarHeight" @change="onMenuChange" ref="titleBar"></title-bar>
		<!-- 状态栏 -->
		<status-bar :height="statusHeight" :languageList="languageList" @select-langeuage="onSelectLanguage" ref="statusBar"></status-bar>
		<cmd-panel></cmd-panel>
		<Dialog :btns="dialogBtns" :content="dialogContent" :icon="this.dialogIcon" :icon-color="this.dialogIconColor" :overlay="true" :title="dialogTilte" @close="onDialogClose" v-show="dialogVisible"></Dialog>
	</div>
</template>
<script>
import EditorBar from './EditorBar.vue';
import Editor from './Editor.vue';
import TitleBar from './TitleBar';
import StatusBar from './StatusBar';
import SideBar from './SideBar.vue';
import ActivityBar from './ActivityBar.vue';
import FileContentSearch from './FileContentSearch.vue';
import Dialog from './Dialog.vue';
import CmdPanel from './CmdPanel.vue';
import Context from '@/module/context/index';
import Theme from '@/module/theme';
import EventBus from '@/event';
import Util from '@/common/util';
import CommonEvent from '@/common/event';
import $ from 'jquery';
import globalData from '@/data/globalData';

const fs = window.require('fs');
const path = window.require('path');
const remote = window.require('@electron/remote');
const contexts = Context.contexts;

export default {
	components: {
		Editor,
		EditorBar,
		TitleBar,
		StatusBar,
		ActivityBar,
		FileContentSearch,
		SideBar,
		Dialog,
		CmdPanel,
	},
	data() {
		return {
			extensionsPath: path.join(globalData.dirname, 'main/extensions'),
			languageList: [],
			statusHeight: 30,
			topBarHeight: 35,
			nowId: null,
			idCount: 1,
			titleCount: 1,
			editorList: [],
			dialogTilte: '',
			dialogContent: '',
			dialogVisible: false,
			dialogBtns: [],
			dialogIcon: '',
			dialogIconColor: '',
			themeType: 'dark',
			activity: 'files',
			leftWidth: 400,
			terminalHeight: 260,
			mode: remote ? 'app' : 'mode',
		};
	},
	computed: {
		_topBarHeight() {
			return this.topBarHeight + 'px';
		},
		_statusHeight() {
			return this.statusHeight + 'px';
		},
	},
	provide() {
		return {
			getNowEditor: () => {
				return this.getNowEditor();
			},
			getNowContext: () => {
				return this.getNowContext();
			},
			openFile: (fileObj, choseFile) => {
				this.openFile(fileObj, choseFile);
			},
			openFolder: () => {
				this.openFolder();
			},
		};
	},
	created() {
		window.globalData = globalData;
		if (this.mode === 'app') {
			const currentWindow = remote.getCurrentWindow();
			currentWindow.on('blur', () => {
				EventBus.$emit('close-menu');
			});
		}
		this.commonEvent = new CommonEvent();
		this.commonEvent.init();
		this.initEvent();
		this.initEventBus();
	},
	mounted() {
		window.test = this;
		const theme = new Theme();
		theme.loadTheme(globalData.nowTheme);
		this.openFile();
		this.loadExtensions().then((result) => {
			let langeuages = result.languages;
			let themes = result.themes;
			let iconThemes = result.iconThemes;
			let scopeFileList = result.scopeFileList;
			langeuages.push({ name: 'Plain Text', value: '', checked: true });
			globalData.languageList = langeuages.slice();
			globalData.scopeFileList = scopeFileList.slice();
			globalData.themes = themes.slice();
			globalData.iconThemes = iconThemes.slice();
			this.languageList = langeuages;
			this.checkLanguage();
			// loadIconTheme需要用到globalData.languageList
			theme.loadIconTheme(globalData.nowIconTheme);
		});
	},
	methods: {
		initEvent() {
			$(document)
				.on('mousemove', (e) => {
					if (this.leftSashMouseObj) {
						let width = (this.leftWidth += e.clientX - this.leftSashMouseObj.clientX);
						width = width > 50 ? width : 50;
						this.leftWidth = width;
						this.leftSashMouseObj = e;
					}
					if (this.terminaSashMouseObj) {
						let width = (this.terminalHeight -= e.clientY - this.terminaSashMouseObj.clientY);
						width = width > 0 ? width : 0;
						this.terminalHeight = width;
						this.terminaSashMouseObj = e;
					}
				})
				.on('mouseup', (e) => {
					this.leftSashMouseObj = null;
					this.terminaSashMouseObj = null;
				});
		},
		initEventBus() {
			let iconFn = (value) => {
				this.editorList.forEach((item) => {
					if (value) {
						let icon = Util.getIconByPath(globalData.nowIconData, item.path, globalData.nowTheme.type);
						item.icon = icon ? `my-file-icon my-file-icon-${icon}` : '';
					} else {
						item.icon = '';
					}
				});
				this.editorList.splice();
			};
			EventBus.$on('icon-change', iconFn);
			EventBus.$on('theme-change', () => {
				iconFn();
				this.themeType = globalData.nowTheme.type;
			});
			EventBus.$on('activity-change', (activity) => {
				this.activity = activity;
			});
		},
		onLeftSashBegin(e) {
			this.leftSashMouseObj = e;
		},
		onTerminalSashBegin(e) {
			this.terminaSashMouseObj = e;
		},
		// 点击编辑器
		onWindMouseDown() {
			EventBus.$emit('close-menu');
		},
		onChangeTab(id) {
			let tab = this.getTabById(id);
			if (!tab.active) {
				this.editorList.forEach((item) => {
					item.active = false;
				});
				tab.active = true;
				this.nowId = id;
				this.changeStatus();
			} else {
				this.getNowEditor().focus();
			}
		},
		onCloseTab(id) {
			if (!this.nowId) {
				return;
			}
			let tab = this.getTabById(id || this.nowId);
			let index = this.editorList.indexOf(tab);
			if (!tab.saved) {
				this.showDialog({
					content: '文件尚未保存，是否先保存文件？',
					cancel: true,
					icon: 'my-icon-warn',
					iconColor: 'rgba(255,196,0)',
					btns: [
						{
							name: '保存',
							callback: () => {
								if (this.mode === 'app') {
									this.onSaveFile(id).then(() => {
										_closeTab.call(this);
										this.onDialogClose();
									});
								} else {
									_closeTab.call(this);
									this.onDialogClose();
								}
							},
						},
						{
							name: '不保存',
							callback: () => {
								_closeTab.call(this);
								this.onDialogClose();
							},
						},
					],
				});
			} else {
				_closeTab.call(this);
			}

			function _closeTab() {
				this.editorList.splice(index, 1);
				contexts[id] = null;
				if (tab.active) {
					tab.active = false;
					tab = this.editorList[index] || this.editorList[index - 1];
					if (tab) {
						this.onChangeTab(tab.id);
					} else {
						this.nowId = null;
						EventBus.$emit('tab-change', null);
					}
				} else {
					this.getNowEditor().focus();
				}
			}
		},
		onCloseAll() {
			this.editorList = this.editorList.filter((item) => {
				return !item.saved;
			});
			this.editorList.forEach((item) => {
				this.onCloseTab(item.id);
			});
			this.nowId = null;
		},
		onCloseSaved() {
			this.editorList.slice().forEach((item) => {
				if (item.saved) {
					this.onCloseTab(item.id);
				}
			});
		},
		onCloseToLeft(id) {
			let tab = null;
			id = id || this.nowId;
			while ((tab = this.editorList[0])) {
				if (tab.id !== id) {
					this.onCloseTab(tab.id);
				} else {
					break;
				}
			}
		},
		onCloseToRight(id) {
			let tab = null;
			id = id || this.nowId;
			while ((tab = this.editorList.peek())) {
				if (tab.id !== id) {
					this.onCloseTab(tab.id);
				} else {
					break;
				}
			}
		},
		onMenuChange(item) {
			let cmdList = null;
			switch (item.op) {
				case 'changeTheme':
					cmdList = globalData.themes.map((item) => {
						return item.map((item) => {
							return Object.assign({ op: 'changeTheme' }, item);
						});
					});
					EventBus.$emit('open-cmd-menu', {
						cmdList: cmdList,
						value: globalData.nowTheme.value,
					});
					break;
				case 'changeIconTheme':
					cmdList = globalData.iconThemes.map((item) => {
						return Object.assign({ op: 'changeIconTheme' }, item);
					});
					cmdList.push({
						name: 'None',
						value: 'none',
						op: 'changeIconTheme',
					});
					EventBus.$emit('open-cmd-menu', {
						cmdList: cmdList,
						value: globalData.nowIconTheme.value,
					});
					break;
			}
		},
		onSelectLanguage() {
			let cmdList = globalData.languageList.map((item) => {
				return {
					op: 'selectLanguage',
					name: item.name + (item.language ? `（${item.language}）` : ''),
					value: item.value,
				};
			});
			EventBus.$emit('open-cmd-menu', {
				cmdList: cmdList,
				value: this.nowId && this.getNowEditor().language,
			});
		},
		onFileChange(id) {
			let tab = this.getTabById(id);
			tab.saved = false;
		},
		onSaveFile(id) {
			let tab = this.getTabById(id);
			if (this.mode === 'web') {
				return Promise.resolve();
			}
			if (!tab.saved) {
				if (tab.path) {
					this.writeFile(tab.path, contexts[id].getAllText());
					tab.saved = true;
					return Promise.resolve();
				} else {
					let win = remote.getCurrentWindow();
					let options = {
						title: '请选择要保存的文件名',
						buttonLabel: '保存',
					};
					return remote.dialog.showSaveDialog(win, options).then((result) => {
						if (!result.canceled && result.filePath) {
							tab.path = result.filePath;
							tab.name = tab.path.match(/[^\\\/]+$/)[0];
							this.writeFile(tab.path, contexts[id].getAllText());
							tab.saved = true;
						} else {
							return Promise.reject();
						}
					});
				}
			}
		},
		onDialogClose() {
			this.dialogVisible = false;
		},
		openFolder() {
			this.choseFolder().then((results) => {
				if (results) {
					this.$refs.sideBar.list.empty();
					this.$refs.sideBar.list.push(...results);
					this.editorList = [];
					this.nowId = null;
				}
			});
		},
		choseFolder() {
			let win = remote.getCurrentWindow();
			let options = {
				title: '选择文件夹',
				properties: ['openDirectory', 'multiSelections'],
			};
			return remote.dialog
				.showOpenDialog(win, options)
				.then((result) => {
					let results = [];
					if (!result.canceled && result.filePaths) {
						result.filePaths.forEach((item) => {
							let obj = {
								name: item.match(/[^\\\/]+$/)[0],
								path: item,
								type: 'dir',
								active: false,
								open: false,
								children: [],
							};
							results.push(Object.assign({}, obj));
						});
						return results;
					}
				})
				.catch((err) => {
					console.log(err);
				});
		},
		openFile(fileObj, choseFile) {
			let tab = fileObj && this.getTabByPath(fileObj.path);
			if (!tab) {
				let index = -1;
				let name = (fileObj && fileObj.name) || `Untitled${this.titleCount++}`;
				if (this.editorList.length) {
					tab = this.getTabById(this.nowId);
					index = this.editorList.indexOf(tab);
				}
				if (choseFile) {
					//从资源管理器中选择文件
					this.choseFile().then((results) => {
						if (results) {
							tab = results[0];
							this.editorList = this.editorList.slice(0, index).concat(results).concat(this.editorList.slice(index));
							_done.call(this);
						}
					});
				} else {
					tab = {
						id: this.idCount++,
						name: name,
						path: (fileObj && fileObj.path) || '',
						icon: (fileObj && fileObj.icon) || '',
						saved: true,
						active: false,
					};
					if (!tab.icon) {
						let icon = Util.getIconByPath(globalData.nowIconData, (fileObj && fileObj.path) || '', globalData.nowTheme.type);
						tab.icon = icon ? `my-file-icon my-file-icon-${icon}` : '';
					}
					this.editorList.splice(index + 1, 0, tab);
					_done.call(this);
				}
			} else {
				_done.call(this);
			}

			function _done() {
				this.$nextTick(() => {
					if (tab && tab.path && !tab.loaded) {
						fs.readFile(tab.path, { encoding: 'utf8' }, (err, data) => {
							if (err) {
								throw err;
							}
							this.getContext(tab.id).insertContent(data);
							tab.saved = true;
							tab.loaded = true;
							//点击搜索结果
							if (fileObj && fileObj.range) {
								this.getEditor(tab.id).cursor.setCursorPos(Object.assign({}, fileObj.range.start));
							}
						});
					} else if (fileObj && fileObj.range) {
						this.getEditor(tab.id).cursor.setCursorPos(Object.assign({}, fileObj.range.start));
					}
					this.onChangeTab(tab.id);
					this.checkLanguage();
				});
			}
		},
		choseFile() {
			let win = remote.getCurrentWindow();
			let options = {
				title: '选择文件',
				properties: ['openFile', 'multiSelections'],
			};
			return remote.dialog
				.showOpenDialog(win, options)
				.then((result) => {
					let results = [];
					if (!result.canceled && result.filePaths) {
						result.filePaths.forEach((item) => {
							let icon = Util.getIconByPath(globalData.nowIconData, item, globalData.nowTheme.type);
							icon = icon ? `my-file-icon my-file-icon-${icon}` : '';
							let obj = {
								id: this.idCount++,
								name: item.match(/[^\\\/]+$/)[0],
								path: item,
								icon: icon,
								saved: true,
								active: false,
							};
							results.push(Object.assign({}, obj));
						});
						return results;
					}
				})
				.catch((err) => {
					console.log(err);
				});
		},
		sortFileList() {
			this.list.sort((a, b) => {
				if (a.type === b.type) {
					if (a.name === b.name) {
						return 0;
					} else if (a.name > b.name) {
						return 1;
					} else {
						return -1;
					}
				}
				if (a.type === 'dir') {
					return -1;
				}
				return 1;
			});
		},
		showDialog(option) {
			this.dialogTilte = option.title || '';
			this.dialogContent = option.content || '';
			this.dialogBtns = option.btns;
			this.dialogVisible = true;
			this.dialogIconColor = option.iconColor || '';
			this.dialogIcon = option.icon || '';
		},
		writeFile(path, text) {
			fs.writeFileSync(path, text, { encoding: 'utf-8' });
		},
		changeStatus() {
			let changStatusId = this.changeStatus.id || 1;
			this.changeStatus.id = changStatusId;
			this.$nextTick(() => {
				if (this.changeStatus.id !== changStatusId) {
					return;
				}
				let editor = this.getNowEditor();
				let tab = this.getTabById(this.nowId);
				EventBus.$emit(`tab-change`, {
					path: tab.path,
					language: editor.language,
					tabSize: editor.tabSize,
					line: editor.nowCursorPos ? editor.nowCursorPos.line : '?',
					column: editor.nowCursorPos ? editor.nowCursorPos.column : '?',
				});
			});
		},
		// 检查当前打开的文件的语言
		checkLanguage() {
			if (this.nowId) {
				let tab = this.getTabById(this.nowId);
				let suffix = /\.[^\.]+$/.exec(tab.name);
				if (!suffix) {
					return;
				}
				for (let i = 0; i < this.languageList.length; i++) {
					let language = this.languageList[i];
					if (language.extensions && language.extensions.indexOf(suffix[0]) > -1) {
						this.$nextTick(() => {
							EventBus.$emit('language-change', language.value);
						});
						break;
					}
				}
			}
		},
		// 加载语言支持
		loadExtensions() {
			let languages = [];
			let scopeFileList = [];
			let themes = [[], [], [], []];
			let iconThemes = [];
			return new Promise((resolve) => {
				// 异步读取目录内容
				fs.readdir(this.extensionsPath, { encoding: 'utf8' }, (err, files) => {
					if (err) {
						throw err;
					}
					const promises = [];
					files.forEach((item, index) => {
						let fullPath = path.join(this.extensionsPath, item);
						let packPath = path.join(fullPath, './package.json');
						let varConfigPath = path.join(fullPath, './package.nls.json');
						if (fs.existsSync(varConfigPath)) {
							promises.push(
								_readVarFile(varConfigPath).then((varMap) => {
									return _readConfigFile(packPath, fullPath, varMap);
								})
							);
						} else if (fs.existsSync(packPath)) {
							promises.push(_readConfigFile(packPath, fullPath));
						}
					});
					Promise.all(promises).then(() => {
						themes = themes.filter((item) => {
							return item.length;
						});
						resolve({
							languages: languages,
							scopeFileList: scopeFileList,
							themes: themes,
							iconThemes: iconThemes,
						});
					});
				});
			});

			function _readVarFile(varConfigPath) {
				return Util.loadJsonFile(varConfigPath);
			}

			function _readConfigFile(packPath, fullPath, varMap) {
				return Util.loadJsonFile(packPath).then((data) => {
					let contributes = data.contributes;
					_addLanguage(contributes, fullPath, varMap);
					_addTheme(contributes, fullPath, varMap);
					_addIconTheme(contributes, fullPath, varMap);
				});
			}

			function _addLanguage(contributes, fullPath) {
				let grammars = contributes.grammars;
				let list = contributes.languages || [];
				list.map((language) => {
					for (let i = 0; i < grammars.length; i++) {
						let grammar = grammars[i];
						scopeFileList.push({
							scopeName: grammar.scopeName,
							path: path.join(fullPath, grammar.path),
							configPath: language.configuration ? path.join(fullPath, language.configuration) : '',
						});
						if (language.id === grammar.language) {
							let name = language.aliases && language.aliases[0];
							name = name || grammar.language;
							languages.push({
								name: name,
								value: grammar.language,
								language: grammar.language,
								scopeName: grammar.scopeName,
								path: path.join(fullPath, grammar.path),
								configPath: language.configuration ? path.join(fullPath, language.configuration) : '',
								extensions: language.extensions,
							});
							break;
						}
					}
				});
			}

			function _addTheme(contributes, fullPath, varMap) {
				let list = contributes.themes || [];
				list.map((theme) => {
					let type = 'light';
					let index = 0;
					let label = _getValue(theme.label, varMap);
					switch (theme.uiTheme) {
						case 'vs-dark':
							type = 'dark';
							index = 1;
							break;
						case 'hc-light':
							type = 'contrast light';
							index = 2;
							break;
						case 'hc-black':
							type = 'contrast dark';
							index = 3;
							break;
					}
					themes[index].push({
						name: theme.id || label,
						value: label || theme.id,
						type: type,
						path: path.join(fullPath, theme.path),
					});
				});
			}

			function _addIconTheme(contributes, fullPath, varMap) {
				let list = contributes.iconThemes || [];
				list.map((theme) => {
					let label = _getValue(theme.label, varMap);
					iconThemes.push({
						name: label || theme.id,
						value: theme.id || label,
						path: path.join(fullPath, theme.path),
					});
				});
			}

			function _getValue(name, varMap) {
				name = name || '';
				if (name[0] === '%' && name[name.length - 1] === '%') {
					name = varMap[name.slice(1, -1)] || name;
				}
				return name;
			}
		},
		getTabById(id) {
			for (let i = 0; i < this.editorList.length; i++) {
				if (this.editorList[i].id === id) {
					return this.editorList[i];
				}
			}
		},
		getTabByPath(path) {
			for (let i = 0; i < this.editorList.length; i++) {
				if (this.editorList[i].path === path) {
					return this.editorList[i];
				}
			}
		},
		getEditor(id) {
			let editor = this.$refs[`editor${id}`];
			return editor && editor[0];
		},
		getNowEditor() {
			return this.getEditor(this.nowId);
		},
		getContext(id) {
			return contexts[id];
		},
		getNowContext() {
			return this.getContext(this.nowId);
		},
	},
};
</script>
