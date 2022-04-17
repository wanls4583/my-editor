import Vue from 'vue';
import App from './App.vue';
import router from './router';
import axios from 'axios';
import './scss/index.scss';
const require = window.require || window.parent.require || function () {};
const remote = require('@electron/remote');
const path = require('path');
const dirname = remote.app.getAppPath();

Vue.config.productionTip = false;
Vue.prototype.$http = axios.create({
    timeout: 1000 * 30,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json; charset=utf-8',
    },
});

window.globalData = {
    dirname: dirname,
    scopeIdMap: {},
    scopeReg: null,
    colors: {},
    nowTheme: {
        value: 'Default Dark+',
        type: 'dark',
        path: path.join(dirname , '/extensions/theme-defaults/themes/dark_plus.json')
    },
    nowIconTheme: {
        value: 'vs-seti',
        path: path.join(dirname , '/extensions/theme-seti/icons/vs-seti-icon-theme.json')
    },
    themes: [],
    iconThemes: [],
    languageList: [],
    scopeFileList: [],
};

new Vue({
    router,
    render: (h) => h(App),
}).$mount('#app');
