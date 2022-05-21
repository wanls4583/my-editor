import Vue from 'vue';
import App from './App.vue';
import axios from 'axios';
import 'xterm/css/xterm.css';
import './scss/index.scss';

Vue.config.productionTip = false;
Vue.prototype.$http = axios.create({
	timeout: 1000 * 30,
	withCredentials: true,
	headers: {
		'Content-Type': 'application/json; charset=utf-8',
	},
});

new Vue({
	render: h => h(App),
}).$mount('#app');
