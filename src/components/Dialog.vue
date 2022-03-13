<!--
 * @Author: lisong
 * @Date: 2021-12-24 11:00:11
 * @Description: 
-->
<template>
	<div :style="styles" @mousedown.stop class="my-editor-dialog">
		<div class="dialog-title">
			<div v-html="title"></div>
			<span @click="onClose" class="dialog-close iconfont icon-close1"></span>
		</div>
		<div class="dialog-content">
			<div>
				<div v-html="content"></div>
			</div>
		</div>
		<div class="dialog-btns">
			<div @click="onClickBtn(item)" class="dialog-btn" v-for="item in btns">{{item.name}}</div>
			<div @click="onClose()" class="dialog-btn">取消</div>
		</div>
	</div>
</template>
<script>
export default {
    name: 'Dialog',
    props: {
        title: String,
        content: String,
        btns: Array,
        styles: Object
    },
    data() {
        return {
        }
    },
    created() {
    },
    methods: {
        onClickBtn(item) {
            item.callback();
        },
        onClose() {
            this.$emit('close');
        }
    }
}
</script>