<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
	<div @contextmenu.prevent="onContextmenu" @selectstart.prevent class="my-editor-side-bar" ref="sideBar">
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
            var require = require || window.parent.require;
            var remote = require('@electron/remote');
            let win = remote.getCurrentWindow();
            let options = {
                title: '标题',
                defaultPath: this.filePath,
                properties: ['openDirectory', 'multiSelections']
            };
            remote.dialog.showOpenDialog(win, options).then(result => {
                if (!result.canceled && result.filePaths) {
                    result.filePaths.map((item) => {
                        this.list.push({
                            name: item.match(/[^\\\/]+$/)[0],
                            path: item,
                            type: 'dir',
                            active: false,
                            open: false,
                            children: []
                        })
                    });
                }
            }).catch(err => {
                console.log(err)
            })
        }
    }
}
</script>