import Vue from 'vue';
import App from './App.vue';
import 'xterm/css/xterm.css';
import './scss/index.scss';

Vue.config.productionTip = false;

new Vue({
	render: h => h(App),
}).$mount('#app');