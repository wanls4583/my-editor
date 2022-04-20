<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
    <div @scroll="onScroll" class="side-tree-warp my-scroll-overlay" ref="wrap">
        <div style="width: 100%; overflow: hidden">
            <div :style="{ height: _scrollHeight }" class="side-tree">
                <div :style="{ top: _top }" class="side-tree-content">
                    <div @click.stop="onClickItem(item)" class="tree-item" v-for="item in renderList">
                        <div
                            :class="[item.active ? 'my-active' : '']"
                            :style="{ 'padding-left': _paddingLeft(item) }"
                            :title="item.path"
                            @contextmenu.stop.prevent
                            class="tree-item-title my-center-start"
                        >
                            <template v-if="item.type === 'dir'">
                                <span class="left-icon iconfont icon-down1" v-if="item.open"></span>
                                <span class="left-icon iconfont icon-right" v-else></span>
                            </template>
                            <div class="tree-item-content my-center-start" :class="[item.icon]">
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
import Util from '@/common/Util';
import globalData from '@/data/globalData';

const require = window.require || window.parent.require || function () {};
let preActiveItem = null;

export default {
    name: 'SideTree',
    props: {
        list: {
            type: Array,
        },
    },
    inject: ['openFile'],
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
        this.maxVisibleLines = Math.ceil(this.$refs.wrap.clientHeight / this.itemHeight) + 1;
        this.render();
    },
    methods: {
        initEventBus() {
            EventBus.$on('icon-change', () => {
                this.openedList.forEach((item) => {
                    item.icon = '';
                });
                this.render();
            });
        },
        render() {
            this.renderList = this.openedList.slice(this.startLine - 1, this.startLine - 1 + this.maxVisibleLines);
            this.renderList.forEach((item) => {
                if (globalData.nowIconData) {
                    item.icon = Util.getIconByPath(globalData.nowIconData, item.path, globalData.nowTheme.type, item.type, item.open);
                    item.icon = item.icon ? `my-file-icon my-file-icon-${item.icon}` : '';
                }
            });
        },
        readdir(dirPath) {
            const fs = require('fs');
            const path = require('path');
            return new Promise((resolve) => {
                let results = [];
                // 异步读取目录内容
                fs.readdir(dirPath, { encoding: 'utf8' }, (err, files) => {
                    if (err) {
                        throw err;
                    }
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
                        if (index === files.length - 1) {
                            resolve(this.sortFileList(results));
                        }
                    });
                });
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
                if (item.type === 'dir') {
                    item.open = !item.open;
                    if (!item.loaded) {
                        this.readdir(item.path).then((data) => {
                            item.children = data;
                            item.loaded = true;
                            data.forEach((_item) => {
                                _item.deep = item.deep + 1;
                            });
                            _changOpen.call(this, item);
                        });
                    } else {
                        _changOpen.call(this, item);
                    }
                } else {
                    this.openFile(item);
                }
            } else if (item.type === 'dir') {
                item.open = !item.open;
                _changOpen.call(this, item);
            }

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
                        while (endIn < this.openedList.length && this.openedList[endIn].parentPath != item.parentPath) {
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