/*
 * @Author: lisong
 * @Date: 2022-03-22 23:00:49
 * @Description: 
 */
import Vue from 'vue';
import Util from '../../common/Util';

const require = window.require || window.parent.require || function () { };
const path = require('path');
const propertyMap = {
    foreground: 'color',
    background: 'background-color',
    fontStyle: 'font-style',
    shadow: 'box-shadow',
    border: 'border',
}

export default class {
    constructor() {

    }
    loadXml(url) {
        Util.readFile(path.join(window.globalData.dirname, url)).then((data) => {
            let arr = this.parseXmlString(data.toString());
            let css = this.parseCss(arr);
            this.insertCss(css);
        });
    }
    insertCss(css) {
        if (window.globalData.style) {
            window.globalData.style.remove();
        }
        window.globalData.style = document.createElement("style");
        window.globalData.style.type = "text/css";
        window.globalData.style.appendChild(document.createTextNode(css));
        document.getElementsByTagName("head")[0].appendChild(window.globalData.style);
    }
    parseCss(data) {
        let cssText = '';
        let globalSettings = data.globalSettings;
        let editorColor = data.settings[0].settings;
        let background = editorColor.background || '#fff';
        let foreground = editorColor.foreground || '#000';
        let caret = editorColor.foreground || '#000';
        let lineHighlight = editorColor.lineHighlight || 'rgba(0,0,0,0.1)';
        let selection = editorColor.selection || 'rgba(0,0,0,0.1)';
        if (globalSettings) {
            let window = globalSettings.window;
            let active = globalSettings.active;
            let hover = globalSettings.hover;
            let shadow = globalSettings.shadow;
            let border = globalSettings.border;
            let menu = globalSettings.menu;
            let menuBar = globalSettings['menu-bar'];
            let statusBar = globalSettings['status-bar'];
            let sideBar = globalSettings['side-bar'];
            let editorBar = globalSettings['editor-bar'];
            let cmdPanel = globalSettings['cmd-panel'];
            let cmdInput = globalSettings['cmd-input'];
            let autTip = globalSettings['auto-tip'];
            if (window) {
                cssText += _addStyle(window, '.my-window');
            }
            if (active) {
                cssText += _addStyle(active, '.my-active');
            }
            if (hover) {
                cssText += _addStyle(hover, '.my-hover:hover');
            }
            if (shadow) {
                cssText += _addStyle(shadow, '.my-shadow');
            }
            if (border) {
                cssText += _addStyle(border, '.my-border');
            }
            if (menuBar) {
                cssText += _addStyle(menuBar, '.my-menu-bar, .my-menu');
            }
            if (menu) {
                cssText += _addStyle(menu, '.my-menu');
            }
            if (statusBar) {
                cssText += _addStyle(statusBar, '.my-status-bar');
            }
            if (sideBar) {
                cssText += _addStyle(sideBar, '.my-side-bar, .my-auto');
            }
            if (autTip) {
                cssText += _addStyle(autTip, '.my-auto');
            }
            if (editorBar) {
                cssText += _addStyle(editorBar, '.my-editor-bar');
            }
            if (cmdPanel) {
                cssText += _addStyle(cmdPanel, '.my-cmd-panel');
            }
            if (cmdInput) {
                cssText += _addStyle(cmdInput, '.my-cmd-panel input');
            }
        }
        cssText += `.my-right-wrap{background-color:${background};color:${foreground}}\n`;
        cssText += `.my-editor-bar .bar-item.active{background-color:${background};color:${foreground}}\n`;
        cssText += `.my-cursor{background-color:${caret};}\n`;
        cssText += `.my-line.active::after{border-color:${lineHighlight}}\n`;
        cssText += `.my-tab-line{border-left:1px solid ${lineHighlight};}\n`;
        cssText += `.my-select-bg,.my-search-bg{border:1px solid ${foreground};}\n`;
        cssText += `.my-select-bg.active,.my-search-bg.active{background-color:${selection};}\n`;
        cssText += `.my-scroller::-webkit-scrollbar-corner{background-color:${background};}\n`;
        data.settings.slice(1).forEach((item) => {
            if (item.scope) {
                let selector = item.scope.replace(/\s/g, '').split(',').map((_item) => {
                    return '.' + _item;
                }).join(',');
                cssText += `${selector}{`;
                for (let property in item.settings) {
                    cssText += `${propertyMap[property]}:${item.settings[property]};\n`;
                }
                cssText += `}\n`;
            }
        });
        return cssText;

        function _joinStyle(option) {
            let cssText = '';
            for (let property in option) {
                cssText += `${propertyMap[property]}:${option[property]};\n`;
            }
            return cssText;
        }

        function _addStyle(option, selector) {
            let cssText = '';
            cssText += `${selector}{\n`;
            cssText += _joinStyle(option);
            cssText += `}\n`;
            return cssText;
        }
    }
    parseXmlString(xmlStr) {
        let domParser = new DOMParser();
        let xmlDoc = domParser.parseFromString(xmlStr, 'text/xml');
        let result = _xmlToJson(xmlDoc);
        return result[0][0];

        function _xmlToJson(xmlDoc) {
            let result = null;
            let isArr = true;
            if (!xmlDoc.children.length) {
                return xmlDoc.textContent;
            }
            for (let i = 0; i < xmlDoc.children.length - 1; i++) {
                if (xmlDoc.children[i].nodeName !== xmlDoc.children[i + 1].nodeName) {
                    isArr = false;
                    break;
                }
            }
            if (isArr) {
                result = [];
                for (let i = 0; i < xmlDoc.children.length; i++) {
                    let item = xmlDoc.children[i];
                    result.push(_xmlToJson(item));
                }
            } else {
                result = {};
                for (let i = 0; i < xmlDoc.children.length - 1; i++) {
                    let item = xmlDoc.children[i];
                    if (!item.children.length && item.textContent) {
                        result[item.textContent] = _xmlToJson(xmlDoc.children[i + 1]);
                        i++;
                    }
                }
            }
            return result;
        }
    }
}