<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
	<div @contextmenu.prevent.stop="onContextmenu" @selectstart.prevent class="my-editor-side-bar" ref="sideBar">
		<div class="side-bar-title">OPEN FILES</div>
		<div class="side-tree-warp">
			<div style="width:100%;overflow:hidden">
				<side-tree :list="list"></side-tree>
			</div>
		</div>
		<Menu :checkable="false" :menuList="menuList" :styles="menuStyle" @change="onMenuChange" ref="menu" v-show="menuVisible"></Menu>
	</div>
</template>
<script>
import SideTree from './SideTree';
import Menu from './Menu';
import $ from 'jquery';
const require = require || window.parent.require;
const remote = require('@electron/remote');

export default {
    components: {
        SideTree,
        Menu
    },
    data() {
        return {
            list: [],
            menuList: [
                [{
                    name: 'Add Folder to Workspace',
                    op: 'addFolder'
                }]
            ],
            menuVisible: false,
            menuStyle: {
                left: '10px',
                top: '40px'
            }
        }
    },
    provide() {
        return {
            rootList: this.list,
        }
    },
    mounted() {
    },
    methods: {
        onContextmenu(e) {
            let menuWidth = 0;
            let menuHeight = 0;
            this.menuVisible = true;
            let $sideBar = $(this.$refs.sideBar);
            this.$nextTick(() => {
                menuWidth = this.$refs.menu.$el.clientWidth;
                menuHeight = this.$refs.menu.$el.clientHeight;
                let offset = $sideBar.offset();
                if (menuHeight + e.clientY > offset.top + $sideBar.height()) {
                    this.menuStyle.top = e.clientY - offset.top - menuHeight + 'px';
                } else {
                    this.menuStyle.top = e.clientY - offset.top + 'px';
                }
                this.menuStyle.left = e.clientX - offset.left + 'px';
            });
        },
        onMenuChange(item) {
            switch (item.op) {
                case 'addFolder':
                    this.choseFolder();
                    break;
            }
            this.menuVisible = false;
        },
        closeAllMenu() {
            this.menuVisible = false;
        },
        choseFolder() {
            let win = remote.getCurrentWindow();
            let options = {
                title: '选择文件夹',
                properties: ['openDirectory', 'multiSelections']
            };
            return remote.dialog.showOpenDialog(win, options).then(result => {
                let results = [];
                if (!result.canceled && result.filePaths) {
                    result.filePaths.map((item) => {
                        let obj = {
                            name: item.match(/[^\\\/]+$/)[0],
                            path: item,
                            type: 'dir',
                            active: false,
                            open: false,
                            children: []
                        };
                        this.list.push(obj);
                        results.push(Object.assign({}, obj));
                    });
                    this.sortList();
                    return results;
                }
            }).catch(err => {
                console.log(err)
            })
        },
        sortList() {
            this.list.sort((a, b) => {
                if (a.type === b.type) {
                    if (a.name === b.name) {
                        return 0;
                    } else if (a.name > b.name) {
                        return 1
                    } else {
                        return -1;
                    }
                }
                if (a.type === 'dir') {
                    return -1;
                }
                return 1;
            });
        }
    }
}
</script>