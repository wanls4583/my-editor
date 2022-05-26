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
					<span :class="[item.status]" class="bar-text">{{ item.name }}</span>
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
			this.shortcut.onKeyDown(e);
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
					let fileObj = Util.getFileItemByPath(globalData.fileTree, item.path) || {};
					let fileStatus = globalData.fileStatus[fileObj.rootPath] || {};
					let untracked = fileStatus.untracked || {};
					let added = fileStatus.added || {};
					let conflicted = fileStatus.conflicted || {};
					let modified = fileStatus.modified || {};
					let deleted = fileStatus.deleted || {};
					item.status = '';
					if (untracked[item.relativePath]) {
						item.status = 'my-status-untracked';
					} else if (added[item.relativePath]) {
						item.status = 'my-status-added';
					} else if (conflicted[item.relativePath]) {
						item.status = 'my-status-conflicted';
					} else if (modified[item.relativePath]) {
						item.status = 'my-status-modified';
					} else if (deleted[item.relativePath]) {
						item.status = 'my-status-deleted';
					}
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