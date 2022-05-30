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
			<div style="flex-grow:1">
				<side-bar ref="sideBar" v-show="activity === 'files'"></side-bar>
				<file-content-search v-show="activity === 'search'"></file-content-search>
			</div>
			<div @mousedown="onLeftSashBegin" class="my-sash-v" style="position:absolute;right:0"></div>
		</div>
		<div class="my-right-wrap" ref="rightWrap">
			<!-- tab栏 -->
			<editor-bar :editorList="editorList" v-show="editorList.length"></editor-bar>
			<!-- 编辑区 -->
			<div class="my-editor-groups">
				<template v-for="item in editorList">
					<editor :active="item.active" :id="item.id" :key="item.id" :name="item.name" :path="item.path" :ref="'editor' + item.id" v-show="item.active"></editor>
				</template>
			</div>
			<template v-if="terminalVisible && terminalList.length">
				<div @mousedown="onTerminalSashBegin" class="my-sash-h"></div>
				<!-- tab栏 -->
				<div :style="{height: terminalHeight+'px'}" class="my-terminal-groups">
					<terminal-bar :terminalList="terminalList"></terminal-bar>
					<template v-for="item in terminalList">
						<terminal :active="item.active" :id="item.id" :key="item.id" :path="item.path" :ref="'terminal' + item.id" v-show="item.active"></terminal>
					</template>
				</div>
			</template>
		</div>
		<!-- 顶部菜单栏 -->
		<title-bar :height="topBarHeight" ref="titleBar"></title-bar>
		<!-- 状态栏 -->
		<status-bar :height="statusHeight" @select-langeuage="onSelectLanguage" ref="statusBar"></status-bar>
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
import Context from '@/module/context/index';
import Theme from '@/module/theme';
import EventBus from '@/event';
import Util from '@/common/util';
import CommonEvent from '@/common/event';
import WinShorcut from '@/module/shortcut/window';
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
		Terminal,
		TerminalBar,
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
			terminalVisible: false,
			terminalHeight: 300,
			themeType: 'dark',
			activity: 'files',
			leftWidth: 400,
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
		};
	},
	created() {
		window.globalData = globalData;
		globalData.$mainWin = this;
		this.commonEvent = new CommonEvent(this);
		this.winShorcut = new WinShorcut(this);
		this.initEvent();
		this.initEventBus();
		if (this.mode === 'app') {
			const currentWindow = remote.getCurrentWindow();
			const size = remote.screen.getPrimaryDisplay().size;
			currentWindow.on('blur', () => {
				EventBus.$emit('close-menu');
			});
			// 大尺寸屏幕上，放大显示比例
			if (size.width > 1400) {
				globalData.zoomLevel = 0.5;
			}
			remote.getCurrentWindow().webContents.setZoomLevel(globalData.zoomLevel);
		}
	},
	mounted() {
		window.test = this;
		const theme = new Theme();
		theme.loadTheme(globalData.nowTheme);
		EventBus.$emit('file-open');
		this.loadExtensions().then((result) => {
			let langeuages = result.languages;
			let themes = result.themes;
			let iconThemes = result.iconThemes;
			let scopeFileList = result.scopeFileList;
			langeuages.push({ name: 'Plain Text', value: '', checked: true });
			globalData.languageList.empty().push(...langeuages);
			globalData.scopeFileList.empty().push(...scopeFileList);
			globalData.themes.empty().push(...themes);
			globalData.iconThemes.empty().push(...iconThemes);
			theme.loadIconTheme(globalData.nowIconTheme); // loadIconTheme需要用到globalData.languageList
			EventBus.$emit('language-check');
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
					this.winShorcut.onKeydown(e);
				});
		},
		initEventBus() {
			EventBus.$on('theme-changed', (value) => {
				this.themeType = globalData.nowTheme.type;
			});
			EventBus.$on('activity-change', (activity) => {
				this.activity = activity;
			});
			EventBus.$on('terminal-new', () => {
				this.terminalVisible = true;
			});
			EventBus.$on('terminal-toggle', () => {
				this.terminalVisible = !this.terminalVisible;
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
		onSelectLanguage() {
			let cmdList = globalData.languageList.map((item) => {
				return {
					op: 'selectLanguage',
					name: item.name + (item.language ? `（${item.language}）` : ''),
					value: item.value,
				};
			});
			EventBus.$emit('cmd-menu-open', {
				cmdList: cmdList,
				value: globalData.nowEditorId && this.getNowEditor().language,
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
