<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
	<div @mouseenter="showScrollBar" @mouseleave="hideScrollBar" @mousemove="showScrollBar" @wheel.stop="onWheel" class="side-tree-warp" ref="wrap">
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
							<span class="my-icon my-icon-down" v-if="item.open"></span>
							<span class="my-icon my-icon-right" v-else></span>
						</template>
						<div :class="[item.icon, item.statusColor]" :style="{'margin-left': item.marginLeft}" class="tree-item-content">
							<div class="my-center-between" style="width:100%;overflow:hidden">
								<span class="tree-item-text">{{item.name}}</span>
								<span style="margin:0 5px 0 10px;flex-shrink:0" v-if="item.type==='file'&&item.status!='!!'">{{item.status}}</span>
							</div>
						</div>
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

const fs = window.require('fs');
const path = window.require('path');
const spawnSync = window.require('child_process').spawnSync;

let preActiveItem = null;
let openedList = [];
let gitIgnoreMap = {};

export default {
	name: 'SideTree',
	components: {
		VScrollBar,
	},
	data() {
		return {
			itemHeight: 30,
			itemPadding: 20,
			renderList: [],
			fileWatchs: [],
			startLine: 1,
			maxVisibleLines: 100,
			cutPath: '',
			scrollTop: 0,
			treeHeight: 0,
			domHeight: 0,
			deltaTop: 0,
			scrollVisible: false,
			fileStatusMap: {},
		};
	},
	computed: {
		_paddingLeft() {
			return function (item) {
				return item.deep * this.itemPadding - 10 + 'px';
			};
		},
	},
	created() {
		this.initEventBus();
		this.watchFileStatus();
		this.watchFolder();
		this.setOpendList();
		globalData.$fileTree = this;
	},
	mounted() {
		this.domHeight = this.$refs.wrap.clientHeight;
		this.initResizeEvent();
		this.render();
	},
	methods: {
		initResizeEvent() {
			const resizeObserver = new ResizeObserver((entries) => {
				if (this.$refs.wrap && this.$refs.wrap.clientHeight) {
					this.domHeight = this.$refs.wrap.clientHeight;
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
			EventBus.$on('file-create-tree', (dirPath) => {
				this.newFileOrDir(dirPath, 'file');
			});
			EventBus.$on('folder-create-tree', (dirPath) => {
				this.newFileOrDir(dirPath, 'dir');
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
			EventBus.$on('git-statused', (data) => {
				this.render();
			});
			EventBus.$on('git-ignored', (data) => {
				gitIgnoreMap[data.path] = data.ignore;
				this.render();
			});
			EventBus.$on('folder-opened', () => {
				this.refreshWorkSpace();
			});
			EventBus.$on('folder-added', () => {
				this.refreshWorkSpace();
			});
			EventBus.$on('folder-removed', () => {
				this.refreshWorkSpace();
			});
			EventBus.$on('workspace-opened', () => {
				this.$nextTick(() => {
					this.refreshWorkSpace();
				});
			});
			EventBus.$on('file-tree-loaded', (list) => {
				globalData.fileTree.empty();
				this.initOpendDiring = true;
				this.initOpendDirList(list);
			});
		},
		initOpendDirList(list) {
			if (list.length) {
				let fileObj = list.shift();
				let item = fileObj.parentPath && Util.getFileItemByPath(globalData.fileTree, fileObj.path, fileObj.rootPath);
				if (item) {
					_readdir.call(this, item);
				} else {
					item = this.createRootItem(fileObj.path);
					globalData.fileTree.push(item);
					if (fileObj.open) {
						_readdir.call(this, item);
					} else {
						this.initOpendDirList(list);
					}
				}
			} else {
				this.refreshWorkSpace();
				this.preLoadFolder();
				this.initOpendDiring = false;
			}

			function _readdir(item) {
				this.openFolder(item).then(() => {
					this.initOpendDirList(list);
				});
			}
		},
		render() {
			cancelAnimationFrame(this.renderTimer);
			this.renderTimer = requestAnimationFrame(() => {
				let preItem = {};
				this.maxVisibleLines = Math.ceil(this.domHeight / this.itemHeight) + 1;
				this.renderList = openedList.slice(this.startLine - 1, this.startLine - 1 + this.maxVisibleLines);
				this.renderList.forEach((item) => {
					if (globalData.nowIconData) {
						item.icon = Util.getIconByPath({
							filePath: item.path,
							fileType: item.type,
							opened: item.open,
							isRoot: !item.parentPath,
						});
						item.icon = item.icon ? `my-file-icon my-file-icon-${item.icon}` : '';
					}
					if (item.gitIgnore && gitIgnoreMap[item.gitIgnore] && item.relativePath && gitIgnoreMap[item.gitIgnore].ignores(item.relativePath)) {
						item.status = '!!';
						item.statusColor = 'my-status-ignore';
					} else {
						item.status = Util.getFileStatus(item.path);
						item.statusColor = item.status.statusColor;
						item.status = item.status.status;
					}
					if(item.type === 'file') {
						if(preItem.type === 'file') {
							item.marginLeft = preItem.marginLeft;
						} else if(preItem.path === item.parentPath) {
							item.marginLeft = '10px';
						}
					}
					preItem = item;
				});
			});
		},
		preLoadFolder() {
			globalData.scheduler.removeTask(this.preLoadFolderTask);
			cancelIdleCallback(this.preLoadFolderTimer);
			this.preLoadFolderTimer = requestIdleCallback(() => {
				this.preLoadFolderStartTime = Date.now();
				_preloadFolder.call(this, globalData.fileTree.slice());
			});

			function _preloadFolder(list) {
				if (list.length) {
					let item = list.shift();
					if (!item.loaded) {
						this.readdir(item).then(() => {
							_check.call(this, item, list);
						});
					} else {
						_check.call(this, item, list);
					}
				}
			}

			function _check(item, list) {
				item.children.forEach((item) => {
					if (item.type === 'dir' && item.deep <= 4 && !globalData.skipSearchDirs.test(item.path)) {
						list.push(item);
					}
				});
				// 最多加载30秒
				if (Date.now() - this.preLoadFolderStartTime < 30000) {
					this.preLoadFolderTask = globalData.scheduler.addTask(() => {
						_preloadFolder.call(this, list);
					});
				}
			}
		},
		createItems(parentItem, files) {
			let results = [];
			files.forEach((name, index) => {
				let fullPath = path.join(parentItem.path, name);
				if (!fs.existsSync(fullPath)) {
					return;
				}
				let stat = fs.statSync(fullPath);
				let obj = {
					id: Util.getIdFromPath(fullPath),
					name: name,
					path: fullPath,
					parentPath: parentItem.path,
					rootPath: parentItem.rootPath,
					gitRootPath: parentItem.gitRootPath,
					gitIgnore: parentItem.gitIgnore,
					relativePath: path.join(parentItem.relativePath, name),
					gitRelativePath: (parentItem.gitRootPath && path.join(parentItem.gitRelativePath, name)) || '',
					deep: parentItem.deep + 1,
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
		createRootItem(filePath) {
			let obj = {
				id: Util.getIdFromPath(filePath),
				name: path.basename(filePath),
				path: filePath,
				parentPath: '',
				relativePath: '',
				rootPath: filePath,
				deep: 0,
				active: false,
				children: [],
				type: 'dir',
				open: false,
			};
			return obj;
		},
		readdir(item) {
			return new Promise((resolve, reject) => {
				item.loaded = false;
				item.children = [];
				fs.readdir(item.path, { encoding: 'utf8' }, (err, files) => {
					if (err) {
						return resolve([]);
					}
					if (!item.loaded) {
						files = this.createItems(item, files);
						item.loaded = true;
						item.children = files;
						Object.freeze(files);
					}
					resolve(item.children);
				});
			});
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
				let children = item.children || [];
				this.readdir(item).then(() => {
					let idMap = {};
					children.forEach((item) => {
						idMap[item.id] = item;
					});
					item.children = item.children.map((item) => {
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
					if (!item.gitRootPath) {
						this.watchFileStatus(item.children);
					}
					this.render();
				});
			}
		},
		refreshGitIgnore(gitIgnore) {
			this.refreshGitIgnoreTimer = this.refreshGitIgnoreTimer || {};
			clearTimeout(this.refreshGitIgnoreTimer[gitIgnore]);
			this.refreshGitIgnoreTimer[gitIgnore] = setTimeout(() => {
				EventBus.$emit('git-ignore', gitIgnore);
			}, 100);
		},
		refreshWorkSpace() {
			this.watchFileStatus();
			this.watchFolder();
			this.setOpendList();
			this.render();
		},
		async newFileOrDir(dirPath, type) {
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
						await this.onClickItem(item);
					}
					obj.icon = Util.getIconByPath({
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
			if (!item.open) {
				return;
			}
			let index = openedList.indexOf(item) + 1;
			let endIn = index;
			while (endIn < openedList.length && openedList[endIn].deep > item.deep) {
				endIn++;
			}
			openedList.splice(index, endIn - index);
			this.setTreeHeight();
			item.open = false;
			this.setStartLine(this.checkScrollTop(this.scrollTop));
		},
		openFolder(item) {
			return new Promise((resolve, reject) => {
				if (item.loaded) {
					_open.call(this);
					resolve();
				} else {
					return this.readdir(item).then(() => {
						_open.call(this);
						resolve();
					});
				}
			});

			function _open() {
				if (!item.open) {
					let index = openedList.indexOf(item);
					openedList = openedList
						.slice(0, index + 1)
						.concat(this.getRenderList(item.children, item.deep))
						.concat(openedList.slice(index + 1));
					globalData.openedFileList = openedList;
					item.open = true;
					this.setTreeHeight();
				}
				this.setStartLine(this.checkScrollTop(this.scrollTop));
			}
		},
		watchFileStatus(list) {
			list = list || globalData.fileTree;
			list.forEach((item) => {
				if (item.type === 'dir' && !item.gitRootPath && fs.existsSync(item.path)) {
					if ((item.deep === 0 && Util.checkGitRep(item.path)) || (item.deep > 0 && fs.existsSync(path.join(item.path, '.git')))) {
						let gitIgnore = Util.getIgnore(item.path);
						this.updateGitRootPath(item, item.path, gitIgnore);
						EventBus.$emit('git-status-start', item.path);
						gitIgnore && this.refreshGitIgnore(gitIgnore);
					} else {
						this.watchFileStatus(item.children);
					}
				}
			});
		},
		watchFolder() {
			let ignoreTimer = {};
			this.removeFileWatcher();
			globalData.fileTree.forEach((item) => {
				let watcher = fs.watch(item.path, { recursive: true }, (event, filename) => {
					if (filename) {
						if (event === 'rename') {
							let dirPath = path.dirname(path.join(item.path, filename));
							let treeItems = Util.getFileItemByPath(globalData.fileTree, dirPath);
							treeItems.forEach((treeItem) => {
								if (treeItem.children.length || treeItem.open) {
									this.refreshDir(treeItem);
								}
							});
						}
						if (filename === '.gitignore') {
							this.refreshGitIgnore(path.join(item.path, '.gitignore'));
						}
					}
				});
				this.fileWatchs.push(watcher);
			});
		},
		removeFileWatcher() {
			this.fileWatchs.forEach((item) => {
				item.close();
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
		updateGitRootPath(item, gitRootPath, gitIgnore) {
			item.gitRootPath = gitRootPath;
			item.gitIgnore = gitIgnore;
			item.gitRelativePath = path.relative(gitRootPath, item.path);
			item.children.forEach((item) => {
				this.updateGitRootPath(item, gitRootPath, gitIgnore);
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
		showScrollBar() {
			this.scrollVisible = true;
		},
		hideScrollBar() {
			this.scrollVisible = false;
		},
		focusItem(path) {
			clearTimeout(this.focusItemTimer);

			this.focusItemTimer = setTimeout(() => {
				if (this.initOpendDiring) {
					this.focusItem(path);
					return;
				}
				// root列表可能存在父子关系，优先从子列表中查找
				let list = globalData.fileTree.slice().sort((a, b) => {
					return b.path.length - a.path.length;
				});
				_findItem.call(this, path, list);
			}, 15);

			function _findItem(path, list) {
				for (let i = 0; i < list.length; i++) {
					let item = list[i];
					if (item.path === path) {
						let scrollTop = openedList.indexOf(item) * this.itemHeight - this.domHeight / 2;
						if (preActiveItem) {
							preActiveItem.active = false;
						}
						item.active = true;
						preActiveItem = item;
						globalData.nowFileItem = item;
						this.setStartLine(this.checkScrollTop(scrollTop));
						break;
					} else if (path.startsWith(item.path)) {
						if (!item.open) {
							this.openFolder(item).then(() => {
								_findItem.call(this, path, item.children);
							});
						} else {
							_findItem.call(this, path, item.children);
						}
						break;
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
		setOpendList() {
			openedList = this.getRenderList(globalData.fileTree, 0);
			globalData.openedFileList = openedList;
			this.setTreeHeight();
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
		getNowHash(cwd) {
			return spawnSync('git', ['log', '-1', '--format=%H'], { cwd: cwd }).stdout.toString();
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
					if (!item.loaded) {
						this.openFolder(item).then(() => {
							if (!item.gitRootPath) {
								this.watchFileStatus(item.children);
							}
						});
					} else {
						item.open ? this.closeFolder(item) : this.openFolder(item);
					}
				} else {
					EventBus.$emit('file-open', item);
				}
			} else if (item.type === 'dir') {
				item.open ? this.closeFolder(item) : this.openFolder(item);
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
			this.setStartLine(e);
		},
		onContextmenu(e, item) {
			this.$parent.$refs.sideTreeMenu.show(e, item);
		},
	},
};
</script>
