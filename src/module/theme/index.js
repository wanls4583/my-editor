/*
 * @Author: lisong
 * @Date: 2022-03-22 23:00:49
 * @Description:
 */
import Util from '../../common/Util';
import defaultLightColors from './default-color/light';
import defaultDarkColors from './default-color/dark';
import defaultContrastLightColors from './default-color/contrast-light';
import defaultContrastDarkColors from './default-color/contrast-dark';

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
        switch (type) {
            case 'light':
                Object.assign(result.colors, defaultLightColors);
                break;
            case 'dark':
                Object.assign(result.colors, defaultDarkColors);
                break;
            case 'contrast light':
                Object.assign(result.colors, defaultContrastLightColors);
                break;
            case 'contrast dark':
                Object.assign(result.colors, defaultContrastDarkColors);
                break;
        }
        return _loadTheme(url).then(() => {
            let css = '';
            result.colors['tab.activeBackground'] =
                result.colors['tab.activeBackground'] || result.colors['editor.background'];
            result.colors['editorIndentGuide.background'] =
                result.colors['editorIndentGuide.background'] || result.colors['editorWhitespace.foreground'];
            result.colors['editorIndentGuide.activeBackground'] =
                result.colors['editorIndentGuide.activeBackground'] || result.colors['editorWhitespace.foreground'];
            result.colors['menu.background'] = result.colors['menu.background'] || result.colors['dropdown.background'];
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
        let scopeNameClassMap = {};
        if (data.colors) {
            css += ':root{\n';
            for (let key in data.colors) {
                css += `--my-${key.replace(/\./g, '-')}: ${data.colors[key]};\n`;
            }
            css += '}\n';
        }
        if (data.tokenColors) {
            data.tokenColors.forEach((token) => {
                let selector = '';
                if (token.scope instanceof Array) {
                    selector = [];
                    token.scope.forEach((scope) => {
                        selector.push(`.my-scope-${scopeId}`);
                        scopeNameClassMap[scope] = `my-scope-${scopeId}`;
                        scopeId++;
                    });
                    selector = selector.join(',');
                } else {
                    selector = `.my-scope-${scopeId}`;
                    scopeNameClassMap[token.scope] = `my-scope-${scopeId}`;
                    scopeId++;
                }
                css += `${selector}{\n`;
                for (let prop in token.settings) {
                    css += `${settingMap[prop]}:${token.settings[prop]}\n`;
                }
                css += '}\n';
            });
        }
        window.globalData.scopeNameClassMap = scopeNameClassMap;
        return css;
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
}
