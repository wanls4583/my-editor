/*
 * @Author: lisong
 * @Date: 2022-03-22 23:00:49
 * @Description: 
 */
import Vue from 'vue';
const propertyMap = {
    foreground: 'color',
    background: 'background-color',
    fontStyle: 'font-style'
}

export default class {
    constructor() {

    }
    loadXml(url) {
        return Vue.prototype.$http({
            url: url,
            method: 'get'
        }).then((data) => {
            let arr = this.parseXmlString(data.data);
            let css = this.parseCss(arr);
            this.insertCss(css);
        });
    }
    insertCss(css) {
        if (this.style) {
            this.style.remove();
        }
        this.style = document.createElement("style");
        this.style.type = "text/css";
        this.style.appendChild(document.createTextNode(css));
        document.getElementsByTagName("head")[0].appendChild(this.style);
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
        cssText += `.my-window{background-color:${background};color:${foreground};}\n`;
        cssText += `.my-auto,.my-tip,.my-menu,.my-cmd-panel{background-color:${background};color:${foreground};}\n`;
        cssText += `.my-editor-bar .bar-item.active{background-color:${background};color:${foreground}}\n`;
        cssText += `.my-cursor{background-color:${caret};}\n`;
        cssText += `.my-line.active::before,.my-line.active::after{background-color:${lineHighlight}}\n`;
        cssText += `.my-tab-line{border-left:1px solid ${lineHighlight};}\n`;
        cssText += `.my-select-bg,.my-search-bg{border:1px solid ${foreground};}\n`;
        cssText += `.my-select-bg.active,.my-search-bg.active{background-color:${selection};}\n`;
        cssText += `.my-scroller::-webkit-scrollbar-corner{background-color:${background};}\n`;
        if (globalSettings) {
            let menu = globalSettings.menu;
            let menuBar = globalSettings.menuBar;
            let statusBar = globalSettings.statusBar;
            let sideBar = globalSettings.sideBar;
            if (menu) {
                cssText += `.my-menu .my-light-bg{\n`;
                cssText += _joinStyle(menu);
                cssText += `}\n`;
            }
            if (menuBar) {
                cssText += `.my-menu-bar .my-light-bg{\n`;
                cssText += _joinStyle(menuBar);
                cssText += `}\n`;
            }
            if (statusBar) {
                cssText += `.my-status-bar .my-light-bg{\n`;
                cssText += _joinStyle(statusBar);
                cssText += `}\n`;
            }
            if (sideBar) {
                cssText += `.my-sider-bar .my-light-bg{\n`;
                cssText += _joinStyle(sideBar);
                cssText += `}\n`;
            }
        }
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
            let text = '';
            if (option.background) {
                text += `background-color:${option.background};`;
            }
            if (option.foreground) {
                text += `color:${option.foreground};`;
            }
            return text;
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