<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
	<div :class="{ 'my-theme-dark': themeType === 'dark', 'my-theme-light': themeType === 'light' }" :style="{ 'padding-top': _topBarHeight, 'padding-bottom': _statusHeight }" @contextmenu.prevent.stop @mousedown="onWindMouseDown" class="my-window" ref="window">
		<div :style="{ width: leftWidth + 'px' }" class="my-left-warp" v-show="sidebarVisible">
			<!-- 侧边栏 -->
			<activity-bar ref="activityBar"></activity-bar>
			<div style="flex-grow:1">
				<side-bar ref="sideBar" v-show="activity === 'files'"></side-bar>
				<file-content-search v-show="activity === 'search'"></file-content-search>
			</div>
			<div @mousedown="onLeftSashBegin" class="my-sash-v" style="position:absolute;right:-4px"></div>
		</div>
		<div class="my-right-wrap" ref="rightWrap">
			<!-- tab栏 -->
			<editor-bar :editorList="editorList" v-show="editorList.length"></editor-bar>
			<!-- 编辑区 -->
			<div class="my-editor-groups" ref="editorGroup">
				<template v-for="item in editorList">
					<shortcut-panel :key="item.id" v-if="item.isShortcut" v-show="item.active"></shortcut-panel>
					<editor :active="item.active" :key="item.id" :ref="'editor' + item.id" :tab-data="item" v-else v-show="item.active"></editor>
				</template>
			</div>
			<div @mousedown="onTerminalSashBegin" class="my-sash-h" v-show="_terminalVisible"></div>
			<!-- tab栏 -->
			<div :style="{height: terminalHeight+'px'}" class="my-terminal-groups" v-show="_terminalVisible">
				<terminal-bar :terminalList="terminalList"></terminal-bar>
				<template v-for="item in terminalList">
					<terminal :active="item.active" :id="item.id" :key="item.id" :path="item.path" :ref="'terminal' + item.id" v-show="item.active"></terminal>
				</template>
			</div>
		</div>
		<!-- 顶部菜单栏 -->
		<title-bar :height="topBarHeight" ref="titleBar"></title-bar>
		<!-- 状态栏 -->
		<status-bar :height="statusHeight" ref="statusBar" v-show="statusbarVisible"></status-bar>
		<cmd-panel></cmd-panel>
		<Dialog :btns="dialogBtns" :content="dialogContent" :icon="this.dialogIcon" :icon-color="this.dialogIconColor" :overlay="true" :title="dialogTilte" @close="closeDialog" v-show="dialogVisible"></Dialog>
	</div>
