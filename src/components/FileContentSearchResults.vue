<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
	<div @mouseenter="showScrollBar" @mouseleave="hideScrollBar" @mousemove="showScrollBar" @scroll="onScroll" @wheel.stop="onWheel" class="my-results-scroller" ref="wrap">
		<div :style="{ top: -deltaTop + 'px' }" class="my-results-content">
			<div @click.stop="onClickItem(item)" class="tree-item" v-for="item in renderList">
				<div
					:class="[item.active ? 'my-active' : '']"
					:style="{ 'padding-left': _paddingLeft(item) }"
					:title="item.deep === 1 ? item.path : item.text"
					@contextmenu.stop.prevent
					class="tree-item-title my-center-start"
				>
					<template v-if="item.deep === 1">
						<span class="my-icon icon-chevron-down" v-if="item.open"></span>
						<span class="my-icon icon-chevron-right" v-else></span>
					</template>
					<div :class="[item.icon]" class="tree-item-content my-center-start">
						<span class="tree-item-text" style="margin-left: 4px" v-html="item.html"></span>
						<span class="my-search-count" v-if="item.deep === 1">{{ item.children.length }}</span>
					</div>
				</div>
			</div>
		</div>
		<v-scroll-bar :class="{'my-scroll-visible': scrollVisible}" :height="treeHeight" :scroll-top="scrollTop" @scroll="onScroll" class="my-scroll-small"></v-scroll-bar>
	</div>
</template>
<script>
import VScrollBar from './VScrollBar.vue';
import EventBus from '@/event';
import Util from '@/common/util';
import globalData from '@/data/globalData';

let preActiveItem = null;
let openedList = [];

