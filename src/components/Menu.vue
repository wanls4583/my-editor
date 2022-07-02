<!--
 * @Author: lisong
 * @Date: 2021-12-24 11:00:11
 * @Description: 
-->
<template>
	<div
		:style="styles"
		@mousedown.stop
		@mouseenter="showScrollBar"
		@mouseleave="hideScrollBar"
		@mousemove="showScrollBar"
		@wheel.stop="onWheel"
		class="my-menu my-shadow my-border"
		ref="scroller"
		v-show="myMenuList.length"
	>
		<div :style="{height: menuHeight + 'px'}" class="my-menu-scroller">
			<div :style="{ top: -deltaTop + 'px' }" class="my-menu-content" ref="content">
				<template v-for="item in renderList">
					<div :class="{'my-active': checkable && item.checked, disabled: item.disabled,}" @mousedown="onClick(item)" @mouseover="onHover(item)" class="my-menu-item my-center-between my-hover">
						<div class="my-menu-left">
							<span :class="[item.icon]"></span>
							<span class="my-menu-title">{{ item.name }}</span>
							<span class="my-menu-desc">{{ item.desc }}</span>
						</div>
						<div class="flex--center--start">
							<div class="my-menu-shortcut" v-if="item.shortcut">
								<span v-if="item.shortcut != 'ignore'">{{ item.shortcut }}</span>
							</div>
							<span class="my-icon my-icon-check" v-if="item.selected"></span>
						</div>
					</div>
					<div class="my-separator" v-if="item.groupEnd"></div>
				</template>
			</div>
			<v-scroll-bar :class="{'my-scroll-visible': scrollVisible}" :height="contentHeight" :scroll-top="scrollTop" @scroll="onScroll"></v-scroll-bar>
		</div>
	</div>
</template>
<script>
import VScrollBar from './VScrollBar.vue';
import $ from 'jquery';

export default {
	name: 'Menu',
	props: {
		menuList: {
			type: Array,
			default: [],
		},
		styles: {
			type: Object,
		},
		checkable: {
			type: Boolean,
			default: true,
		},
		hoverCheck: {
			type: Boolean,
			default: false,
		},
		value: {
			type: [Number, String, Array],
		},
		top: {
			type: Number,
			default: 0,
		},
	},
	components: {
		VScrollBar,
	},
	data() {
		return {
			index: -1,
			itemHeight: 30,
			menuHeight: 0,
			contentHeight: 0,
			deltaTop: 0,
			scrollTop: 0,
			startLine: 1,
			maxVisibleLines: 1,
			scrollVisible: false,
			myMenuList: [],
			groupList: [],
		};
	},
	watch: {
		menuList() {
			this.initMenu();
		},
		value(newVal) {
			this.setChecked(newVal);
		},
		index() {
			this.$nextTick(() => {
				this.scrollToIndex();
			});
		},
		scrollTop() {
			this.$emit('scroll', this.scrollTop);
		},
		top() {
			this.setStartLine(this.checkScrollTop(this.top));
		},
	},
	created() {
		this.initMenu();
	},
	mounted() {
		this.keydownFn = (e) => {
			if (this.$refs.content.clientHeight) {
				if (e.keyCode === 38) {
					this.setCheckedByIndex(this.index - 1);
				} else if (e.keyCode === 40) {
					this.setCheckedByIndex(this.index + 1);
				} else if (e.keyCode === 13) {
					if (this.index > -1) {
						this.onClick(this.myMenuList[this.index]);
					}
				}
			}
		};
		$(window).on('keydown', this.keydownFn);
	},
	destroyed() {
		$(window).unbind('keydown', this.keydownFn);
	},
	methods: {
		initMenu() {
			let index = -1;
			let menuList = this.menuList;
			this.index = -1;
			if (menuList[0] && !(menuList[0] instanceof Array)) {
				menuList = [menuList];
			}
			this.myMenuList = [];
			this.groupList = menuList.map((group, gIndex) => {
				let newGroup = [];
				group.forEach((item, iIndex) => {
					index++;
					item = Object.assign({}, item);
					item.group = newGroup;
					item.value = item.value === undefined ? item.name : item.value;
					if (this.value instanceof Array) {
						item.selected = item.value === this.value[gIndex];
					} else {
						item.selected = item.value === this.value;
					}
					if (menuList.length === 1) {
						item.checked = item.selected;
						item.selected = false;
					}
					if (iIndex === group.length - 1 && gIndex < menuList.length - 1) {
						item.groupEnd = true;
					}
					if (item.checked && this.index === -1) {
						this.index = index;
					}
					newGroup.push(item);
					this.myMenuList.push(item);
				});
				return newGroup;
			});
			this.contentHeight = this.myMenuList.length * this.itemHeight + 11 * (menuList.length - 1);
			this.menuHeight = this.contentHeight;
			this.menuHeight = this.menuHeight > 500 ? 500 : this.menuHeight;
			this.maxVisibleLines = Math.ceil(500 / this.itemHeight) + 1;
			this.setStartLine(this.checkScrollTop(this.top));
		},
		render() {
			this.renderList = this.myMenuList.slice(this.startLine - 1, this.startLine - 1 + this.maxVisibleLines);
		},
		scrollToIndex() {
			let scrollTop = this.index * this.itemHeight - this.menuHeight / 2;
			if (scrollTop > this.contentHeight - this.menuHeight) {
				scrollTop = this.contentHeight - this.menuHeight;
			} else if (scrollTop < 0) {
				scrollTop = 0;
			}
			this.setStartLine(scrollTop);
		},
		showScrollBar() {
			this.scrollVisible = true;
		},
		hideScrollBar() {
			this.scrollVisible = false;
		},
		checkScrollTop(scrollTop) {
			if (scrollTop > this.contentHeight - this.menuHeight) {
				scrollTop = this.contentHeight - this.menuHeight;
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
		setChecked(value) {
			if (value === undefined) {
				return;
			}
			let index = -1;
			this.index = -1;
			this.groupList.forEach((group, i) => {
				group.forEach((item) => {
					if (this.value instanceof Array) {
						item.selected = item.value === this.value[i];
					} else {
						item.selected = item.value === this.value;
					}
					if (this.menuList.length === 1) {
						item.checked = item.selected;
						item.selected = false;
					}
					index++;
					if (item.checked && this.index === -1) {
						this.index = index;
					}
				});
			});
			this.myMenuList.splice();
		},
		setCheckedByIndex(index) {
			if (index < 0) {
				index = this.myMenuList.length - 1;
			} else if (index > this.myMenuList.length - 1) {
				index = 0;
			}
			this.clearChecked();
			this.myMenuList[index].checked = true;
			this.index = index;
			this.myMenuList.splice();
		},
		clearChecked() {
			this.myMenuList.forEach((item) => {
				item.checked = false;
			});
		},
		onClick(item) {
			if (item.disabled) {
				return;
			}
			this.clearChecked();
			item.checked = true;
			this.$emit('change', item);
		},
		onHover(item) {
			this.hoverCheck && this.setChecked(item.value);
		},
		onWheel(e) {
			this.scrollDeltaY = e.deltaY;
			if (this.scrollDeltaY && !this.wheelTask) {
				this.wheelTask = globalData.scheduler.addUiTask(() => {
					if (this.scrollDeltaY) {
						try {
							let scrollTop = this.scrollTop + this.scrollDeltaY;
							this.onScroll(this.checkScrollTop(scrollTop));
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
