import Vue from 'vue'
import Router from 'vue-router'
import Window from './components/Window.vue';

Vue.use(Router)

var router = new Router({
    routes: [{
            path: '/',
            name: 'Window',
            component: Window,
            meta: {
                title: 'my-editor'
            }
        },
        {
            path: '*',
            redirect: '/'
        }
    ]
})

export default router;