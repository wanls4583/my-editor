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
import $ from 'jquery';
const require = require || window.parent.require;
const remote = require('@electron/remote');

export default {
    components: {
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
        show(e) {
            let menuWidth = 0;
            let menuHeight = 0;
            this.menuVisible = true;
            let $parent = $(this.$refs.wrap).parent();
            this.$nextTick(() => {
                menuWidth = this.$refs.menu.$el.clientWidth;
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
                case 'addFolder':
                    this.choseFolder();
                    break;
            }
            this.menuVisible = false;
        },
        hide() {
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