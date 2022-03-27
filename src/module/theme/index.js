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
        let editorColor = data.settings[0].settings;
        let background = editorColor.background || '#fff';
        let foreground = editorColor.foreground || '#000';
        let caret = editorColor.foreground || '#000';
        let lineHighlight = editorColor.lineHighlight || background;
        let selection = editorColor.selection || 'rgba(0,0,0,0.1)';
        cssText += `.my-wrap{background-color:${background};color:${foreground};}\n`;
        cssText += `.my-cursor{background-color:${caret};}\n`;
        cssText += `.my-num.active{background-color:${lineHighlight};}\n`;
        cssText += `.my-select-bg,.my-search-bg{border:1px solid ${foreground};}\n`;
        cssText += `.my-select-bg.active,.my-search-bg.active{background-color:${selection};}\n`;
        cssText += `.my-scroller::-webkit-scrollbar-corner{background-color:${background};}\n`;
        cssText += `.my-right-bar .bar-item.active{background-color:${background};color:${foreground}}`;
        cssText += `.my-auto,.my-tip{background-color:${background};color:${foreground};}\n`;
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