<!--
 * @Author: lisong
 * @Date: 2021-12-24 11:00:11
 * @Description: 
-->
<template>
	<div :style="styles" @mousedown.stop class="my-menu my-light-bg" v-show="visible">
		<div class="my-light-bg">
			<div class="my-menu-group" v-for="group in menuList">
				<div
					:class="{checked: checkable && item.checked, disabled: item.disabled}"
					@mousedown="onClick(item, group)"
					class="my-menu-item my-center-between my-clickable"
					v-for="item in group"
				>
					<div class="my-center-between">
						<div class="my-menu-title">{{item.name}}</div>
						<div class="my-menu-shortcut" v-if="item.shortcut">{{item.shortcut}}</div>
					</div>
					<div class="my-menu-content">{{item.content}}</div>
				</div>
			</div>
		</div>
	</div>
</template>
<script>
export default {
    name: 'Menu',
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
        },
        value: {
            type: [Number, String]
        }
    },
    data() {
        return {
        }
    },
    computed: {
        visible() {
            let visible = false;
            for (let i = 0; i < this.menuList.length; i++) {
                if (this.menuList[i].length) {
                    return true;
                }
            }
            return false;
        }
    },
    watch: {
        value(newVal) {
            this.setChecked(newVal);
        }
    },
    created() {
        this.setChecked(this.value);
    },
    methods: {
        onClick(item, group) {
            if (item.disabled) {
                return;
            }
            group.forEach((item) => {
                item.checked = false;
            });
            item.checked = true;
            this.$emit('change', item);
        },
        setChecked(value) {
            this.menuList.forEach((group) => {
                group.forEach((item) => {
                    item.checked = item.value == value;
                });
            });
        }
    }
}
</script>