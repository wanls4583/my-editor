/*
 * @Author: lisong
 * @Date: 2022-03-22 23:00:49
 * @Description:
 */
import Util from '../../common/Util';

const require = window.require || window.parent.require || function () {};
const path = require('path');
const propertyMap = {
    foreground: 'color',
    background: 'background-color',
    fontStyle: 'font-style',
    shadow: 'box-shadow',
    border: 'border',
};

export default class {
    constructor() {}
    loadTheme(url) {
        Util.readFile(path.join(window.globalData.dirname, url)).then(
            (data) => {
                let css = '';
                this.insertCss(css);
            }
        );
    }
    insertCss(css) {
        if (window.globalData.style) {
            window.globalData.style.remove();
        }
        window.globalData.style = document.createElement('style');
        window.globalData.style.type = 'text/css';
        window.globalData.style.appendChild(document.createTextNode(css));
        document
            .getElementsByTagName('head')[0]
            .appendChild(window.globalData.style);
    }
}
