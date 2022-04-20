const require = window.require || window.parent.require || function () {};
const remote = require('@electron/remote');
const path = require('path');
const dirname = remote.app.getAppPath();

const globalData = {
    dirname: dirname,
    scopeIdMap: {},
    scopeReg: null,
    colors: {},
    nowTheme: {
        value: 'Default Dark+',
        type: 'dark',
        path: path.join(dirname, '/extensions/theme-defaults/themes/dark_plus.json'),
    },
    nowIconTheme: {
        value: 'vs-seti',
        path: path.join(dirname, '/extensions/theme-seti/icons/vs-seti-icon-theme.json'),
    },
    nowIconData: {},
    themes: [],
    iconThemes: [],
    languageList: [],
    scopeFileList: [],
    grammars: {},
};

export default globalData;