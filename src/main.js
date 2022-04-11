import Vue from 'vue';
import App from './App.vue';
import router from './router';
import axios from 'axios';
import './scss/index.scss';
const require = window.require || window.parent.require || function () {};
const path = require('path');
const dirname = 'public/';

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
    nowTheme: {
        value: 'Dark+ (default dark)',
        type: 'dark',
        path: dirname + 'themes/theme-defaults/themes/dark_plus.json'
    },
    themes: [],
    languageList: [],
    scopeFileList: [],
};

new Vue({
    router,
    render: (h) => h(App),
}).$mount('#app');
