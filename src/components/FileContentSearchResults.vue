<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
	<div @scroll="onScroll" class="results-tree-warp my-scroll-overlay my-scroll-small test123 test123" ref="wrap">
		<div style="width: 100%; overflow: hidden">
			<div :style="{ height: _scrollHeight }" class="results-tree">
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
								<span class="my-search-lines" v-if="item.texts && item.texts.length > 1">+{{ item.texts.length }}</span>
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

export default {
	name: 'FileContentSearchResults',
	props: {
		list: {
			type: Array,
		},
	},
	data() {
		return {
			itemHeight: 30,
			itemPadding: 16,
			openedList: [],
			renderList: [],
			startLine: 1,
			maxVisibleLines: 100,
		};
	},
	computed: {
		_top() {
			return (this.startLine - 1) * this.itemHeight + 'px';
		},
		_scrollHeight() {
			return this.openedList.length * this.itemHeight + 'px';
		},
		_paddingLeft() {
			return function (item) {
				return item.deep * this.itemPadding + 'px';
			};
		},
	},
	watch: {
		list() {
			this.openedList = [];
			this.renderList = [];
			this.openedList = this.getRenderList(this.list, 0);
			this.render();
		},
	},
	created() {
		this.openedList = this.getRenderList(this.list, 0);
		this.initEventBus();
	},
	mounted() {
		this.render();
	},
	methods: {
		initEventBus() {
			EventBus.$on('icon-changed', () => {
				this.openedList.forEach((item) => {
					item.icon = '';
				});
				this.render();
			});
			EventBus.$on('theme-changed', () => {
				this.openedList.forEach((item) => {
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
			this.maxVisibleLines = Math.ceil(this.$refs.wrap.clientHeight / this.itemHeight) + 1;
			this.renderList = this.openedList.slice(this.startLine - 1, this.startLine - 1 + this.maxVisibleLines);
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
		},
		sortFileList(results) {
			return results;
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
				let _text = item.texts[0].trimRight();
				let start = item.range.start;
				let end = item.range.end;
				let res = null;
				html = _text.slice(0, start.column).slice(-20).trimLeft();
				res = /[^0-9a-zA-Z\s]/.exec(html);
				html = (res && html.slice(res.index + 1)) || html;
				text = html;
				html = Util.htmlTrans(html);
				if (item.texts.length > 1) {
					let plain = _text.slice(start.column);
					text += plain;
					html += `<span class="search-results-bg">${Util.htmlTrans(plain)}</span>`;
				} else {
					let plain = _text.slice(start.column, end.column);
					text += plain;
					html += `<span class="search-results-bg">${Util.htmlTrans(plain)}</span>`;
					plain = _text.slice(end.column);
					text += plain;
					html += Util.htmlTrans(plain);
				}
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
				for (let i = index; i < this.openedList.length; i++) {
					let item = this.openedList[i];
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
						let index = this.openedList.indexOf(item);
						this.openedList = this.openedList
							.slice(0, index + 1)
							.concat(this.getRenderList(item.children, item.deep))
							.concat(this.openedList.slice(index + 1));
					} else {
						let index = this.openedList.indexOf(item) + 1;
						let endIn = index;
						while (endIn < this.openedList.length && this.openedList[endIn].path === item.path) {
							endIn++;
						}
						this.openedList.splice(index, endIn - index);
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
