import Vue from 'vue'
import Router from 'vue-router'
import Home from './components/Home.vue';

Vue.use(Router)

var router = new Router({
    routes: [{
            path: '/home',
            name: 'Home',
            component: Home,
            meta: {
                title: 'my-editor'
            }
        },
        {
            path: '*',
            redirect: '/home'
        }
    ]
})

export default router;