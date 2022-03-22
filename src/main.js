import Vue from 'vue'
import App from './App.vue'
import router from './router'
import './scss/index.scss'

Vue.config.productionTip = false
window.contexts = {};

new Vue({
  router,
  render: h => h(App),
}).$mount('#app')