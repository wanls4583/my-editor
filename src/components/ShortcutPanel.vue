<!--
 * @Author: lisong
 * @Date: 2021-12-24 11:00:11
 * @Description: 
-->
<template>
	<div @mousedown.stop @mouseenter="showScrollBar" @mouseleave="hideScrollBar" @mousemove="showScrollBar" @wheel.stop="onWheel" class="my-shortcut-panel" ref="wrap">
		<div class="my-shortcut-search">
			<input @input="search" ref="searchInput" spellcheck="false" type="text" v-model="searchText" />
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
				<div :class="[item.active?'my-active':'']" :id="item.id" @click="onClickItem(item)" class="my-shortcut-item" v-for="item in renderList">
					<span class="edit-col">
						<i @click="onEdit(item)" class="my-icon my-icon-edit"></i>
					</span>
					<span class="command-col">{{item.label}}</span>
					<span class="key-col">{{item.key}}</span>
					<span class="when-col">{{item.when}}</span>
					<span class="source-col">{{item.source}}</span>
				</div>
			</div>
			<v-scroll-bar :class="{'my-scroll-visible': scrollVisible}" :height="contentHeight" :scroll-top="scrollTop" @scroll="onScroll"></v-scroll-bar>
		</div>
		<div class="my-shortcut-overlay" v-if="editVisible">
			<div class="my-shortcut-edit">
				<div class="edit-tip">Press desired key combination and then press ENTER</div>
				<input @keydown="onKeydown" @keyup="onKeyup" @blur="onBlur" ref="input" spellcheck="false" type="text" v-model="key" />
			</div>
		</div>
	</div>
</template>
<script>
import vkeys from 'vkeys';
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
			editVisible: false,
			startLine: 1,
			maxVisibleLines: 100,
			domHeight: 0,
			deltaTop: 0,
			searchText: '',
			key: '',
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
		this.keys = [];
		this.cKeys = ['Ctrl', 'Alt', 'Shift'];
		this.prevKeyStr = '';
		EventBus.$on('shortcut-loaded', (data) => {
			this.list = globalData.shortcut.getAllKeys();
			this.setStartLine(this.checkScrollTop(this.scrollTop));
		});
	},
	mounted() {
		this.domHeight = this.$refs.wrap.clientHeight;
		this.maxVisibleLines = Math.ceil(this.domHeight / this.itemHeight) + 1;
		this.list = globalData.shortcut.getAllKeys();
		this.initResizeEvent();
		this.render();
		this.focus();
	},
	destroyed() {
		cancelAnimationFrame(this.focusTimer);
		globalData.scheduler.removeUiTask(this.wheelTask);
	},
	methods: {
		initResizeEvent() {
			const resizeObserver = new ResizeObserver((entries) => {
				if (this.$refs.scroller && this.$refs.scroller.clientHeight) {
					this.domHeight = this.$refs.scroller.clientHeight;
					this.maxVisibleLines = Math.ceil(this.domHeight / this.itemHeight) + 1;
					this.setStartLine(this.checkScrollTop(this.scrollTop));
					this.focus();
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
		focus() {
			cancelAnimationFrame(this.focusTimer);
			this.focusTimer = requestAnimationFrame(() => {
				this.$refs.searchInput.focus();
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
			let list = globalData.shortcut.getAllKeys();
			if (this.searchText) {
				let results = [];
				list.forEach((item) => {
					let m = Util.fuzzyMatch(this.searchText, item.command, true) ||
						Util.fuzzyMatch(this.searchText, item.key, true);
					if (m) {
						results.push({ item: item, score: m.score });
					}
				});
				results.sort((a, b) => {
					return b.score - a.score;
				});
				this.list = results.map((item) => {
					return item.item;
				});
			} else {
				this.list = list;
			}
			this.setStartLine(0);
		},
		confirmEdit() {
			let obj = {
				key: this.key,
				command: this.editItem.command
			};
			this.editItem.key = this.key;
			this.editVisible = false;
			this.render();
			globalData.shortcut.initUserKeyMap([obj]);
			EventBus.$emit('shortcut-change', obj);
		},
		formatKey(key) {
			key = key.replace('+', 'Add');
			key = key[0].toUpperCase() + key.slice(1);
			return key;
		},
		onClickItem(item) {
			for (let i = 0; i < this.list.length; i++) {
				this.list[i].active = false;
			}
			item.active = true;
			this.render();
		},
		onEdit(item) {
			this.editItem = item;
			this.key = '';
			this.prevKeyStr = '';
			this.editVisible = true;
			this.$nextTick(() => {
				this.$refs.input.focus();
			});
		},
		onKeydown(e) {
			let key = this.formatKey(vkeys.getKey(e.keyCode));
			let command = '';
			let keyStr = '';
			e.preventDefault();
			e.stopPropagation();
			if (key === 'Escape') { //退出编辑
				this.editVisible = false;
				return;
			}
			if (key === 'Enter' || key === 'Numenter') {
				if (this.keys.length === 0) { //编辑完成
					this.confirmEdit();
					return;
				}
			}
			keyStr = this.keys.join('+');
			keyStr = keyStr ? keyStr + '+' + key : key;
			if (this.prevKeyStr) {
				this.key = this.prevKeyStr + ' ' + keyStr;
				this.prevKeyStr = '';
			} else {
				this.key = keyStr;
				if (this.cKeys.indexOf(key) === -1) {
					this.prevKeyStr = keyStr;
				} else {
					this.prevKeyStr = '';
				}
			}
			if (this.keys.indexOf(key) === -1) {
				this.keys.push(key);
			}
		},
		onKeyup(e) {
			let index = -1;
			let key = this.formatKey(vkeys.getKey(e.keyCode));
			e.preventDefault();
			e.stopPropagation();
			index = this.keys.indexOf(key);
			this.keys.splice(index, 1);
		},
		onBlur() {
			this.editVisible = false;
		},
		onWheel(e) {
			if(this.editVisible) {
				return;
			}
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