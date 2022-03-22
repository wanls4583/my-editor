import Vue from 'vue'
import App from './App.vue'
import router from './router'
import axios from 'axios'
import './scss/index.scss'

Vue.config.productionTip = false
Vue.prototype.$http = axios.create({
  timeout: 1000 * 30,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json; charset=utf-8'
  }
});
window.contexts = {};

new Vue({
  router,
  render: h => h(App),
}).$mount('#app')