<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
	<div @contextmenu.prevent.stop="onContextmenu" @selectstart.prevent class="my-editor-right-bar" ref="rightBar">
		<div :class="{'active':item.active}" :title="item.path" @click="onClickItem(item)" class="bar-item my-editor-hover-bg" v-for="item in editorList">
			<span class="bar-text">{{item.name}}</span>
			<div class="bar-icon">
				<span @click.stop="onClose(item)" class="bar-close-icon iconfont icon-close1" title="close" v-show="item.saved"></span>
				<span class="bar-dot" v-show="!item.saved"></span>
			</div>
		</div>
		<editor-bar-menu ref="editorBarMenu"></editor-bar-menu>
	</div>
</template>
<script>
import $ from 'jquery';
import EditorBarMenu from './EditorBarMenu';

export default {
    name: 'EditorBar',
    components: {
        EditorBarMenu
    },
    props: {
        editorList: {
            type: Array
        }
    },
    data() {
        return {
            list: [],
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
            this.$refs.editorBarMenu.show(e);
        },
        closeAllMenu() {
            this.$refs.editorBarMenu.hide();
        },
    }
}
</script>