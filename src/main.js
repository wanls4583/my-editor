import Vue from 'vue'
import App from './App.vue'
import router from './router'
import Util from './common/util';
import $ from 'jquery';
import './scss/editor.scss'
import './scss/highlight/js.scss';
import './scss/highlight/html.scss';

Vue.config.productionTip = false
Vue.prototype.$util = Util;
Vue.prototype.$ = $;

new Vue({
  router,
  render: h => h(App),
}).$mount('#app')