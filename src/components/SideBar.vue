<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
	<div @contextmenu.prevent.stop="onContextmenu" @selectstart.prevent class="my-editor-side-bar" ref="sideBar">
		<div class="side-bar-title"></div>
		<div class="side-tree-warp">
			<div style="width:100%;overflow:hidden">
				<side-tree :list="list"></side-tree>
			</div>
		</div>
		<SideBarMenu ref="sideBarMenu"></SideBarMenu>
	</div>
</template>
<script>
import SideTree from './SideTree';
import SideBarMenu from './SideBarMenu';

export default {
    components: {
        SideTree,
        SideBarMenu
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
        onContextmenu(e) {
            // this.$refs.sideBarMenu.show(e);
        },
        closeAllMenu() {
            this.$refs.sideBarMenu.hide();
        },
    }
}
</script>