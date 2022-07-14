<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
    <div ref="wrap" v-show="menuVisible">
        <Menu :checkable="false" :menuList="menuList" :styles="menuStyle" @change="onMenuChange" ref="menu"></Menu>
    </div>
</template>
<script>
import Menu from './Menu';
import EventBus from '@/event';
import $ from 'jquery';

export default {
    components: {
        Menu,
    },
    data() {
        return {
            list: [],
            menuList: [],
            menuVisible: false,
            menuStyle: {
                left: '10px',
                top: '40px',
            },
        };
    },
    created() {
        this.initEventBus();
    },
    methods: {
        initEventBus() {
            EventBus.$on('close-menu', () => {
                this.menuVisible = false;
            });
        },
        show(e) {
            let $parent = $(this.$refs.wrap).parent();
            this.menuVisible = true;
            this.$nextTick(() => {
                let menuWidth = 0;
                let menuHeight = 0;
                menuWidth = this.$refs.menu.$el.clientWidth;
                menuHeight = this.$refs.menu.$el.clientHeight;
                let offset = $parent.offset();
                if (menuHeight + e.clientY > offset.top + $parent.height()) {
                    this.menuStyle.top = e.clientY - offset.top - menuHeight + 'px';
                } else {
                    this.menuStyle.top = e.clientY - offset.top + 'px';
                }
                this.menuStyle.left = e.clientX - offset.left + 'px';
            });
        },
        onMenuChange(item) {
            switch (item.op) {
            }
            this.menuVisible = false;
        },
    },
};
</script>
