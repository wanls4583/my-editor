<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
	<div @wheel.stop="onWheel" class="side-tree-warp" ref="wrap">
		<div class="side-tree">
			<div :style="{ top: -deltaTop + 'px' }" class="side-tree-content">
				<div :id="item.id" @click.stop="onClickItem(item)" class="tree-item" v-for="item in renderList">
					<div
						:class="[item.active ? 'my-active' : '', cutPath === item.path ? 'tree-item-cut' : '']"
						:style="{ 'padding-left': _paddingLeft(item) }"
						:title="item.path"
						@contextmenu.stop.prevent="onContextmenu($event, item)"
						class="tree-item-title my-center-start"
					>
						<template v-if="item.type === 'dir'">
							<span class="left-icon iconfont icon-down1" v-if="item.open"></span>
							<span class="left-icon iconfont icon-right" v-else></span>
						</template>
						<div :class="[item.icon, item.statusColor]" class="tree-item-content my-center-start">
							<div class="my-center-between" style="width:100%;overflow:hidden">
								<span class="tree-item-text">{{item.name}}</span>
								<span style="margin:0 5px 0 10px;flex-shrink:0" v-if="item.type === 'file'">{{item.status}}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
		<v-scroll-bar :height="treeHeight" :scroll-top="scrollTop" @scroll="onScroll" class="my-scroll-small"></v-scroll-bar>
	</div>
