<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
	<div @contextmenu.prevent @selectstart.prevent class="my-editor-side-bar">
		<div class="my-editor-side-title">OPEN FILES</div>
		<side-tree :list="list"></side-tree>
	</div>
</template>
<script>
import SideTree from './SideTree';
export default {
    components: {
        SideTree
    },
    data() {
        return {
            list: [{
                name: '目录',
                type: 'dir',
                open: false,
                active: false,
                children: [{
                    name: '子目录1',
                    type: 'dir',
                    active: false,
                    open: false
                }]
            }, {
                name: '文件',
                type: 'file',
                active: false,
            }]
        }
    },
    provide() {
        return {
            rootList: this.list
        }
    },
    mounted() {
    },
    methods: {

    }
}
</script>>