</template>
<script>
	import Editor from './Editor.vue';
	import EditorBar from './EditorBar.vue';
	import TitleBar from './TitleBar';
	import StatusBar from './StatusBar';
	import SideBar from './SideBar.vue';
	import ActivityBar from './ActivityBar.vue';
	import FileContentSearch from './FileContentSearch.vue';
	import Dialog from './Dialog.vue';
	import CmdPanel from './CmdPanel.vue';
	import Terminal from './Terminal.vue';
	import TerminalBar from './TerminalBar.vue';
	import ShortcutPanel from './ShortcutPanel.vue';
	import Context from '@/module/context/index';
	import Theme from '@/module/theme';
	import EventBus from '@/event';
	import Util from '@/common/util';
	import CommonEvent from '@/events';
	import Shortcut from '@/module/shortcut';
	import Persistence from '@/module/persistence';
	import $ from 'jquery';
	import globalData from '@/data/globalData';

	const fs = window.require('fs');
	const path = window.require('path');
	const remote = window.require('@electron/remote');
	const {
		ipcRenderer
	} = window.require('electron');
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
			Terminal,
			TerminalBar,
			ShortcutPanel,
		},
		data() {
			return {
				extensionsPath: path.join(globalData.dirname, 'main/extensions'),
				statusHeight: 30,
				topBarHeight: 35,
				editorList: globalData.editorList,
				terminalList: globalData.terminalList,
				dialogVisible: false,
				dialogTilte: '',
				dialogContent: '',
				dialogBtns: [],
				dialogIcon: '',
				dialogIconColor: '',
				terminalVisible: globalData.views.terminal,
				sidebarVisible: globalData.views.sidebar,
				statusbarVisible: globalData.views.statusbar,
				terminalHeight: 260,
				themeType: 'dark',
				activity: 'files',
				leftWidth: 400,
			};
		},
		computed: {
			_topBarHeight() {
				return this.topBarHeight + 'px';
			},
			_statusHeight() {
				if (this.statusbarVisible) {
					return this.statusHeight + 'px';
				}
			},
			_terminalVisible() {
				return this.terminalVisible && this.terminalList.length
			}
		},
		created() {
			const currentWindow = remote.getCurrentWindow();
			window.globalData = globalData;
			globalData.$mainWin = this;
			globalData.shortcut = new Shortcut(this);
			this.shortcut = globalData.shortcut;
			this.commonEvent = new CommonEvent(this);
			this.persistence = new Persistence();
			this.initEvent();
			this.initEventBus();
			this.persistence.loadTerminalTabData();
			this.persistence.loadShortcutData();
			//右键打开文件
			Promise.all([this.persistence.loadFileTree(), this.persistence.loadTabData()]).then(() => {
				this.initOpenWith(remote.process.argv);
			});
			currentWindow.webContents.setZoomLevel(globalData.zoomLevel);
			currentWindow.on(
				'blur',
				(this.winFn1 = () => {
					EventBus.$emit('close-menu');
				})
			);
			currentWindow.on(
				'close',
				(this.winFn2 = () => {
					this.closeMain = true;
				})
			);
			ipcRenderer.on('file-open-with', (e, argv) => {
				this.initOpenWith(argv);
			});
			window.onbeforeunload = (e) => {
				if (!this.preCloseDone) {
					EventBus.$emit('window-close');
					e.returnValue = false;
					setTimeout(() => {
						this.preCloseDone = true;
						currentWindow.removeListener('blur', this.winFn1);
						currentWindow.removeListener('close', this.winFn2);
						if (this.closeMain) {
							currentWindow.close();
						} else {
							currentWindow.reload();
						}
					}, 0);
				}
			};
		},
		mounted() {
			window.test = this;
			const theme = new Theme();
			theme.loadTheme(globalData.nowTheme);
			this.loadExtensions().then((result) => {
				let langeuages = result.languages;
				let themes = result.themes;
				let iconThemes = result.iconThemes;
				let scopeFileList = result.scopeFileList;
				langeuages.push({
					name: 'Plain Text',
					value: '',
					checked: true
				});
				globalData.languageList.empty().push(...langeuages);
				globalData.scopeFileList.empty().push(...scopeFileList);
				globalData.themes.empty().push(...themes);
				globalData.iconThemes.empty().push(...iconThemes);
				theme.checkNowTheme();
				theme.checkNowIconTheme(true); // loadIconTheme需要用到globalData.languageList
				EventBus.$emit('language-check');
			});
			this.initResizeEvent();
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
							let height = (this.terminalHeight -= e.clientY - this.terminaSashMouseObj.clientY);
							height = height > 0 ? height : 0;
							this.terminalHeight = height;
							this.terminaSashMouseObj = e;
						}
					})
					.on('mouseup', (e) => {
						this.leftSashMouseObj = null;
						this.terminaSashMouseObj = null;
					})
					.on('keydown', (e) => {
						this.shortcut.onKeydown(e);
					})
					.on('keyup', (e) => {
						this.shortcut.onKeyup(e);
					})
					.on('dragover', (e) => {
						e.preventDefault();
						e.stopPropagation();
					})
					.on('drop', (e) => {
						e.preventDefault();
						e.stopPropagation();
						for (const item of e.originalEvent.dataTransfer.files) {
							EventBus.$emit('file-open-with', item.path);
						}
					});
			},
			initResizeEvent() {
				this.resizeObserver = new ResizeObserver((entries) => {
					if (this.$refs.editorGroup && this.$refs.editorGroup.clientHeight) {
						EventBus.$emit('editor-size-change');
					}
				});
				this.resizeObserver.observe(this.$refs.editorGroup);
			},
			initEventBus() {
				EventBus.$on('theme-changed', (value) => {
					this.themeType = globalData.nowTheme.type;
				});
				EventBus.$on('activity-change', (activity) => {
					this.activity = activity;
				});
				EventBus.$on('terminal-toggle', () => {
					this.terminalVisible = !this.terminalVisible;
					globalData.views.terminal = this.terminalVisible;
					if (this.terminalVisible && !this.terminalList.length) {
						EventBus.$emit('terminal-new');
					}
				});
				EventBus.$on('sidebar-toggle', () => {
					this.sidebarVisible = !this.sidebarVisible;
				});
				EventBus.$on('statusbar-toggle', () => {
					this.statusbarVisible = !this.statusbarVisible;
				});
				EventBus.$on('dialog-show', (option) => {
					this.showDialog(option);
				});
				EventBus.$on('dialog-close', () => {
					this.closeDialog();
				});
				EventBus.$on('editor-changed', (data) => {
					if (!data || data.id !== this.nowEditorId) {
						this.diffVisible = false;
					}
				});
				EventBus.$on('editor-content-change', (data) => {
					// 保存修改过的内存到缓存
					this.persistence.storeTempDataById(data.id);
				});
			},
			initOpenWith(argv) {
				if (remote.process.platform.startsWith('win') && argv[2] !== 'development' && argv.length >= 2) {
					setTimeout(() => {
						argv.slice(1).forEach((item) => {
							if (fs.existsSync(item)) {
								EventBus.$emit('file-open-with', item);
							}
						});
					}, 100);
				}
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
			showDialog(option) {
				this.dialogTilte = option.title || '';
				this.dialogContent = option.content || '';
				this.dialogBtns = option.btns;
				this.dialogVisible = true;
				this.dialogIconColor = option.iconColor || '';
				this.dialogIcon = option.icon || '';
			},
			closeDialog() {
				this.dialogVisible = false;
			},
			onCloseDiff() {
				this.diffVisible = false;
			},
			// 加载语言支持
			loadExtensions() {
				let languages = [];
				let scopeFileList = [];
				let themes = [
					[],
					[],
					[],
					[]
				];
				let iconThemes = [];
				return new Promise((resolve) => {
					// 异步读取目录内容
					fs.readdir(this.extensionsPath, {
						encoding: 'utf8'
					}, (err, files) => {
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
			getEditor(id) {
				let editor = this.$refs[`editor${id}`];
				return editor && editor[0];
			},
			getNowEditor() {
				return this.getEditor(globalData.nowEditorId);
			},
			getContext(id) {
				return contexts[id];
			},
			getNowContext() {
				return this.getContext(globalData.nowEditorId);
			},
		},
	};
</script>