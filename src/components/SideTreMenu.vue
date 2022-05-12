<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
    <div ref="wrap" v-show="menuVisible">
        <Menu :checkable="false" :menuList="menuList" :styles="menuStyle" @change="onMenuChange" ref="menu"></Menu>
    </div>
</template>
<script>
import Menu from './Menu';
import EventBus from '@/event';
import $ from 'jquery';

const require = window.require || window.parent.require || function () {};
const path = require('path');
const remote = require('@electron/remote');

export default {
    name: 'SideTreMenu',
    components: {
        Menu,
    },
    data() {
        return {
            dirMenu: [
                [
                    {
                        name: 'Reveal in File Explorer',
                        op: 'revealInFileExplorer',
                    },
                    {
                        name: 'Find in Folder',
                        op: 'findInFolder',
                    },
                ],
            ],
            fileMenu: [
                [
                    {
                        name: 'Reveal in File Explorer',
                        op: 'revealInFileExplorer',
                    },
                ],
            ],
            menuList: [],
            menuVisible: false,
            menuStyle: {
                left: '10px',
                top: '40px',
            },
        };
    },
    provide() {},
    created() {
        this.initEventBus();
    },
    methods: {
        initEventBus() {
            EventBus.$on('close-menu', () => {
                this.menuVisible = false;
            });
        },
        show(e, treeItem) {
            let $parent = $(this.$refs.wrap).parent();
            this.menuVisible = true;
            this.treeItem = treeItem;
            if (treeItem.type === 'dir') {
                this.menuList = this.dirMenu;
            } else {
                this.menuList = this.fileMenu;
            }
            this.$nextTick(() => {
                let menuHeight = 0;
                menuHeight = this.$refs.menu.$el.clientHeight;
                let offset = $parent.offset();
                if (menuHeight + e.clientY > offset.top + $parent.height()) {
                    this.menuStyle.top = e.clientY - offset.top - menuHeight + 'px';
                } else {
                    this.menuStyle.top = e.clientY - offset.top + 'px';
                }
                this.menuStyle.left = e.clientX - offset.left + 'px';
            });
        },
        onMenuChange(item) {
            switch (item.op) {
                case 'revealInFileExplorer':
                    remote.shell.showItemInFolder(this.treeItem.path);
                    break;
                case 'findInFolder':
                    let treeItem = this.treeItem;
                    let dirPath = treeItem.name;
                    while (treeItem.parent) {
                        dirPath = path.join(treeItem.parent.name, dirPath);
                        treeItem = treeItem.parent;
                    }
                    dirPath = '.' + path.sep + dirPath;
                    EventBus.$emit('find-in-folder', { path: dirPath });
                    break;
            }
            this.menuVisible = false;
        },
    },
};
</script>
