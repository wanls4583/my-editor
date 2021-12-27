import Vue from 'vue'
import App from './App.vue'
import router from './router'
import './scss/editor.scss'
import './scss/highlight/js.scss';
import './scss/highlight/html.scss';
import './scss/highlight/css.scss';

Vue.config.productionTip = false

new Vue({
  router,
  render: h => h(App),
}).$mount('#app')