<!--
 * @Author: lisong
 * @Date: 2021-12-24 11:00:11
 * @Description: 
-->
<template>
	<div @mousedown.stop @mouseenter="showScrollBar" @mouseleave="hideScrollBar" @mousemove="showScrollBar" @wheel.stop="onWheel" class="my-shortcut-panel" ref="wrap">
		<div class="my-shortcut-search">
			<input @input="search" @keydown.enter="search" ref="input" spellcheck="false" type="text" v-model="searchText" />
		</div>
		<div class="my-shortcut-title">
			<span class="edit-col"></span>
			<span class="command-col">Command</span>
			<span class="key-col">Keybinding</span>
			<span class="when-col">When</span>
			<span class="source-col">Source</span>
		</div>
		<div class="my-shortcut-scoller" ref="scroller">
			<div :style="{ top: -deltaTop + 'px' }" class="my-shortcut-content">
				<div :class="[item.active?'my-active':'']" :id="item.id" @click.stop="onClickItem(item)" class="my-shortcut-item" v-for="item in renderList">
					<span class="edit-col">
						<i class="my-icon my-icon-edit"></i>
					</span>
					<span class="command-col">{{item.command}}</span>
					<span class="key-col">{{item.key}}</span>
					<span class="when-col">{{item.when}}</span>
					<span class="source-col">{{item.source}}</span>
				</div>
			</div>
			<v-scroll-bar :class="{'my-scroll-visible': scrollVisible}" :height="contentHeight" :scroll-top="scrollTop" @scroll="onScroll"></v-scroll-bar>
		</div>
	</div>
</template>
<script>
import VScrollBar from './VScrollBar.vue';
import Util from '@/common/util';
import EventBus from '@/event';
import globalData from '@/data/globalData';

export default {
	name: 'ShortcutPanel',
	components: {
		VScrollBar
	},
	data() {
		return {
			itemHeight: 30,
			scrollTop: 0,
			scrollVisible: false,
			startLine: 1,
			maxVisibleLines: 100,
			domHeight: 0,
			deltaTop: 0,
			searchText: '',
			value: '',
			list: [],
			renderList: [],
		};
	},
	computed: {
		contentHeight() {
			return this.list.length * this.itemHeight;
		}
	},
	created() {
	},
	mounted() {
		this.domHeight = this.$refs.wrap.clientHeight;
		this.maxVisibleLines = Math.ceil(this.domHeight / this.itemHeight) + 1;
		this.list = globalData.shortcut.getAllKeys();
		this.initResizeEvent();
		this.render();
	},
	destroyed() {
		globalData.scheduler.removeUiTask(this.wheelTask);
	},
	methods: {
		initResizeEvent() {
			const resizeObserver = new ResizeObserver((entries) => {
				if (this.$refs.scroller && this.$refs.scroller.clientHeight) {
					this.domHeight = this.$refs.scroller.clientHeight;
					this.maxVisibleLines = Math.ceil(this.domHeight / this.itemHeight) + 1;
					this.setStartLine(this.checkScrollTop(this.scrollTop));
				}
			});
			resizeObserver.observe(this.$refs.scroller);
		},
		render() {
			cancelAnimationFrame(this.renderTimer);
			this.renderTimer = requestAnimationFrame(() => {
				this.renderList = this.list.slice(this.startLine - 1, this.startLine - 1 + this.maxVisibleLines);
			});
		},
		showScrollBar() {
			this.scrollVisible = true;
		},
		hideScrollBar() {
			this.scrollVisible = false;
		},
		checkScrollTop(scrollTop) {
			if (scrollTop > this.contentHeight - this.domHeight) {
				scrollTop = this.contentHeight - this.domHeight;
			}
			scrollTop = scrollTop < 0 ? 0 : scrollTop;
			return scrollTop;
		},
		setStartLine(scrollTop) {
			this.startLine = Math.floor(scrollTop / this.itemHeight) + 1;
			this.scrollTop = scrollTop;
			this.deltaTop = scrollTop % this.itemHeight;
			this.render();
		},
		search() {

		},
		onClickItem(item) {
			for (let i = 0; i < this.list.length; i++) {
				this.list[i].active = this.list[i].command === item.command;
			}
			this.render();
		},
		onWheel(e) {
			this.scrollDeltaY = e.deltaY;
			if (this.scrollDeltaY && !this.wheelTask) {
				this.wheelTask = globalData.scheduler.addUiTask(() => {
					if (this.scrollDeltaY) {
						try {
							let scrollTop = this.scrollTop + this.scrollDeltaY;
							if (scrollTop > this.contentHeight - this.domHeight) {
								scrollTop = this.contentHeight - this.domHeight;
							}
							scrollTop = scrollTop < 0 ? 0 : scrollTop;
							this.onScroll(scrollTop);
						} catch (e) {
							console.log(e);
						}
						this.scrollDeltaY = 0;
					} else {
						globalData.scheduler.removeUiTask(this.wheelTask);
						this.wheelTask = null;
					}
				});
			}
		},
		onScroll(e) {
			this.setStartLine(e);
		},
	},
};
</script>