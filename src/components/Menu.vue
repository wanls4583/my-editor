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
		v-show="allMenuList.length"
	>
		<div :style="{height: menuHeight + 'px'}" class="my-menu-scroller">
			<div :style="{ top: -deltaTop + 'px' }" class="my-menu-content" ref="content">
				<template v-for="item in renderList">
					<div :class="{'my-active': checkable && item.active, disabled: item.disabled,}" @mousedown="onClick(item)" @mouseover="onHover(item)" class="my-menu-item my-center-between my-hover">
						<div class="my-menu-left">
							<span class="my-menu-left-select" v-if="leftSelect">
								<span class="my-icon my-icon-check" v-if="item.selected"></span>
							</span>
							<span :class="[item.icon]"></span>
							<span class="my-menu-title" v-html="item._name" v-if="item._name"></span>
							<span class="my-menu-title" v-else>{{item.name}}</span>
							<span class="my-menu-desc" v-html="item._desc" v-if="item._desc"></span>
							<span class="my-menu-desc" v-else>{{item.desc}}</span>
						</div>
						<div class="my-center-start">
							<div class="my-menu-shortcut" v-if="item.shortcut">
								<span v-if="item.shortcut != 'ignore'">{{ item.shortcut }}</span>
							</div>
							<span class="my-icon my-icon-check" style="margin-left:15px" v-if="item.selected&&!leftSelect"></span>
						</div>
					</div>
					<div class="my-separator" v-if="item.seprator"></div>
				</template>
			</div>
			<v-scroll-bar :class="{'my-scroll-visible': scrollVisible}" :height="contentHeight" :scroll-top="scrollTop" @scroll="onScroll"></v-scroll-bar>
		</div>
	</div>
</template>
<script>
import VScrollBar from './VScrollBar.vue';
import Util from '@/common/util';
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
		leftSelect: {
			type: Boolean,
			default: false,
		},
		checkable: {
			type: Boolean,
			default: true,
		},
		hoverCheck: {
			type: Boolean,
			default: false,
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
			groups: 0,
			scrollVisible: false,
			allMenuList: [],
			renderList: [],
		};
	},
	watch: {
		menuList() {
			this.initMenu();
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
			if (this.top !== this.scrollTop) {
				this.setStartLine(this.checkScrollTop(this.top));
			}
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
						this.onClick(this.allMenuList[this.index]);
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
			this.groups = 0;
			this.index = -1;
			this.allMenuList = [];
			this.originMenuList = [];
			if (menuList[0] && !(menuList[0] instanceof Array)) {
				menuList = [menuList];
			}
			menuList.forEach((group, gIndex) => {
				for (let i = 0; i < group.length; i++) {
					let item = group[i];
					let renderObj = {
						name: item.name,
						desc: item.desc,
						icon: item.icon,
						shortcut: item.shortcut,
						selected: item.selected,
						active: item.active,
						nameIndexs: item.nameIndexs,
						descIndexs: item.descIndexs,
						index: ++index,
					};
					if (i === group.length - 1 && gIndex < menuList.length - 1) {
						renderObj.seprator = true;
					}
					if (item.active && this.index === -1) {
						this.index = index;
					}
					this.allMenuList.push(renderObj);
					this.originMenuList.push(item);
				}
				this.groups++;
			});
			this.setTreeHeight();
			this.setStartLine(this.checkScrollTop(this.top));
		},
		render() {
			this.renderList = this.allMenuList.slice(this.startLine - 1, this.startLine - 1 + this.maxVisibleLines);
			this.renderList.forEach((item) => {
				if (item.desc && !item._desc) {
					item._desc = Util.getMatchHtml(item.desc, item.descIndexs || []);
				}
				if (item.nameIndexs && item.nameIndexs.length && !item._name) {
					item._name = Util.getMatchHtml(item.name, item.nameIndexs);
				}
			});
		},
		setMenuList(list) {
			this.allMenuList = list;
			this.originMenuList = list;
			this.groups = 1;
			this.setTreeHeight();
			this.setStartLine(this.checkScrollTop(this.top));
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
		setTreeHeight() {
			this.contentHeight = this.allMenuList.length * this.itemHeight + 11 * (this.groups - 1);
			this.menuHeight = this.contentHeight;
			this.menuHeight = this.menuHeight > 500 ? 500 : this.menuHeight;
			this.maxVisibleLines = Math.ceil(500 / this.itemHeight) + 1;
		},
		setStartLine(scrollTop) {
			this.startLine = Math.floor(scrollTop / this.itemHeight) + 1;
			this.scrollTop = scrollTop;
			this.deltaTop = scrollTop % this.itemHeight;
			this.render();
		},
		setCheckedByIndex(index) {
			if (index < 0) {
				index = this.allMenuList.length - 1;
			} else if (index > this.allMenuList.length - 1) {
				index = 0;
			}
			this.clearChecked();
			this.allMenuList[index].active = true;
			this.index = index;
			this.render();
		},
		clearChecked() {
			this.allMenuList.forEach((item) => {
				item.active = false;
			});
		},
		onClick(item) {
			if (item.disabled) {
				return;
			}
			this.setCheckedByIndex(item.index);
			this.$emit('change', this.originMenuList[item.index]);
		},
		onHover(item) {
			if (this.hoverCheck && this.checkable) {
				this.setCheckedByIndex(item.index);
			}
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
