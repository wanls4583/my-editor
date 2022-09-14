<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
	<div @selectstart.prevent class="my-editor-bar" ref="editorBar">
		<div class="bar-scroller my-scroll-overlay my-scroll-mini">
			<div
				:class="[item.active ? 'my-active' : '']"
				:title="item.path"
				@click="onClickItem(item.id)"
				@contextmenu.prevent.stop="onContextmenu($event, item.id)"
				class="bar-item my-hover"
				v-for="item in editorList"
			>
				<div :class="[item.icon]" class="bar-content">
					<span :class="[item.statusColor]">
						<span class="bar-text">{{ item.name }}</span>
						<span class="bar-status" v-if="item.status!=='!!'">{{item.status}}</span>
					</span>
					<div class="bar-icon">
						<span @click.stop="onClose(item.id)" class="bar-close-icon" title="close" v-show="item.saved">
							<i class="my-icon icon-chrome-close"></i>
						</span>
						<span class="bar-dot" v-show="!item.saved"></span>
					</div>
				</div>
			</div>
		</div>
		<editor-bar-menu ref="editorBarMenu"></editor-bar-menu>
	</div>
</template>
<script>
import EditorBarMenu from './EditorBarMenu';
import EventBus from '@/event';
import Util from '@/common/util';
import $ from 'jquery';
import globalData from '@/data/globalData';

const path = window.require('path');

export default {
	name: 'EditorBar',
	components: {
		EditorBarMenu,
	},
	props: {
		editorList: {
			type: Array,
		},
	},
	data() {
		return {
			list: [],
		};
	},
	created() {
		this.initEventBus();
	},
	methods: {
		initEventBus() {
			EventBus.$on('editor-changed', (data) => {
				this.scrollToView();
			});
			EventBus.$on('git-statused', () => {
				for (let i = 0; i < this.editorList.length; i++) {
					let item = this.editorList[i];
					let status = null;
					let statusColor = '';
					status = Util.getFileStatus(item.path);
					statusColor = status.statusColor;
					status = status.status;
					if (item.status !== status) {
						item.status = status;
						item.statusColor = statusColor;
						this.$set(this.editorList, i, item);
					}
				}
			});
			EventBus.$on('file-renamed', (data) => {
				for (let i = 0; i < this.editorList.length; i++) {
					let item = this.editorList[i];
					if (item.path === data.path) {
						item.status = 'D';
						item.statusColor = Util.getFileStatusColor('D');
						this.$set(this.editorList, i, item);
						break;
					}
				}
			});
		},
		
		scrollToView() {
			_scrollToView.call(this);
			setTimeout(() => {
				_scrollToView.call(this);
			}, 300);

			function _scrollToView() {
				let $tab = $(this.$refs.editorBar).find('div.my-active');
				$tab.length && $tab[0].scrollIntoView();
			}
		},
		onClickItem(id) {
			EventBus.$emit('editor-change', { id });
		},
		onClose(id) {
			EventBus.$emit('editor-close', id);
		},
		onContextmenu(e, id) {
			this.$refs.editorBarMenu.show(e, id);
		},
	},
};
</script>