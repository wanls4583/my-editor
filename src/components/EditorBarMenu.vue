<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
	<div ref="wrap">
		<Menu :checkable="false" :menuList="menuList" :styles="menuStyle" @change="onMenuChange" ref="menu" v-show="menuVisible"></Menu>
	</div>
</template>
<script>
import $ from 'jquery';
import Menu from './Menu';

export default {
    name: 'EditorBar',
    components: {
        Menu
    },
    data() {
        return {
            menuList: [
            ],
            menuVisible: false,
            menuStyle: {
                left: '10px',
                top: '40px'
            }
        }
    },
    mounted() {
    },
    methods: {
        show(e) {
            this.menuVisible = true;
            let $parent = $(this.$refs.wrap).parent();
            this.$nextTick(() => {
                let offset = $parent.offset();
                let menuWidth = this.$refs.menu.$el.clientWidth;
                if (menuWidth + e.clientX > offset.left + $parent[0].clientWidth) {
                    this.menuStyle.left = e.clientX - offset.left - menuWidth + 'px';
                } else {
                    this.menuStyle.left = e.clientX - offset.left + 'px';
                }
                this.menuStyle.top = e.clientY - offset.top + 'px';
            });
        },
        onMenuChange(item) {
            switch (item.op) {

            }
            this.menuVisible = false;
        },
        hide() {
            this.menuVisible = false;
        },
    }
}
</script>