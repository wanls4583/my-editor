<!--
 * @Author: lisong
 * @Date: 2021-12-24 11:00:11
 * @Description: 
-->
<template>
	<div :style="styles" @mouseup.stop class="my-editor-panel">
		<div class="my-editor-menu-group" v-for="group in menuList">
			<div
				:class="{checked: checkable && item.checked, disabled: item.disabled}"
				@mouseup="onClick(item, group)"
				class="my-editor-menu-item"
				v-for="item in group"
			>
				<div class="my-editor-menu-content">{{item.name}}</div>
				<div class="my-editor-menu-shortcut" v-if="item.shortcut">{{item.shortcut}}</div>
			</div>
		</div>
	</div>
</template>
<script>
export default {
    name: 'Panel',
    props: {
        menuList: {
            type: Array,
            default: []
        },
        styles: {
            type: Object
        },
        checkable: {
            type: Boolean,
            default: true
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
            if (item.disabled) {
                return;
            }
            group.map((item) => {
                item.checked = false;
            });
            item.checked = true;
            this.$emit('change', item);
        }
    }
}
</script>