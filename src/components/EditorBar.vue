<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
	<div @selectstart.prevent class="my-editor-bar" ref="editorBar">
		<div class="bar-scroller my-scroll-overlay my-scroll-mini">
			<div :class="[item.active ? 'my-active' : '']" :title="item.path" @click="onClickItem(item.id)" @contextmenu.prevent.stop="onContextmenu($event, item.id)" class="bar-item my-hover" v-for="item in editorList">
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
	import Context from '@/module/context/index';
	import EventBus from '@/event';
	import Util from '@/common/util';
	import $ from 'jquery';
	import globalData from '@/data/globalData';

	const contexts = Context.contexts;
	const path = window.require('path');
	const fs = window.require('fs');

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
			this.checkStatus();
		},
		methods: {
			initEventBus() {
				EventBus.$on('editor-changed', (data) => {
					this.scrollToView();
				});
			},
			checkStatus() {
				this.editorList.forEach((tab, index) => {
					if (tab.path) {
						if (!fs.existsSync(tab.path)) {
							tab.status = 'D';
							tab.statusColor = Util.getFileStatusColor('D');
							this.$set(this.editorList, index, tab);
							EventBus.$emit('file-removed', tab.path);
						} else {
							let status = null;
							let statusColor = '';
							status = Util.getFileStatus(tab.path);
							statusColor = status.statusColor;
							status = status.status;
							if (tab.status !== status) {
								tab.status = status;
								tab.statusColor = statusColor;
								this.$set(this.editorList, index, tab);
							}
							let stat = fs.statSync(tab.path);
							// 文件改变后与当前打开内容不一致
							if (tab.saved && tab.mtimeMs !== stat.mtimeMs) {
								Util.readFile(tab.path).then(text => {
									if (contexts[tab.id].getAllText() !== text.replace(/\r\n/g, '\n')) {
										contexts[tab.id].reload(text);
										EventBus.$emit('file-saved', tab.path);
										tab.saved = true;
									}
								});
							}
						}
					}
				});
				setTimeout(() => {
					this.checkStatus();
				}, 1000);
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
				EventBus.$emit('editor-change', {
					id
				});
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