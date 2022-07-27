/*
 * @Author: lisong
 * @Date: 2022-03-22 23:00:49
 * @Description:
 */
import Util from '../../common/util';
import globalData from '@/data/globalData';
import chroma from 'chroma-js';
import EventBus from '@/event';

const path = window.require('path');
const settingMap = {
	foreground: 'color',
	background: 'background-color',
	fontStyle: 'font-style'
};

export default class {
	constructor() { }
	loadTheme(option) {
		let result = { tokenColors: [], colors: {} };
		return _loadTheme.call(this, option.path).then(() => {
			let css = '';
			this.setDefaultColor(result, option.type);
			css = this.parseCss(result);
			this.insertCss(css);
			globalData.nowTheme = {
				value: option.value,
				type: option.type,
				path: option.path
			};
			EventBus.$emit('theme-changed', option.value);
		});

		function _loadTheme(fullPath) {
			return Util.loadJsonFile(fullPath).then(data => {
				if (data.include) {
					return _loadTheme.call(this, path.join(fullPath, '../' + data.include)).then(() => {
						_addColors(data);
					});
				} else {
					_addColors(data);
				}
			});
		}

		function _addColors(data) {
			data.tokenColors && result.tokenColors.push(...data.tokenColors);
			data.colors && Object.assign(result.colors, data.colors);
		}
	}
	loadIconTheme(option) {
		if (!option.path) {
			globalData.nowIconTheme = {
				value: option.value,
			};
			globalData.nowIconData = null;
			EventBus.$emit('icon-changed');
			return Promise.resolve();
		}
		let languages = globalData.languageList;
		let languageMap = {};
		languages.forEach(item => {
			if (item.extensions) {
				languageMap[item.value] = item.extensions.map(e => {
					return e.slice(1);
				});
			}
		});

		return _loadTheme.call(this, option.path);

		function _loadTheme(fullPath) {
			return Util.loadJsonFile(fullPath).then(data => {
				let fonts = data.fonts || [];
				let css = '';
				fonts.forEach(font => {
					let fontFace = '@font-face{\nsrc:';
					font.src.forEach((src, index) => {
						let url = path.join(fullPath, '../' + src.path);
						url = url.replace(/\\/g, '/');
						fontFace += `url('my-file://${url}')`;
						fontFace += ` format('${src.format}')`;
						fontFace += index < font - src.length - 1 ? ', ' : '';
					});
					fontFace += ';\n';
					fontFace += `font-family:${font.id};\n`;
					fontFace += `font-style:${font.style};\n`;
					fontFace += `font-weight:${font.weight};\n`;
					fontFace += '}\n';
					css += fontFace;
					css += '.my-file-icon::before{\n';
					css += `font-family:${font.id};\n`;
					css += `font-size:${font.size};\n`;
					css += '}\n';
				});
				for (let icon in data.iconDefinitions) {
					css += `.my-file-icon-${icon}::before{\n`;
					icon = data.iconDefinitions[icon];
					if (icon.fontCharacter) {
						css += 'top:2px;';
						css += `content:"${icon.fontCharacter}";\n`;
						css += `color:${icon.fontColor};\n`;
					} else if (icon.iconPath) {
						let imgUrl = path.join(fullPath, '../' + icon.iconPath);
						imgUrl = imgUrl.replace(/\\/g, '/');
						css += 'content:"";';
						css += `background-image:url(my-file://${imgUrl})`;
					}
					css += '}\n';
				}
				this.insertFont(css);
				data.fileNames = data.fileNames || {};
				data.fileExtensions = data.fileExtensions || {};
				_setFileExtensions(data);
				globalData.nowIconTheme = {
					value: option.value,
					path: option.path
				};
				globalData.nowIconData = data;
				EventBus.$emit('icon-changed', option.value);
			});
		}

		function _setFileExtensions(data) {
			data.languageIds && _parseLanguageIds(data.languageIds, data.fileExtensions);
			if (data.light) {
				data.light.fileExtensions = data.light.fileExtensions || {};
				data.light.fileNames = data.light.fileNames || {};
				data.light.folderNames = data.light.folderNames || {};
				data.light.folderNamesExpanded = data.light.folderNamesExpanded || {};
				data.light.languageIds && _parseLanguageIds(data.light.languageIds, data.light.fileExtensions);
				for (let key in data.fileExtensions) {
					data.light.fileExtensions[key] = data.light.fileExtensions[key] || data.fileExtensions[key];
				}
				for (let key in data.fileNames) {
					data.light.fileNames[key] = data.light.fileNames[key] || data.fileNames[key];
				}
				for (let key in data.folderNames) {
					data.light.folderNames[key] = data.light.folderNames[key] || data.folderNames[key];
				}
				for (let key in data.folderNamesExpanded) {
					data.light.folderNamesExpanded[key] = data.light.folderNamesExpanded[key] || data.folderNamesExpanded[key];
				}
			} else {
				data.light = {
					fileExtensions: data.fileExtensions,
					fileNames: data.fileNames,
					folderNames: data.folderNames,
					folderNamesExpanded: data.folderNamesExpanded
				};
			}
		}

		function _parseLanguageIds(languageIds, fileExtensions) {
			for (let key in languageIds) {
				let extensions = languageMap[key];
				let value = languageIds[key];
				if (extensions) {
					extensions.forEach(item => {
						fileExtensions[item] = value;
					});
				}
			}
		}
	}
	// 验证当前主题的有效性
	checkNowTheme() {
		let nowTheme = globalData.nowTheme;
		let list = globalData.themes.flat();
		for (let i = 0; i < list.length; i++) {
			if (list[i].path === nowTheme.path && list[i].value === nowTheme.value) {
				return true;
			}
		}
		this.loadTheme(list[0]);
	}
	// 验证当前Icon主题的有效性
	checkNowIconTheme(refresh) {
		let nowIconTheme = globalData.nowIconTheme;
		if (nowIconTheme.path) {
			let list = globalData.iconThemes.flat();
			for (let i = 0; i < list.length; i++) {
				if (list[i].path === nowIconTheme.path && list[i].value === nowIconTheme.value) {
					refresh && this.loadIconTheme(list[i]);
					return true;
				}
			}
			this.loadIconTheme({ value: 'none' });
		}
	}
	parseCss(data) {
		let css = '';
		let scopeId = 1;
		let scopeTokenList = [];
		let dotReg = /\./g;
		let sReg = /\s+/g;
		if (data.colors) {
			css += ':root{\n';
			for (let key in data.colors) {
				css += `--my-${key.replace(/\./g, '-')}: ${data.colors[key]};\n`;
			}
			css += '}\n';
		}
		if (data.tokenColors) {
			data.tokenColors.forEach(token => {
				if (!token.scope) {
					return;
				}
				let selector = [];
				let style = '';
				let settingsStr = '';
				let scope = token.scope instanceof Array ? token.scope.join(',') : token.scope;
				scope = scope.replace(/\s+/g, ' ');
				scope = scope.split(/\s*\,\s*/);
				for (let prop in token.settings) {
					style += `${settingMap[prop]}:${token.settings[prop]};\n`;
					if (token.settings[prop]) {
						settingsStr += `${prop}:${token.settings[prop]};`;
					}
				}
				scope.forEach((scope, index) => {
					selector.push(`.my-scope-${scopeId}`);
					scopeTokenList.push({
						scopeId: scopeId,
						scope: scope,
						scopes: scope.split(' '),
						level: _getLevel(scope),
						settings: token.settings,
						settingsStr: settingsStr
					});
					scopeId++;
				});
				css += `${selector.join(',')}{\n${style}\n}`;
			});
		}
		scopeTokenList.sort((a, b) => {
			return b.level - a.level;
		});
		globalData.scopeIdMap = {};
		scopeTokenList.forEach(item => {
			globalData.scopeIdMap[item.scopeId] = item;
			if (item.scopes.length > 1) {
				item.regexp = item.scopes.join('(?:\\.[^\\.\\s]+)*?(?:\\s[^\\s]+)*? ');
			} else {
				item.regexp = item.scope;
			}
			item.regexp = new RegExp(item.regexp);
		});
		globalData.scopeTokenList = scopeTokenList;
		globalData.colors = data.colors;
		return css;

		function _getLevel(scope) {
			let dot = scope.match(dotReg);
			let s = scope.match(sReg);
			dot = (dot && dot.length) || 0;
			s = (s && s.length * 1000) || 0;
			return dot + s;
		}
	}
	insertCss(css) {
		if (globalData.themeStyle) {
			globalData.themeStyle.innerText = '';
		} else {
			globalData.themeStyle = document.createElement('style');
			globalData.themeStyle.type = 'text/css';
		}
		globalData.themeStyle.appendChild(document.createTextNode(css));
		document.getElementsByTagName('head')[0].appendChild(globalData.themeStyle);
	}
	insertFont(css) {
		if (globalData.iconStyle) {
			globalData.iconStyle.innerText = '';
		} else {
			globalData.iconStyle = document.createElement('style');
			globalData.iconStyle.type = 'text/css';
		}
		globalData.iconStyle.appendChild(document.createTextNode(css));
		document.getElementsByTagName('head')[0].appendChild(globalData.iconStyle);
	}
	setDefaultColor(result, type) {
		let transparent = 'transparent';
		let foreground = '';
		let background = '';
		let focusBorder = '';
		let contrastBorder = '';
		let contrastActiveBorder = '';
		let isLight = type === 'light' || type === 'contrast light';
		let isHc = type === 'contrast light' || type === 'contrast dark';

		_base();
		_scrollbar();
		_titleBar();
		_dropdown();
		_list();
		_menu();
		_statusBar();
		_sideBar();
		_editor();
		_terminal();
		_tab();
		_editorWidget();
		_input();
		_toolbar();
		_badge();
		_git();
		_minimap();

		// base
		function _base() {
			if (!result.colors['foreground']) {
				if (result.colors['editor.foreground']) {
					result.colors['foreground'] = chroma(result.colors['editor.foreground']).alpha(0.8).css();
				} else if (isLight) {
					result.colors['foreground'] = '#575757';
				} else {
					result.colors['foreground'] = 'rgb(221, 221, 221)';
				}
			}
			if (!result.colors['errorForeground']) {
				result.colors['errorForeground'] = '#ff0000';
			}
			if (!result.colors['background']) {
				if (result.colors['editor.background']) {
					result.colors['background'] = chroma(result.colors['editor.background']).alpha(0.8).css();
				} else if (isLight) {
					result.colors['background'] = '#fff';
				} else if (isHc) {
					result.colors['background'] = '#000';
				} else {
					result.colors['background'] = 'rgba(60,60,60)';
				}
			}
			if (!result.colors['focusBorder']) {
				if (isHc) {
					if (isLight) {
						result.colors['focusBorder'] = '#0f4a85';
					} else {
						result.colors['focusBorder'] = '#f38518';
					}
				} else {
					result.colors['focusBorder'] = '#0066b8';
				}
			}
			if (!result.colors['contrastBorder']) {
				if (isHc) {
					if (isLight) {
						result.colors['contrastBorder'] = '#0f4a85';
					} else {
						result.colors['contrastBorder'] = '#6fc3df';
					}
				} else {
					result.colors['contrastBorder'] = transparent;
				}
			}
			if (!result.colors['contrastActiveBorder']) {
				if (isHc) {
					result.colors['contrastActiveBorder'] = result.colors['focusBorder'];
				} else {
					result.colors['contrastActiveBorder'] = transparent;
				}
			}
			if (!result.colors['widget.shadow']) {
				if (isHc) {
					result.colors['widget.shadow'] = transparent;
				} else if (isLight) {
					result.colors['widget.shadow'] = 'rgba(0,0,0,0.16)';
				} else {
					result.colors['widget.shadow'] = 'rgba(0,0,0,0.36)';
				}
			}
			if (!result.colors['sash.hoverBorder']) {
				if (isHc) {
					result.colors['sash.hoverBorder'] = result.colors['contrastActiveBorder'];
				} else {
					result.colors['sash.hoverBorder'] = result.colors['focusBorder'];
				}
			}
			if (!result.colors['selection.background']) {
				result.colors['selection.background'] = result.colors['focusBorder'];
			}
			background = result.colors['background'];
			foreground = result.colors['foreground'];
			focusBorder = result.colors['focusBorder'];
			contrastBorder = result.colors['contrastBorder'];
			contrastActiveBorder = result.colors['contrastActiveBorder'];
		}
		function _scrollbar() {
			if (!result.colors['scrollbar.shadow']) {
				result.colors['scrollbar.shadow'] = transparent;
			}
			if (!result.colors['scrollbarSlider.background']) {
				if (isHc) {
					result.colors['scrollbarSlider.background'] = chroma(contrastBorder).alpha(0.6).css();
				} else if (isLight) {
					result.colors['scrollbarSlider.background'] = 'rgba(100, 100, 100, 0.4)';
				} else {
					result.colors['scrollbarSlider.background'] = 'rgba(121, 121, 121, 0.4);';
				}
			}
			if (!result.colors['scrollbarSlider.hoverBackground']) {
				if (isHc) {
					result.colors['scrollbarSlider.hoverBackground'] = chroma(contrastBorder).alpha(0.8).css();
				} else if (isLight) {
					result.colors['scrollbarSlider.hoverBackground'] = 'rgba(100, 100, 100, 0.7)';
				} else {
					result.colors['scrollbarSlider.hoverBackground'] = 'rgba(100, 100, 100, 0.7);';
				}
			}
			if (!result.colors['scrollbarSlider.activeBackground']) {
				if (isHc) {
					result.colors['scrollbarSlider.activeBackground'] = contrastBorder;
				} else if (isLight) {
					result.colors['scrollbarSlider.activeBackground'] = 'rgba(0, 0, 0, 0.6)';
				} else {
					result.colors['scrollbarSlider.activeBackground'] = 'rgba(191, 191, 191, 0.4);';
				}
			}
		}
		//titleBar
		function _titleBar() {
			if (!result.colors['titleBar.border']) {
				result.colors['titleBar.border'] = contrastBorder;
			}
			if (!result.colors['titleBar.activeForeground']) {
				result.colors['titleBar.activeForeground'] = foreground;
			}
			if (!result.colors['titleBar.activeBackground']) {
				if (isHc) {
					result.colors['titleBar.activeBackground'] = transparent;
				} else if (isLight) {
					result.colors['titleBar.activeBackground'] = 'rgb(221, 221, 221)';
				}
			}
			if (!result.colors['menubar.selectionForeground']) {
				result.colors['menubar.selectionForeground'] = foreground;
			}
			if (!result.colors['menubar.selectionBackground']) {
				if (isHc) {
					result.colors['menubar.selectionBackground'] = transparent;
				} else if (isLight) {
					result.colors['menubar.selectionBackground'] = 'rgba(0,0,0,0.1)';
				} else {
					result.colors['menubar.selectionBackground'] = 'rgba(255,255,255,0.1)';
				}
			}
			if (!result.colors['menubar.selectionBorder']) {
				if (isHc) {
					result.colors['menubar.selectionBorder'] = contrastActiveBorder;
				} else {
					result.colors['menubar.selectionBorder'] = transparent;
				}
			}
		}
		// dropdown
		function _dropdown() {
			if (!result.colors['dropdown.background']) {
				if (isHc) {
					result.colors['dropdown.background'] = background;
				} else if (isLight) {
					result.colors['dropdown.background'] = '#eee';
				} else {
					result.colors['dropdown.background'] = 'rgba(37,37,38)';
				}
			}
			if (!result.colors['dropdown.foreground']) {
				result.colors['dropdown.foreground'] = foreground;
			}
			if (!result.colors['dropdown.border']) {
				result.colors['dropdown.border'] = contrastBorder;
			}
		}
		// list
		function _list() {
			if (!result.colors['list.highlightForeground']) {
				if (isHc) {
					result.colors['list.highlightForeground'] = contrastBorder;
				} else {
					result.colors['list.highlightForeground'] = foreground;
				}
			}
			if (!result.colors['list.activeSelectionBackground']) {
				if (isHc) {
					result.colors['list.activeSelectionBackground'] = transparent;
				} else {
					result.colors['list.activeSelectionBackground'] = '#0066b8';
					result.colors['list.activeSelectionForeground'] = '#fff';
				}
			}
			if (!result.colors['list.activeSelectionForeground']) {
				if (isHc) {
					result.colors['list.activeSelectionForeground'] = foreground;
				} else if (isLight) {
					result.colors['list.activeSelectionForeground'] = 'rgba(51, 51, 51)';
				} else {
					result.colors['list.activeSelectionForeground'] = 'rgba(255, 255, 255)';
				}
			}
			if (!result.colors['list.hoverForeground']) {
				result.colors['list.hoverForeground'] = foreground;
			}
			if (!result.colors['list.hoverBackground']) {
				if (isHc) {
					result.colors['list.hoverBackground'] = transparent;
				} else if (isLight) {
					result.colors['list.hoverBackground'] = 'rgba(0,0,0,0.1)';
				} else {
					result.colors['list.hoverBackground'] = 'rgba(255,255,255,0.1)';
				}
			}
			if (!result.colors['quickInputList.focusBackground']) {
				if (result.colors['list.inactiveFocusBackground']) {
					result.colors['quickInputList.focusBackground'] = result.colors['list.inactiveFocusBackground'];
				} else if (isHc) {
					result.colors['quickInputList.focusBackground'] = transparent;
				} else {
					result.colors['quickInputList.focusBackground'] = '#0066b8';
					result.colors['quickInputList.focusForeground'] = '#fff';
				}
			}
			if (!result.colors['quickInputList.focusForeground']) {
				if (result.colors['list.inactiveFocusForeground']) {
					result.colors['quickInputList.focusForeground'] = result.colors['list.inactiveFocusForeground'];
				} else {
					result.colors['quickInputList.focusForeground'] = result.colors['list.activeSelectionForeground'];
				}
			}
		}
		//menu
		function _menu() {
			if (!result.colors['menu.foreground']) {
				if (isHc) {
					result.colors['menu.foreground'] = foreground;
				} else if (isLight) {
					result.colors['menu.foreground'] = 'rgba(51, 51, 51)';
				} else {
					result.colors['menu.foreground'] = 'rgba(255, 255, 255)';
				}
			}
			if (!result.colors['menu.background']) {
				result.colors['menu.background'] = result.colors['dropdown.background'];
			}
			if (!result.colors['menu.border']) {
				result.colors['menu.border'] = contrastBorder;
			}
			if (!result.colors['menu.selectionForeground']) {
				result.colors['menu.selectionForeground'] = result.colors['list.activeSelectionForeground'];
			}
			if (!result.colors['menu.selectionBackground']) {
				result.colors['menu.selectionBackground'] = result.colors['list.activeSelectionBackground'];
			}
			if (!result.colors['menu.selectionBorder']) {
				result.colors['menu.selectionBorder'] = contrastActiveBorder;
			}
			if (!result.colors['menu.separatorBackground']) {
				if (isHc) {
					result.colors['menu.separatorBackground'] = contrastBorder;
				} else if (isLight) {
					result.colors['menu.separatorBackground'] = 'rgba(0,0,0,0.2)';
				} else {
					result.colors['menu.separatorBackground'] = 'rgba(255,255,255,0.2)';
				}
			}
		}
		//statusBar
		function _statusBar() {
			if (!result.colors['statusBar.foreground']) {
				if (isHc) {
					result.colors['statusBar.foreground'] = foreground;
				} else {
					result.colors['statusBar.foreground'] = '#fff';
				}
			}
			if (!result.colors['statusBar.background']) {
				if (isLight && !isHc) {
					result.colors['statusBar.background'] = 'rgb(0, 122, 204)';
				} else {
					result.colors['statusBar.background'] = transparent;
				}
			}
			if (!result.colors['statusBar.border']) {
				result.colors['statusBar.border'] = contrastBorder;
			}
			if (!result.colors['statusBarItem.hoverBackground']) {
				result.colors['statusBarItem.hoverBackground'] = transparent;
			}
			if (!result.colors['statusBarItem.activeBackground']) {
				result.colors['statusBarItem.activeBackground'] = transparent;
			}
		}
		//sideBar
		function _sideBar() {
			if (!result.colors['sideBar.foreground']) {
				result.colors['sideBar.foreground'] = foreground;
			}
			if (!result.colors['sideBarTitle.foreground']) {
				result.colors['sideBarTitle.foreground'] = foreground;
			}
			if (!result.colors['sideBar.background']) {
				if (isHc) {
					result.colors['sideBar.background'] = transparent;
				} else if (isLight) {
					result.colors['sideBar.background'] = '#eee';
				} else {
					result.colors['sideBar.background'] = 'rgba(37,37,38)';
				}
			}
			if (!result.colors['sideBar.border']) {
				result.colors['sideBar.border'] = contrastBorder;
			}
		}
		// editor
		function _editor() {
			if (!result.colors['editor.foreground']) {
				result.colors['editor.foreground'] = foreground;
			}
			if (!result.colors['editor.background']) {
				if (isHc) {
					result.colors['editor.background'] = background;
				} else if (isLight) {
					result.colors['editor.background'] = '#fff';
				} else {
					result.colors['editor.background'] = 'rgb(30,30,30)';
				}
			}
			if (!result.colors['editorLineNumber.foreground']) {
				result.colors['editorLineNumber.foreground'] = chroma(result.colors['editor.foreground']).alpha(0.5).css();
			}
			if (!result.colors['editorLineNumber.activeForeground']) {
				result.colors['editorLineNumber.activeForeground'] = result.colors['editor.foreground'];
			}
			if (!result.colors['editorCursor.foreground']) {
				result.colors['editorCursor.foreground'] = result.colors['editor.foreground'];
			}
			if (!result.colors['editor.selectionForeground']) {
				if (isHc) {
					result.colors['editor.selectionForeground'] = foreground;
				}
			}
			if (!result.colors['editor.selectionBackground']) {
				if (isHc) {
					result.colors['editor.selectionBackground'] = focusBorder;
				} else {
					result.colors['editor.selectionBackground'] = chroma(focusBorder).alpha(0.8).css();
				}
			}
			if (!result.colors['editor.selectionHighlightBackground']) {
				result.colors['editor.selectionHighlightBackground'] = transparent;
			}
			if (!result.colors['editor.selectionHighlightBorder']) {
				if (isHc) {
					result.colors['editor.selectionHighlightBorder'] = contrastActiveBorder;
				} else if (result.colors['editor.selectionHighlightBackground'] === transparent) {
					result.colors['editor.selectionHighlightBorder'] = focusBorder;
				}
			}
			if (!result.colors['editor.findMatchBackground']) {
				result.colors['editor.findMatchBackground'] = result.colors['editor.selectionBackground'];
			}
			if (!result.colors['editor.findMatchBorder']) {
				result.colors['editor.findMatchBorder'] = transparent;
			}
			if (!result.colors['editor.findMatchHighlightBackground']) {
				result.colors['editor.findMatchHighlightBackground'] = result.colors['editor.selectionHighlightBackground'];
			}
			if (!result.colors['editor.findMatchHighlightBorder']) {
				result.colors['editor.findMatchHighlightBorder'] = result.colors['editor.selectionHighlightBorder'];
			}
			if (!result.colors['editor.lineHighlightBackground']) {
				result.colors['editor.lineHighlightBackground'] = transparent;
			}
			if (!result.colors['editor.lineHighlightBorder']) {
				if (result.colors['editor.lineHighlightBackground'] !== transparent) {
					result.colors['editor.lineHighlightBorder'] = transparent;
				} else if (isHc) {
					result.colors['editor.lineHighlightBorder'] = contrastActiveBorder;
				} else if (isLight) {
					result.colors['editor.lineHighlightBorder'] = 'rgba(0,0,0,0.2)';
				} else {
					result.colors['editor.lineHighlightBorder'] = 'rgba(255,255,255,0.1)';
				}
			}
			if (!result.colors['editorWhitespace.foreground']) {
				if (isHc) {
					result.colors['editorWhitespace.foreground'] = result.colors['editor.foreground'];
				} else if (isLight) {
					result.colors['editorWhitespace.foreground'] = 'rgba(0,0,0,0.2)';
				} else {
					result.colors['editorWhitespace.foreground'] = 'rgba(255,255,255,0.1)';
				}
			}
			if (!result.colors['editorIndentGuide.background']) {
				result.colors['editorIndentGuide.background'] = result.colors['editorWhitespace.foreground'];
			}
			if (!result.colors['editorBracketMatch.background']) {
				result.colors['editorBracketMatch.background'] = transparent;
			}
			if (!result.colors['editorBracketMatch.border']) {
				if (result.colors['editorBracketMatch.background'] === transparent) {
					result.colors['editorBracketMatch.border'] = chroma(result.colors['editor.foreground']).alpha(0.6).css();
				} else {
					result.colors['editorBracketMatch.border'] = transparent;
				}
			}
		}
		// terminal
		function _terminal() {
			if (!result.colors['terminal.background']) {
				result.colors['terminal.background'] = result.colors['editor.background'];
			}
			if (!result.colors['terminal.foreground']) {
				result.colors['terminal.foreground'] = result.colors['editor.foreground'];
			}
			if (!result.colors['terminal.selectionBackground']) {
				result.colors['terminal.selectionBackground'] = result.colors['selection.background'];
			}
			if (!result.colors['terminal.border']) {
				if (contrastBorder === transparent) {
					if (isLight) {
						result.colors['terminal.border'] = chroma(result.colors['editor.background']).darken().css();
					} else {
						result.colors['terminal.border'] = chroma(result.colors['editor.background']).brighten().css();
					}
				} else {
					result.colors['terminal.border'] = contrastBorder;
				}
			}
		}
		// tab
		function _tab() {
			if (!result.colors['editorGroupHeader.tabsBackground']) {
				if (isHc) {
					result.colors['editorGroupHeader.tabsBackground'] = transparent;
				} else {
					result.colors['editorGroupHeader.tabsBackground'] = result.colors['sideBar.background'];
				}
			}
			if (!result.colors['editorGroupHeader.tabsBackground']) {
				result.colors['editorGroupHeader.tabsBackground'] = contrastBorder;
			}
			if (!result.colors['tab.border']) {
				result.colors['tab.border'] = contrastBorder;
			}
			if (!result.colors['tab.activeForeground']) {
				if (isHc) {
					result.colors['tab.activeForeground'] = foreground;
				} else if (isLight) {
					result.colors['tab.activeForeground'] = 'rgba(51, 51, 51)';
				} else {
					result.colors['tab.activeForeground'] = '#fff';
				}
			}
			if (!result.colors['tab.activeBackground']) {
				result.colors['tab.activeBackground'] = result.colors['editor.background'];
			}
			if (!result.colors['tab.inactiveForeground']) {
				if (isHc) {
					result.colors['tab.inactiveForeground'] = foreground;
				} else if (isLight) {
					result.colors['tab.inactiveForeground'] = 'rgba(51, 51, 51, 0.7)';
				} else {
					result.colors['tab.inactiveForeground'] = 'rgba(255, 255, 255, 0.5)';
				}
			}
			if (!result.colors['tab.inactiveBackground']) {
				if (isHc) {
					result.colors['tab.inactiveBackground'] = transparent;
				} else if (isLight) {
					result.colors['tab.inactiveBackground'] = 'rgb(236, 236, 236)';
				} else {
					result.colors['tab.inactiveBackground'] = 'rgb(45, 45, 45)';
				}
			}
			if (!result.colors['tab.activeBorder']) {
				result.colors['tab.activeBorder'] = transparent;
			}
			if (!result.colors['tab.activeBorderTop']) {
				result.colors['tab.activeBorderTop'] = transparent;
			}
			if (!result.colors['tab.hoverForeground']) {
				result.colors['tab.hoverForeground'] = result.colors['tab.inactiveForeground'];
			}
			if (!result.colors['tab.hoverBackground']) {
				result.colors['tab.hoverBackground'] = transparent;
			}
			if (!result.colors['tab.hoverBorder']) {
				result.colors['tab.hoverBorder'] = transparent;
			}
		}
		// editorWidget
		function _editorWidget() {
			if (!result.colors['editorWidget.foreground']) {
				result.colors['editorWidget.foreground'] = result.colors['editor.foreground'];
			}
			if (!result.colors['editorWidget.background']) {
				if (isHc) {
					result.colors['editorWidget.background'] = background;
				} else if (isLight) {
					result.colors['editorWidget.background'] = '#eee';
				} else {
					result.colors['editorWidget.background'] = 'rgb(37,37,38)';
				}
			}
			if (!result.colors['editorWidget.border']) {
				if (isHc) {
					result.colors['editorWidget.border'] = contrastBorder;
				} else {
					result.colors['editorWidget.border'] = transparent;
				}
			}
			if (!result.colors['editorSuggestWidget.foreground']) {
				result.colors['editorSuggestWidget.foreground'] = result.colors['editorWidget.foreground'];
			}
			if (!result.colors['editorSuggestWidget.background']) {
				result.colors['editorSuggestWidget.background'] = result.colors['editorWidget.background'];
			}
			if (!result.colors['editorSuggestWidget.border']) {
				result.colors['editorSuggestWidget.border'] = result.colors['editorWidget.border'];
			}
			if (result.colors['editorSuggestWidget.border'] === transparent) {
				result.colors['editorSuggestWidget.shadow'] = result.colors['widget.shadow'];
			} else {
				result.colors['editorSuggestWidget.shadow'] = transparent;
			}
			if (!result.colors['editorSuggestWidget.selectedForeground']) {
				result.colors['editorSuggestWidget.selectedForeground'] = result.colors['editor.foreground'];
			}
			if (!result.colors['editorSuggestWidget.selectedBackground']) {
				result.colors['editorSuggestWidget.selectedBackground'] = result.colors['quickInputList.focusBackground'];
			}
			if (!result.colors['editorSuggestWidget.highlightForeground']) {
				result.colors['editorSuggestWidget.highlightForeground'] = result.colors['list.highlightForeground'];
			}
			if (!result.colors['editorSuggestWidget.focusHighlightForeground']) {
				result.colors['editorSuggestWidget.focusHighlightForeground'] = result.colors['list.highlightForeground'];
			}
		}
		// input
		function _input() {
			if (!result.colors['input.foreground']) {
				result.colors['input.foreground'] = foreground;
			}
			if (!result.colors['input.background']) {
				if (isHc) {
					result.colors['input.background'] = transparent;
				} else if (isLight) {
					result.colors['input.background'] = '#fff';
				} else {
					result.colors['input.background'] = background;
				}
			}
			if (!result.colors['input.border']) {
				if (result.colors['input.background'] === transparent) {
					result.colors['input.border'] = '#0066b8';
				} else {
					result.colors['input.border'] = transparent;
				}
			}
			if (!result.colors['inputOption.activeForeground']) {
				result.colors['inputOption.activeForeground'] = foreground;
			}
			if (!result.colors['inputOption.activeBackground']) {
				if (isHc) {
					result.colors['inputOption.activeBackground'] = transparent;
				} else {
					result.colors['inputOption.activeBackground'] = chroma(focusBorder).alpha(0.3).css();
				}
			}
			if (!result.colors['inputOption.activeBorder']) {
				result.colors['inputOption.activeBorder'] = transparent;
			}
			if (!result.colors['inputOption.hoverBackground']) {
				if (isHc) {
					result.colors['inputOption.hoverBackground'] = transparent;
				} else if (isLight) {
					result.colors['inputOption.hoverBackground'] = 'rgba(0,0,0,0.1)';
				} else {
					result.colors['inputOption.hoverBackground'] = 'rgba(255,255,255,0.1)';
				}
			}
		}
		// toolbar
		function _toolbar() {
			if (!result.colors['toolbar.hoverBackground']) {
				if (isHc) {
					result.colors['toolbar.hoverBackground'] = transparent;
				} else if (isLight) {
					result.colors['toolbar.hoverBackground'] = 'rgba(0,0,0,0.1)';
				} else {
					result.colors['toolbar.hoverBackground'] = 'rgba(255,255,255,0.1)';
				}
			}
			if (!result.colors['toolbar.activeBackground']) {
				result.colors['toolbar.activeBackground'] = transparent;
			}
			if (!result.colors['toolbar.hoverOutline']) {
				result.colors['toolbar.hoverOutline'] = contrastActiveBorder;
			}
		}
		//badge
		function _badge() {
			if (!result.colors['badge.foreground']) {
				result.colors['badge.foreground'] = foreground;
			}
			if (!result.colors['badge.backround']) {
				if (isHc) {
					result.colors['badge.backround'] = result.colors['contrastActiveBorder'];
				} else {
					result.colors['badge.backround'] = result.colors['focusBorder'];
				}
			}
		}
		//git
		function _git() {
			if (!result.colors['gitDecoration.untrackedResourceForeground']) {
				if (isLight) {
					result.colors['gitDecoration.untrackedResourceForeground'] = '#28a745';
				} else {
					result.colors['gitDecoration.untrackedResourceForeground'] = '#73c991';
				}
			}
			if (!result.colors['gitDecoration.addedResourceForeground']) {
				if (isLight) {
					result.colors['gitDecoration.addedResourceForeground'] = '#28a745';
				} else {
					result.colors['gitDecoration.addedResourceForeground'] = '#81b88b';
				}
			}
			if (!result.colors['gitDecoration.conflictingResourceForeground']) {
				if (isLight) {
					result.colors['gitDecoration.conflictingResourceForeground'] = '#e36209';
				} else {
					result.colors['gitDecoration.conflictingResourceForeground'] = '#e4676b';
				}
			}
			if (!result.colors['gitDecoration.modifiedResourceForeground']) {
				if (isLight) {
					result.colors['gitDecoration.modifiedResourceForeground'] = '#005cc5';
				} else {
					result.colors['gitDecoration.modifiedResourceForeground'] = '#e2c08d';
				}
			}
			if (!result.colors['gitDecoration.renamedResourceForeground']) {
				result.colors['gitDecoration.renamedResourceForeground'] = result.colors['gitDecoration.untrackedResourceForeground'];
			}
			if (!result.colors['gitDecoration.deletedResourceForeground']) {
				if (isLight) {
					result.colors['gitDecoration.deletedResourceForeground'] = '#d73a49';
				} else {
					result.colors['gitDecoration.deletedResourceForeground'] = '#c74e39';
				}
			}
			if (!result.colors['gitDecoration.ignoredResourceForeground']) {
				if (isLight) {
					result.colors['gitDecoration.ignoredResourceForeground'] = '#959da5';
				} else {
					result.colors['gitDecoration.ignoredResourceForeground'] = '#8c8c8c';
				}
			}
			if (!result.colors['diffEditor.removedTextBackground']) {
				if (isLight) {
					result.colors['diffEditor.removedTextBackground'] = 'rgba(255, 0, 0, 0.2';
				} else {
					result.colors['diffEditor.removedTextBackground'] = 'rgba(144, 39, 74, 0.44)';
				}
			}
			if (!result.colors['diffEditor.insertedTextBackground']) {
				if (isLight) {
					result.colors['diffEditor.insertedTextBackground'] = 'rgba(155, 185, 85, 0.2)';
				} else {
					result.colors['diffEditor.insertedTextBackground'] = 'rgba(75, 102, 22, 0.5)';
				}
			}
		}
		function _minimap() {
			if (!result.colors['minimap.selectionHighlight']) {
				result.colors['minimap.selectionHighlight'] = result.colors['editor.selectionBackground'];
			}
			if (!result.colors['minimap.findMatchHighlight']) {
				result.colors['minimap.findMatchHighlight'] = result.colors['editor.findMatchBackground'];
			}
		}
	}
}
