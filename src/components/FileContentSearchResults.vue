<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
	<div @scroll="onScroll" class="results-tree-warp my-scroll-overlay my-scroll-small test123 test123" ref="wrap">
		<div style="width: 100%; overflow: hidden">
			<div :style="{ height: scrollHeight }" class="results-tree">
				<div :style="{ top: _top }" class="results-tree-content">
					<div @click.stop="onClickItem(item)" class="tree-item" v-for="item in renderList">
						<div
							:class="[item.active ? 'my-active' : '']"
							:style="{ 'padding-left': _paddingLeft(item) }"
							:title="item.deep === 1 ? item.path : item.text"
							@contextmenu.stop.prevent
							class="tree-item-title my-center-start"
						>
							<template v-if="item.deep === 1">
								<span class="left-icon iconfont icon-down1" v-if="item.open"></span>
								<span class="left-icon iconfont icon-right" v-else></span>
							</template>
							<div :class="[item.icon]" class="tree-item-content my-center-start">
								<span class="tree-item-text" style="margin-left: 4px" v-html="item.html"></span>
								<span class="my-search-count" v-if="item.deep === 1">{{ item.children.length }}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
<script>
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
			maxVisibleLines: 100,
			scrollHeight: '0px',
		};
	},
	computed: {
		_top() {
			return (this.startLine - 1) * this.itemHeight + 'px';
		},
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
		this.render();
		this.initResizeEvent();
	},
	methods: {
		initResizeEvent() {
			const resizeObserver = new ResizeObserver((entries) => {
				if (this.$refs.wrap && this.$refs.wrap.clientHeight) {
					this.render();
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
		render() {
			cancelAnimationFrame(this.renderTimer);
			this.renderTimer = requestAnimationFrame(() => {
				this.maxVisibleLines = Math.ceil(this.$refs.wrap.clientHeight / this.itemHeight) + 1;
				this.renderList = openedList.slice(this.startLine - 1, this.startLine - 1 + this.maxVisibleLines);
				this.renderList.forEach((item) => {
					if (globalData.nowIconData && item.deep == 1) {
						item.icon = Util.getIconByPath({
							iconData: globalData.nowIconData,
							filePath: item.path,
							fileType: 'file',
							themeType: globalData.nowTheme.type,
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
			openedList = openedList.concat(this.getRenderList(results, 0));
			this.scrollHeight = openedList.length * this.itemHeight + 'px';
			this.render();
		},
		clear() {
			openedList = [];
			this.scrollHeight = '0px';
			this.render();
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
		focusItem(path) {
			let index = 0;
			_findItem.call(this, path);

			function _findItem(path) {
				for (let i = index; i < openedList.length; i++) {
					let item = openedList[i];
					if (item.path === path) {
						let wrap = this.$refs.wrap;
						let scrollTop = wrap.scrollTop;
						let clientHeight = wrap.clientHeight;
						let height = (i + 1) * this.itemHeight;
						if (scrollTop + clientHeight < height) {
							wrap.scrollTop = height - clientHeight;
						} else if (scrollTop + this.itemHeight > height) {
							wrap.scrollTop = height - this.itemHeight;
						}
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
					this.render();
				}
			}
		},
		onScroll(e) {
			let scrollTop = e.target.scrollTop;
			this.startLine = Math.floor(scrollTop / this.itemHeight) + 1;
			this.render();
		},
	},
};
</script>
