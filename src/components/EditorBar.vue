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
						<span style="margin-left:10px">{{item.status}}</span>
					</span>
					<div class="bar-icon">
						<span @click.stop="onClose(item.id)" class="bar-close-icon iconfont icon-close" title="close" v-show="item.saved"></span>
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
import ShortCut from '@/module/shortcut/editor-bar';
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
	provide() {
		return {
			rootList: this.list,
		};
	},
	created() {
		this.shortcut = new ShortCut(this);
		this.initEventBus();
		$(window).on('keydown', (e) => {
			this.shortcut.onKeydown(e);
		});
	},
	methods: {
		initEventBus() {
			EventBus.$on('editor-changed', (data) => {
				this.$nextTick(() => {
					let $tab = $(this.$refs.editorBar).find('div.my-active');
					$tab.length && $tab[0].scrollIntoView();
				});
			});
			EventBus.$on('git-statused', () => {
				this.editorList.forEach((item) => {
					if (item.rootPath) {
						item.status = Util.getFileStatus(globalData.fileStatus, item.relativePath, item.rootPath);
					} else {
						item.status = Util.getFileStatus(globalData.fileStatus, item.path);
					}
					item.statusColor = item.status.statusColor;
					item.status = item.status.status;
				});
			});
		},
		onClickItem(id) {
			EventBus.$emit('editor-change', id);
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