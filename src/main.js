import Vue from 'vue'
import App from './App.vue'
import router from './router'
import Util from './common/util';
import './scss/editor.scss'

Vue.config.productionTip = false
Vue.prototype.$util = Util;

new Vue({
  router,
  render: h => h(App),
}).$mount('#app')