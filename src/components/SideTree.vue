<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
	<div @scroll="onScroll" class="side-tree-warp my-scroll-overlay my-scroll-small" ref="wrap">
		<div style="width: 100%; overflow: hidden">
			<div :style="{ height: _scrollHeight }" class="side-tree">
				<div :style="{ top: _top }" class="side-tree-content">
					<div @click.stop="onClickItem(item)" class="tree-item" v-for="item in renderList">
						<div
							:class="[item.active ? 'my-active' : '']"
							:style="{ 'padding-left': _paddingLeft(item) }"
							:title="item.path"
							@contextmenu.stop.prevent="onContextmenu($event, item)"
							class="tree-item-title my-center-start"
						>
							<template v-if="item.type === 'dir'">
								<span class="left-icon iconfont icon-down1" v-if="item.open"></span>
								<span class="left-icon iconfont icon-right" v-else></span>
							</template>
							<div :class="[item.icon]" class="tree-item-content my-center-start">
								<span class="tree-item-text" style="margin-left: 4px">{{ item.name }}</span>
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

const fs = window.require('fs');
const path = window.require('path');

let preActiveItem = null;

export default {
	name: 'SideTree',
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
			watchPathMap: {},
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
		this.maxVisibleLines = Math.ceil(this.$refs.wrap.clientHeight / this.itemHeight) + 1;
		this.render();
	},
	destroyed() {
		for (let key in this.watchPathMap) {
			this.watchPathMap[key].close();
		}
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
			this.renderList = this.openedList.slice(this.startLine - 1, this.startLine - 1 + this.maxVisibleLines);
			this.renderList.forEach((item) => {
				if (globalData.nowIconData) {
					item.icon = Util.getIconByPath({
						iconData: globalData.nowIconData,
						filePath: item.path,
						themeType: globalData.nowTheme.type,
						fileType: item.type,
						opened: item.open,
						isRoot: !item.parentPath,
					});
					item.icon = item.icon ? `my-file-icon my-file-icon-${item.icon}` : '';
				}
			});
		},
		createItems(dirPath, files) {
			let results = [];
			files.forEach((item, index) => {
				let fullPath = path.join(dirPath, item);
				let state = fs.statSync(fullPath);
				let obj = {
					name: item,
					path: fullPath,
					parentPath: dirPath,
					active: false,
					children: [],
				};
				if (state.isFile()) {
					obj.type = 'file';
				} else {
					obj.type = 'dir';
					obj.open = false;
				}
				results.push(obj);
			});
			return this.sortFileList(results);
		},
		readdir(dirPath) {
			return new Promise((resolve) => {
				// 异步读取目录内容
				fs.readdir(dirPath, { encoding: 'utf8' }, (err, files) => {
					if (err) {
						throw err;
					}
					resolve(this.createItems(dirPath, files));
				});
			});
		},
		readdirSync(dirPath) {
			let files = fs.readdirSync(dirPath, { encoding: 'utf8' });
			return this.createItems(dirPath, files);
		},
		refreshDir(item) {
			let pathMap = {};
			let list = this.readdirSync(item.path);
			item.children.forEach((item) => {
				pathMap[item.path] = item;
			});
			item.children = list.map((item) => {
				if (pathMap[item.path]) {
					return pathMap[item.path];
				}
				return item;
			});
			if (item.open) {
				this.closeFolder(item);
				this.openFolder(item);
			}
			this.render();
		},
		closeFolder(item) {
			let index = this.openedList.indexOf(item) + 1;
			let endIn = index;
			while (endIn < this.openedList.length && this.openedList[endIn].parentPath != item.parentPath) {
				endIn++;
			}
			this.openedList.splice(index, endIn - index);
		},
		openFolder(item) {
			let index = this.openedList.indexOf(item);
			this.openedList = this.openedList
				.slice(0, index + 1)
				.concat(this.getRenderList(item.children, item.deep))
				.concat(this.openedList.slice(index + 1));
		},
		watchFolder(item) {
			const dirPath = item.path;
			this.watchFolderTimer = this.watchFolderTimer || {};
			if (!this.watchPathMap[dirPath]) {
				fs.watch(dirPath, (event, filename) => {
					if (event === 'rename') {
						clearTimeout(this.watchFolderTimer[dirPath]);
						this.watchFolderTimer[dirPath] = setTimeout(() => {
							this.refreshDir(item);
						}, 100);
					}
				});
			}
		},
		sortFileList(results) {
			results.sort((a, b) => {
				if (a.type === 'dir' && b.type === 'file') {
					return -1;
				} else if (a.type === 'file' && b.type === 'dir') {
					return 1;
				} else if (a.name > b.name) {
					return 1;
				} else if (a.name < b.name) {
					return -1;
				} else {
					return 0;
				}
			});
			return results;
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
		onClickItem(item) {
			if (!item.active) {
				if (preActiveItem) {
					preActiveItem.active = false;
				}
				item.active = true;
				preActiveItem = item;
				globalData.nowFileItem = item;
				if (item.type === 'dir') {
					item.open = !item.open;
					if (!item.loaded) {
						return this.readdir(item.path).then((data) => {
							item.children = data;
							item.loaded = true;
							data.forEach((_item) => {
								_item.parent = item;
								_item.deep = item.deep + 1;
							});
							this.watchFolder(item);
							_changOpen.call(this, item);
						});
					} else {
						_changOpen.call(this, item);
					}
				} else {
					EventBus.$emit('file-open', item);
				}
			} else if (item.type === 'dir') {
				item.open = !item.open;
				_changOpen.call(this, item);
			}
			return Promise.resolve();

			function _changOpen(item) {
				if (item.children.length) {
					if (item.open) {
						this.openFolder(item);
					} else {
						this.closeFolder(item);
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
		onContextmenu(e, item) {
			this.$parent.$refs.sideTreeMenu.show(e, item);
		},
	},
};
</script>
