<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
	<div @contextmenu.prevent="onContextmenu" @selectstart.prevent class="my-editor-right-bar" ref="rightBar">
		<div :class="{'active':item.active}" :title="item.path" @click="onClickItem(item)" class="bar-item my-editor-hover-bg" v-for="item in editorList">
			<span class="bar-text">{{item.name}}</span>
			<div class="bar-icon">
				<span @click.stop="onClose(item)" class="bar-close-icon iconfont icon-close1" title="close" v-show="item.saved"></span>
				<span class="bar-dot" v-show="!item.saved"></span>
			</div>
		</div>
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
    props: {
        editorList: {
            type: Array
        }
    },
    data() {
        return {
            list: [],
            menuList: [
            ],
            menuVisible: false,
            menuStyle: {
                left: '10px',
                top: '40px'
            }
        }
    },
    provide() {
        return {
            rootList: this.list,
        }
    },
    mounted() {
    },
    methods: {
        onClickItem(item) {
            this.$emit('change', item.id);
        },
        onClose(item) {
            this.$emit('close', item.id);
        },
        onContextmenu(e) {
            this.menuVisible = true;
            let $rightBar = $(this.$refs.rightBar);
            this.$nextTick(() => {
                let offset = $rightBar.offset();
                let menuWidth = this.$refs.menu.$el.clientWidth;
                if (menuWidth + e.clientX > offset.left + $rightBar[0].clientWidth) {
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
        closeAllMenu() {
            this.menuVisible = false;
        },
    }
}
</script>