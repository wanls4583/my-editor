<!--
 * @Author: lisong
 * @Date: 2021-12-24 11:00:11
 * @Description: 
-->
<template>
	<div ref="wrap" v-show="menuVisible">
		<Menu :checkable="false" :menuList="menuList" :styles="menuStyle" @change="onMenuChange" ref="menu"></Menu>
	</div>
</template>
<script>
import Menu from './Menu.vue';
import $ from 'jquery';

export default {
    name: 'WindowMenu',
    components: {
        Menu
    },
    props: {
        styles: {
            type: Object
        },
    },
    data() {
        return {
            menuList: [
            ],
            menuVisible: false,
            menuStyle: {
                left: '50%',
                top: '50%'
            }
        }
    },
    created() {
    },
    methods: {
        onMenuChange(item) {
            switch (item.op) {

            }
            this.menuVisible = false;
        },
        show(e) {
            this.menuVisible = true;
            this.$nextTick(() => {
                let $parent = $(this.$refs.wrap).parent();
                let offset = $parent.offset();
                let menuWidth = this.$refs.menu.$el.clientWidth;
                let menuHeight = this.$refs.menu.$el.clientHeight;
                if (menuHeight + e.clientY > offset.top + $parent[0].clientHeight) {
                    this.menuStyle.top = e.clientY - offset.top - menuHeight + 'px';
                } else {
                    this.menuStyle.top = e.clientY - offset.top + 'px';
                }
                if (menuWidth + e.clientX > offset.left + $parent[0].clientWidth) {
                    this.menuStyle.left = e.clientX - offset.left - menuWidth + 'px';
                } else {
                    this.menuStyle.left = e.clientX - offset.left + 'px';
                }
            });
        },
        hide() {
            this.menuVisible = false;
        },
    },
}
</script>