<!--
 * @Author: lisong
 * @Date: 2021-12-24 11:00:11
 * @Description: 
-->
<template>
	<div>
		<div class="my-editor-dialog-overlay" v-if="overlay"></div>
		<div :style="styles" @mousedown.stop class="my-editor-dialog">
			<div class="dialog-title">
				<div v-html="title"></div>
				<span @click="onClose" class="dialog-close iconfont icon-close1"></span>
			</div>
			<div class="dialog-content">
				<span :class="[icon]" :style="{'color':iconColor}" class="iconfont" style="margin-right:5px;font-size:30px" v-if="icon"></span>
				<div>
					<div v-html="content"></div>
				</div>
			</div>
			<div class="dialog-btns">
				<div @click="onClickBtn(item)" class="dialog-btn" v-for="item in btns">{{item.name}}</div>
				<div @click="onClose()" class="dialog-btn">取消</div>
			</div>
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
        overlay: Boolean,
        styles: Object,
        icon: String,
        iconColor: String,
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