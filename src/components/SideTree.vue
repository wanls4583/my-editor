<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
	<div class="side-tree">
		<div @click.stop="onClickItem(item)" class="side-item" v-for="item in list">
			<template v-if="item.type==='dir'">
				<div :class="{'active':item.active}" :style="{'padding-left':_paddingLeft}" :title="item.path" @contextmenu.stop.prevent class="side-item-title">
					<span class="left-icon iconfont icon-down1" v-if="item.open"></span>
					<span class="left-icon iconfont icon-right" v-else></span>
					<span class="side-item-text" style="margin-left:4px">{{item.name}}</span>
				</div>
				<side-tree :deep="deep+1" :list="item.children" v-show="item.open"></side-tree>
			</template>
			<div
				:class="{'active':item.active}"
				:style="{'padding-left':_paddingLeft}"
				:title="item.path"
				@contextmenu.stop.prevent
				class="side-item-title"
				v-else
			>{{item.name}}</div>
		</div>
	</div>
</template>
<script>
const require = require || window.parent.require;
let preActiveItem = null;
export default {
    name: 'SideTree',
    props: {
        list: {
            type: Array
        },
        deep: {
            type: Number,
            default: 1
        }
    },
    inject: ['getRootList', 'openFile'],
    data() {
        return {
        }
    },
    computed: {
        _paddingLeft() {
            return this.deep * 20 + 'px';
        },
    },
    mounted() {
    },
    methods: {
        onClickItem(item) {
            if (!item.active) {
                console.log(this);
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
                        });
                    }
                } else {
                    this.openFile(item);
                }
            } else if (item.type === 'dir') {
                item.open = !item.open;
            }
        },
        inActive(list) {
            list.map(item => {
                item.active = false;
                item.children && this.inActive(item.children);
            });
        },
        readdir(dirPath) {
            const fs = require('fs')
            const path = require('path');
            return new Promise((resolve) => {
                let results = [];
                // 异步读取目录内容
                fs.readdir(dirPath, { encoding: 'utf8' }, (err, files) => {
                    if (err) { throw err }
                    files.map((item, index) => {
                        let fullPath = path.join(dirPath, item);
                        fs.stat(fullPath, (err, data) => {
                            let obj = {
                                name: item,
                                path: fullPath,
                                parentPath: dirPath,
                                active: false,
                                children: []
                            }
                            if (data.isFile()) {
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
            });
        },
        sortFileList(results) {
            results.sort((a, b) => {
                if (a.type == 'dir') {
                    return -1;
                }
                return 1;
            });
            return results;
        }
    }
}
</script>