export default {
	name: 'FileContentSearchResults',
	data() {
		return {
			itemHeight: 30,
			itemPadding: 16,
			renderList: [],
			startLine: 1,
			scrollTop: 0,
			deltaTop: 0,
			treeHeight: 0,
			maxVisibleLines: 100,
			scrollVisible: false,
		};
	},
	components: {
		VScrollBar,
	},
	computed: {
		_paddingLeft() {
			return function (item) {
				return item.deep * this.itemPadding + 'px';
			};
		},
	},
	created() {
		this.initEventBus();
	},
	mounted() {
		this.domHeight = this.$refs.wrap.clientHeight;
		this.maxVisibleLines = Math.ceil(this.domHeight / this.itemHeight) + 1;
		this.render();
		this.initResizeEvent();
	},
	methods: {
		initResizeEvent() {
			const resizeObserver = new ResizeObserver((entries) => {
				if (this.$refs.wrap && this.$refs.wrap.clientHeight) {
					this.domHeight = this.$refs.wrap.clientHeight;
					this.maxVisibleLines = Math.ceil(this.domHeight / this.itemHeight) + 1;
					this.setStartLine(this.checkScrollTop(this.scrollTop));
				}
			});
			resizeObserver.observe(this.$refs.wrap);
		},
		initEventBus() {
			EventBus.$on('icon-changed', () => {
				openedList.forEach((item) => {
					item.icon = '';
				});
				this.render();
			});
			EventBus.$on('theme-changed', () => {
				openedList.forEach((item) => {
					item.icon = '';
				});
				this.render();
			});
			EventBus.$on('editor-changed', (data) => {
				let path = data && data.path;
				if (path && !(preActiveItem && preActiveItem.path === path)) {
					if (preActiveItem) {
						preActiveItem.active = false;
					}
					this.focusItem(path);
				} else if (!path && preActiveItem) {
					preActiveItem.active = false;
					preActiveItem = null;
				}
			});
		},
		showScrollBar() {
			this.scrollVisible = true;
		},
		hideScrollBar() {
			this.scrollVisible = false;
		},
		render() {
			cancelAnimationFrame(this.renderTimer);
			this.renderTimer = requestAnimationFrame(() => {
				this.renderList = openedList.slice(this.startLine - 1, this.startLine - 1 + this.maxVisibleLines);
				this.renderList.forEach((item) => {
					if (globalData.nowIconData && item.deep == 1) {
						item.icon = Util.getIconByPath({
							filePath: item.path,
							fileType: 'file',
						});
						item.icon = item.icon ? `my-file-icon my-file-icon-${item.icon}` : '';
					}
					if (!item.html) {
						let obj = this.getHtml(item);
						item.html = obj.html;
						item.text = obj.text;
					}
				});
			});
		},
		addResults(results) {
			results.forEach((item) => {
				Object.freeze(item.children);
			});
			openedList = openedList.concat(this.getRenderList(results, 0));
			this.setTreeHeight();
			this.setStartLine(this.checkScrollTop(this.scrollTop));
		},
		clear() {
			openedList = [];
			this.setTreeHeight();
			this.setStartLine(this.checkScrollTop(this.scrollTop));
		},
		focusItem(path) {
			let index = 0;
			_findItem.call(this, path);

			function _findItem(path) {
				for (let i = index; i < openedList.length; i++) {
					let item = openedList[i];
					if (item.path === path) {
						let scrollTop = this.itemHeight * i - this.domHeight / 2;
						if (scrollTop > this.treeHeight - this.domHeight) {
							scrollTop = this.treeHeight - this.domHeight;
						} else if (scrollTop < 0) {
							scrollTop = 0;
						}
						this.setStartLine(scrollTop);
						if (!item.active) {
							this.onClickItem(item);
						}
						break;
					} else if (path.startsWith(item.path)) {
						if (!item.open) {
							index = i + 1;
							this.onClickItem(item).then(() => {
								_findItem.call(this, path);
							});
							break;
						}
					}
				}
			}
		},
		checkScrollTop(scrollTop) {
			if (scrollTop > this.treeHeight - this.domHeight) {
				scrollTop = this.treeHeight - this.domHeight;
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
		setTreeHeight() {
			this.treeHeight = openedList.length * this.itemHeight;
		},
		getRenderList(list, deep) {
			let results = [];
			_loopList(list, deep);
			return results;

			function _loopList(list, deep) {
				list.forEach((item) => {
					item.deep = deep + 1;
					results.push(item);
					if (item.open && item.children.length) {
						_loopList(item.children, item.deep);
					}
				});
			}
		},
		getHtml(item) {
			let html = '';
			let text = '';
			if (item.deep === 1) {
				html = item.name;
			} else {
				text = item.text;
				html = item.html;
			}
			return {
				html: html,
				text: text,
			};
		},
		onClickItem(item) {
			if (!item.active) {
				if (preActiveItem) {
					preActiveItem.active = false;
				}
				item.active = true;
				preActiveItem = item;
			}
			if (item.deep == 1) {
				item.open = !item.open;
				_changOpen.call(this, item);
			} else if (item.deep > 1) {
				EventBus.$emit('file-open', item);
			}
			return Promise.resolve();

			function _changOpen(item) {
				if (item.children.length) {
					if (item.open) {
						let index = openedList.indexOf(item);
						openedList = openedList
							.slice(0, index + 1)
							.concat(this.getRenderList(item.children, item.deep))
							.concat(openedList.slice(index + 1));
					} else {
						let index = openedList.indexOf(item) + 1;
						let endIn = index;
						while (endIn < openedList.length && openedList[endIn].path === item.path) {
							endIn++;
						}
						openedList.splice(index, endIn - index);
					}
					this.setTreeHeight();
					this.setStartLine(this.checkScrollTop(this.scrollTop));
				}
			}
		},
		onWheel(e) {
			this.scrollDeltaY = e.deltaY;
			if (this.scrollDeltaY && !this.wheelTask) {
				this.wheelTask = globalData.scheduler.addUiTask(() => {
					if (this.scrollDeltaY) {
						try {
							let scrollTop = this.scrollTop + this.scrollDeltaY;
							this.setStartLine(this.checkScrollTop(scrollTop));
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
