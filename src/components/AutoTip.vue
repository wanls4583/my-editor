<!--
 * @Author: lisong
 * @Date: 2021-12-24 11:00:11
 * @Description: 
-->
<template>
	<div :style="styles" @mousedown.stop class="my-editor-auto">
		<div class="my-editor-auto-group" v-for="group in tipList">
			<div :class="{active: item.active}" @mousedown="onClick(item, group)" class="my-editor-auto-item" v-for="item in group">
				<div class="my-editor-auto-icon"></div>
				<div class="my-editor-auto-content">
					<span v-html="_html(item)"></span>
				</div>
			</div>
		</div>
	</div>
</template>
<script>
export default {
    name: 'AutoTip',
    props: {
        tipList: {
            type: Array,
            default: []
        },
        styles: {
            type: Object
        },
    },
    data() {
        return {
        }
    },
    computed: {
        _html() {
            return (item) => {
                let index = 0;
                let html = '';
                item.indexs.forEach((_index) => {
                    html += item.result.slice(index, _index);
                    html += `<span class="match-char">${item.result[_index]}</span>`;
                    index = _index + 1;
                });
                return html + item.result.slice(index);
            }
        }
    },
    created() {
    },
    methods: {
        onClick(item, group) {
            group.forEach((item) => {
                item.checked = false;
            });
            item.checked = true;
            this.$emit('change', item);
        }
    }
}
</script>