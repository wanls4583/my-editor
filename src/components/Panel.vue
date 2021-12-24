<!--
 * @Author: lisong
 * @Date: 2021-12-24 11:00:11
 * @Description: 
-->
<template>
	<div :style="styles" @click.stop class="my-editor-panel">
		<div class="my-editor-menu-group" v-for="group in menuList">
			<div :class="{checked: item.checked}" @click="onClick(item, group)" class="my-editor-menu-item" v-for="item in group">
				<div class="my-editor-menu-content">{{item.name}}</div>
			</div>
		</div>
	</div>
</template>
<script>
export default {
    name: 'Home',
    props: {
        menuList: {
            type: Array,
            default: []
        },
        styles: {
            type: Object
        }
    },
    data() {
        return {
        }
    },
    created() {
    },
    methods: {
        onClick(item, group) {
            group.map((item) => {
                item.checked = false;
            });
            item.checked = true;
            this.$emit('change', item);
        }
    }
}
</script>