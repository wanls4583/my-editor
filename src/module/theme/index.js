/*
 * @Author: lisong
 * @Date: 2022-03-22 23:00:49
 * @Description:
 */
import Util from '../../common/Util';
import chroma from 'chroma-js';

const require = window.require || window.parent.require || function () {};
const path = require('path');
const settingMap = {
    foreground: 'color',
    background: 'background-color',
    fontStyle: 'font-style',
};

export default class {
    constructor() {}
    loadTheme(url, type) {
        let result = { tokenColors: [], colors: {} };
        return _loadTheme(url).then(() => {
            let css = '';
            this.setDefaultColor(result, type);
            css = this.parseCss(result);
            this.insertCss(css);
        });

        function _loadTheme(fullPath) {
            return Util.readFile(fullPath).then((data) => {
                data = data.toString();
                // 去掉注释
                data = data.replaceAll(/(?<=(?:[\n\r\{\[\"]|^)\s*\,?\s*)\/\/[\s\S]*?(?=\r\n|\n|\r|$)/g, '');
                data = data.replaceAll(/\,(?=\s*(?:(?:\r\n|\n|\r))*\s*[\]\}])/g, '');
                data = JSON.parse(data);
                if (data.include) {
                    return _loadTheme(path.join(fullPath, '../' + data.include)).then(() => {
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
    parseCss(data) {
        let css = '';
        let scopeId = 1;
        let scopeList = [];
        let regSource = [];
        let scopeIdMap = {};
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
            data.tokenColors.forEach((token) => {
                if (!token.scope) {
                    return;
                }
                let selector = [];
                let scope = token.scope instanceof Array ? token.scope.join(',') : token.scope;
                scope = scope.replace(/\s+/g, ' ');
                scope = scope.split(',');
                scope.forEach((scope, index) => {
                    selector.push(`.my-scope-${scopeId}`);
                    scopeIdMap[scopeId] = {
                        scopeId: scopeId,
                        scope: scope,
                        level: _getLevel(scope),
                    };
                    scopeList.push(scopeIdMap[scopeId]);
                    scopeId++;
                });
                selector = selector.join(',');
                css += `${selector}{\n`;
                for (let prop in token.settings) {
                    css += `${settingMap[prop]}:${token.settings[prop]};\n`;
                }
                css += '}\n';
            });
        }
        scopeList.sort((a, b) => {
            return b.level - a.level;
        });
        scopeList.forEach((item) => {
            let scope = item.scope
                .split(' ')
                .map((item) => {
                    return `${item}(?:\\.[^\\.\\s]+)*?(?:\\s[^\\s]+)*?`;
                })
                .join(' ');
            regSource.push(`(?<reg_${item.scopeId}>${scope})`);
        });
        window.globalData.scopeReg = new RegExp(regSource.join('|'));
        window.globalData.scopeIdMap = scopeIdMap;
        window.globalData.colors = data.colors;
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
        if (window.globalData.style) {
            window.globalData.style.remove();
        }
        window.globalData.style = document.createElement('style');
        window.globalData.style.type = 'text/css';
        window.globalData.style.appendChild(document.createTextNode(css));
        document.getElementsByTagName('head')[0].appendChild(window.globalData.style);
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
        _tab();
        _editorWidget();
        _input();
        _toolbar();

        // base
        function _base() {
            if (!result.colors['foreground']) {
                if (isLight) {
                    result.colors['foreground'] = '#575757';
                } else {
                    result.colors['foreground'] = 'rgb(221, 221, 221)';
                }
            }
            if (!result.colors['background']) {
                if (isLight) {
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
                } else if (isLight) {
                    result.colors['sash.hoverBorder'] = '#0090f1';
                } else {
                    result.colors['sash.hoverBorder'] = '#75715e';
                }
            }

            if (type === 'contrast light' || type === 'contrast dark') {
                result.colors['contrastActiveBorder-side'] = result.colors['contrastActiveBorder'];
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
            if (!result.colors['list.activeSelectionBackground']) {
                if (isHc) {
                    result.colors['list.activeSelectionBackground'] = transparent;
                } else {
                    result.colors['list.activeSelectionBackground'] = '#0066b8';
                    result.colors['list.activeSelectionForeground'] = '#fff';
                }
            }
            if (!result.colors['list.activeSelectionForeground']) {
                result.colors['list.activeSelectionForeground'] = foreground;
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
                    result.colors['quickInputList.focusForeground'] = foreground;
                }
            }
        }
        //menu
        function _menu() {
            if (!result.colors['menu.foreground']) {
                result.colors['menu.foreground'] = foreground;
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
                if (isHc) {
                    result.colors['editorLineNumber.foreground'] = result.colors['editor.foreground'];
                } else if (isLight) {
                    result.colors['editorLineNumber.foreground'] = 'rgba(0,0,0,0.5)';
                } else {
                    result.colors['editorLineNumber.foreground'] = 'rgba(255,255,255,0.5)';
                }
            }
            if (!result.colors['editorLineNumber.activeForeground']) {
                if (isHc) {
                    result.colors['editorLineNumber.activeForeground'] = contrastActiveBorder || result.colors['editor.foreground'];
                } else if (isLight) {
                    result.colors['editorLineNumber.activeForeground'] = '#000';
                } else {
                    result.colors['editorLineNumber.activeForeground'] = '#fff';
                }
            }
            if (!result.colors['editorCursor.foreground']) {
                result.colors['editorCursor.foreground'] = result.colors['editor.foreground'];
            }
            if (!result.colors['editor.selectionForeground']) {
                if (isHc) {
                    if (isLight) {
                        result.colors['editor.selectionForeground'] = '#fff';
                    } else {
                        result.colors['editor.selectionForeground'] = '#333';
                    }
                }
            }
            if (!result.colors['editor.selectionBackground']) {
                if (isHc) {
                    result.colors['editor.selectionBackground'] = focusBorder;
                } else {
                    result.colors['editor.selectionBackground'] = '#0097fb6e';
                }
            }
            if (!result.colors['editor.selectionHighlightBackground']) {
                result.colors['editor.selectionHighlightBackground'] = transparent;
            }
            if (!result.colors['editor.selectionHighlightBorder']) {
                result.colors['editor.selectionHighlightBorder'] = contrastActiveBorder || '#0097fb6e';
            }
            if (!result.colors['editor.findMatchBackground']) {
                result.colors['editor.findMatchBackground'] = 'rgb(250, 201, 171)';
            }
            if (!result.colors['editor.findMatchBorder']) {
                result.colors['editor.findMatchBorder'] = transparent;
            }
            if (!result.colors['editor.findMatchHighlightBackground']) {
                result.colors['editor.findMatchHighlightBackground'] = transparent;
            }
            if (!result.colors['editor.findMatchHighlightBorder']) {
                result.colors['editor.findMatchHighlightBorder'] = contrastActiveBorder || 'rgb(250, 201, 171)';
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
            if (!result.colors['editorGroupHeader.border']) {
                result.colors['editorGroupHeader.border'] = contrastBorder;
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
                result.colors['editorWidget.foreground'] = foreground;
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
                result.colors['editorWidget.border'] = contrastBorder;
            }
            if (!result.colors['editorSuggestWidget.foreground']) {
                result.colors['editorSuggestWidget.background'] = result.colors['editorWidget.foreground'];
            }
            if (!result.colors['editorSuggestWidget.background']) {
                result.colors['editorSuggestWidget.background'] = result.colors['editorWidget.background'];
            }
            if (!result.colors['editorSuggestWidget.border']) {
                result.colors['editorSuggestWidget.border'] = contrastBorder;
            }
            if (!result.colors['editorSuggestWidget.selectedForeground']) {
                result.colors['editorSuggestWidget.selectedForeground'] = foreground;
            }
            if (!result.colors['editorSuggestWidget.selectedBackground']) {
                result.colors['editorSuggestWidget.selectedBackground'] = transparent;
            }
            if (!result.colors['editorSuggestWidget.highlightForeground']) {
                result.colors['editorSuggestWidget.highlightForeground'] = contrastActiveBorder;
            }
            if (!result.colors['editorSuggestWidget.focusHighlightForeground']) {
                result.colors['editorSuggestWidget.focusHighlightForeground'] = contrastBorder;
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
                    result.colors['inputOption.activeBackground'] = chroma(focusBorder).alpha(0.6).css();
                    result.colors['inputOption.activeForeground'] = '#fff';
                }
            }
            if (!result.colors['inputOption.activeBorder']) {
                result.colors['inputOption.activeBorder'] = focusBorder;
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
    }
}