</template>
<script>
import VScrollBar from './VScrollBar.vue';
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
	components: {
		VScrollBar,
	},
	data() {
		return {
			itemHeight: 30,
			itemPadding: 20,
			openedList: [],
			renderList: [],
			watchIdMap: {},
			startLine: 1,
			maxVisibleLines: 100,
			cutPath: '',
			scrollTop: 0,
			treeHeight: 0,
			domHeight: 0,
			deltaTop: 0,
		};
	},
	computed: {
		_paddingLeft() {
			return function (item) {
				return item.deep * this.itemPadding - 10 + 'px';
			};
		},
	},
	watch: {
		list() {
			this.openedList = [];
			this.renderList = [];
			this.openedList = this.getRenderList(this.list, 0);
			this.initFileStatus();
			this.watchFolder();
			this.render();
		},
		openedList() {
			this.setTreeHeight();
		},
	},
	created() {
		this.openedList = this.getRenderList(this.list, 0);
		this.initEventBus();
		this.initFileStatus();
		this.watchFolder();
		window.tree = this;
	},
	mounted() {
		this.domHeight = this.$refs.wrap.clientHeight;
		this.maxVisibleLines = Math.ceil(this.domHeight / this.itemHeight) + 1;
		this.render();
	},
	destroyed() {
		for (let key in this.watchIdMap) {
			this.watchIdMap[key].close();
		}
	},
	methods: {
		initResizeEvent() {
			const resizeObserver = new ResizeObserver((entries) => {
				if (this.$refs.wrap && this.$refs.wrap.clientHeight) {
					this.domHeight = this.$refs.wrap.clientHeight;
				}
			});
			resizeObserver.observe(this.$refs.wrap);
		},
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
			EventBus.$on('file-create-tree', (dirPath) => {
				this.addItem(dirPath, 'file');
			});
			EventBus.$on('folder-create-tree', (dirPath) => {
				this.addItem(dirPath, 'dir');
			});
			EventBus.$on('file-copy', (item) => {
				this.cutPath = '';
			});
			EventBus.$on('file-cut', (item) => {
				this.cutPath = item.path;
			});
			EventBus.$on('file-paste', (item) => {
				this.cutPath = '';
			});
			EventBus.$on('git-statused', (item) => {
				this.render();
			});
			EventBus.$on('folder-opened', () => {
				this.$nextTick(() => {
					this.refreshWorkSpace();
				});
			});
			EventBus.$on('workspace-opened', () => {
				this.$nextTick(() => {
					this.refreshWorkSpace();
				});
			});
		},
		initFileStatus() {
			this.list.forEach((item) => {
				EventBus.$emit('git-status', item);
			});
		},
		setTreeHeight() {
			this.treeHeight = this.openedList.length * this.itemHeight;
		},
		render() {
			this.renderList = this.openedList.slice(this.startLine - 1, this.startLine - 1 + this.maxVisibleLines);
			this.renderList.forEach((item) => {
				if (globalData.nowIconData) {
					item.icon = Util.getIconByPath({
						iconData: globalData.nowIconData,
						themeType: globalData.nowTheme.type,
						filePath: item.path,
						fileType: item.type,
						opened: item.open,
						isRoot: !item.parentPath,
					});
					item.icon = item.icon ? `my-file-icon my-file-icon-${item.icon}` : '';
				}
				item.status = Util.getFileStatus(globalData.fileStatus, item.relativePath, item.rootPath);
				item.statusColor = item.status.statusColor;
				item.status = item.status.status;
			});
		},
		createItems(item, files) {
			let results = [];
			files.forEach((name, index) => {
				let fullPath = path.join(item.path, name);
				if (!fs.existsSync(fullPath)) {
					return;
				}
				let stat = fs.statSync(fullPath);
				let obj = {
					id: Util.getIdFromStat(stat),
					name: name,
					path: fullPath,
					parentPath: item.path,
					relativePath: path.join(item.relativePath, name),
					rootPath: item.rootPath,
					parent: item,
					deep: item.deep + 1,
					active: false,
					children: [],
				};
				if (stat.isFile()) {
					obj.type = 'file';
				} else {
					obj.type = 'dir';
					obj.open = false;
				}
				results.push(obj);
			});
			return this.sortFileList(results);
		},
		readdir(item) {
			let files = fs.readdirSync(item.path, { encoding: 'utf8' });
			return this.createItems(item, files);
		},
		refreshDir(item) {
			this.refreshFolderTimer = this.refreshFolderTimer || {};
			clearTimeout(this.refreshFolderTimer[item.id]);
			this.refreshFolderTimer[item.id] = setTimeout(() => {
				if (fs.existsSync(item.path)) {
					_refresh.call(this);
				}
			}, 100);

			function _refresh() {
				let idMap = {};
				let list = this.readdir(item);
				item.children.forEach((item) => {
					idMap[item.id] = item;
				});
				item.children = list.map((item) => {
					let obj = idMap[item.id];
					if (obj) {
						if (obj.path != item.path) {
							obj.name = item.name;
							// 递归更新路径
							this.updateParentPath(obj, item.parentPath);
						}
						return obj;
					}
					return item;
				});
				if (item.open) {
					this.closeFolder(item);
					this.openFolder(item);
				}
				this.render();
			}
		},
		refreshWorkSpace() {
			this.sortFileList(this.list);
			this.list.forEach((item) => {
				if (item.open) {
					this.closeFolder(item);
					this.openFolder(item);
				}
			});
		},
		addItem(dirPath, type) {
			this.newId = 'new' + Util.getUUID();
			for (let i = 0; i < this.renderList.length; i++) {
				let item = this.renderList[i];
				if (item.path === dirPath) {
					let obj = {
						id: this.newId,
						name: '',
						type: type,
						parentPath: item.path,
						deep: item.deep + 1,
					};
					if (!item.open) {
						this.onClickItem(item);
					}
					obj.icon = Util.getIconByPath({
						iconData: globalData.nowIconData,
						themeType: globalData.nowTheme.type,
						filePath: '',
						fileType: type,
						opened: false,
						isRoot: false,
					});
					obj.icon = obj.icon ? `my-file-icon my-file-icon-${obj.icon}` : '';
					this.renderList.splice(i + 1, 0, obj);
					this.$nextTick(() => {
						EventBus.$emit('file-rename-input', obj);
					});
					break;
				}
			}
		},
		closeFolder(item) {
			let index = this.openedList.indexOf(item) + 1;
			let endIn = index;
			while (endIn < this.openedList.length && this.openedList[endIn].parentPath != item.parentPath) {
				endIn++;
			}
			this.openedList.splice(index, endIn - index);
			this.setTreeHeight();
		},
		openFolder(item) {
			let index = this.openedList.indexOf(item);
			this.openedList = this.openedList
				.slice(0, index + 1)
				.concat(this.getRenderList(item.children, item.deep))
				.concat(this.openedList.slice(index + 1));
		},
		watchFolder() {
			this.list.forEach((item) => {
				if (!this.watchIdMap[item.id]) {
					this.watchIdMap[item.id] = fs.watch(item.path, { recursive: true }, (event, filename) => {
						if (filename) {
							if (event === 'rename') {
								let dirPath = path.dirname(path.join(item.path, filename));
								let treeItem = Util.getFileItemByPath(this.list, dirPath);
								if (treeItem && (treeItem.children.length || treeItem.open)) {
									this.refreshDir(treeItem);
								}
							} else if (event === 'change') {
								let filePath = path.join(item.path, filename);
								EventBus.$emit('git-diff', filePath);
							}
							if (filename != '.git' && !filename.startsWith('.git' + path.sep + 'index.lock')) {
								EventBus.$emit('git-status', item);
							}
						}
					});
				}
			});
		},
		updateParentPath(item, parentPath) {
			item.path = path.join(parentPath, item.name);
			item.parentPath = parentPath;
			parentPath = item.path;
			item.children.forEach((item) => {
				this.updateParentPath(item, parentPath);
			});
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
						let clientHeight = wrap.clientHeight;
						let height = (i + 1) * this.itemHeight;
						if (this.scrollTop + clientHeight < height) {
							this.scrollTop = height - clientHeight;
						} else if (this.scrollTop + this.itemHeight > height) {
							this.scrollTop = height - this.itemHeight;
						}
						if (!item.active) {
							this.onClickItem(item);
						}
						break;
					} else if (path.startsWith(item.path)) {
						if (!item.open) {
							index = i + 1;
							this.onClickItem(item);
							_findItem.call(this, path);
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
						let list = this.readdir(item);
						item.children = list;
						item.loaded = true;
						_changOpen.call(this, item);
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
		onWheel(e) {
			this.scrollDeltaY = e.deltaY;
			if (this.scrollDeltaY && !this.wheelTask) {
				this.wheelTask = globalData.scheduler.addUiTask(() => {
					if (this.scrollDeltaY) {
						try {
							let scrollTop = this.scrollTop + this.scrollDeltaY;
							if (scrollTop > this.treeHeight - this.domHeight) {
								scrollTop = this.treeHeight - this.domHeight;
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
			let scrollTop = e;
			this.startLine = Math.floor(scrollTop / this.itemHeight) + 1;
			this.scrollTop = scrollTop;
			this.deltaTop = scrollTop % this.itemHeight;
			this.render();
		},
		onContextmenu(e, item) {
			this.$parent.$refs.sideTreeMenu.show(e, item);
		},
	},
};
</script>
