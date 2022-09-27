<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
	<div @contextmenu.prevent.stop="onContextmenu" @selectstart.prevent class="my-side-bar" ref="sideBar">
		<div :style="{opacity: opacity}" class="my-height-100" style="overflow: hidden">
			<div class="side-bar-title my-shadow">EXPLORER</div>
			<side-tree ref="tree"></side-tree>
		</div>
		<div class="my-rename-overlay" v-if="renameVisible">
			<input :style="inputStyle" @blur="onBlur" @keydown.enter="onConfirm" @keydown.esc="onCancel" class="my-rename-input" ref="input" spellcheck="false" type="text" v-model="newFileNmme" />
		</div>
	</div>
</template>
<script>
import SideTree from './SideTree';
import globalData from '@/data/globalData';
import EventBus from '@/event';
import $ from 'jquery';

export default {
	components: {
		SideTree,
	},
	data() {
		return {
			newFileNmme: '',
			renameVisible: false,
			inputStyle: {},
			opacity: 1,
		};
	},
	mounted() {
		this.initEvent();
	},
	methods: {
		initEvent() {
			EventBus.$on('file-rename-input', (fileObj) => {
				this.fileObj = fileObj;
				this.newFileNmme = fileObj.name;
				this.renameVisible = true;
				this.opacity = 0.5;
				this.setInputPosition(fileObj.id);
				this.$nextTick(() => {
					setTimeout(() => {
						if (this.$refs.input) {
							this.$refs.input.focus();
							this.$refs.input.select();
						}
					}, 100);
				});
			});
		},
		setInputPosition(id) {
			let $item = $('#' + id);
			let $text = $item.find('.tree-item-text');
			let left = $text.offset().left - 52;
			let top = $item.offset().top - 35;
			this.inputStyle = {
				left: left + 'px',
				top: top + 'px',
				right: 0,
			};
		},
		confirmInput() {
			const path = window.require('path');
			if (this.newFileNmme && this.newFileNmme != this.fileObj.name) {
				if (this.fileObj.path) {
					EventBus.$emit('file-rename', this.fileObj.path, this.newFileNmme);
				} else {
					let filePath = path.join(this.fileObj.parentPath, this.newFileNmme);
					if (this.fileObj.type === 'dir') {
						EventBus.$emit('folder-create', filePath);
					} else {
						EventBus.$emit('file-create', filePath);
					}
				}
			} else if (!this.fileObj.path) {
				this.$refs.tree.render();
			}
			this.onCancel();
		},
		onBlur() {
			this.confirmInput();
		},
		onConfirm() {
			this.confirmInput();
		},
		onCancel() {
			this.newFileNmme = '';
			this.renameVisible = false;
			this.opacity = 1;
		},
		onContextmenu(e) {},
	},
};
</script>
