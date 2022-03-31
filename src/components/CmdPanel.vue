<!--
 * @Author: lisong
 * @Date: 2021-12-24 11:00:11
 * @Description: 
-->
<template>
	<div @mousedown.stop class="my-cmd-panel my-shadow my-border" v-if="visible">
		<div>
			<div class="my-cmd-search">
				<input type="text" v-model="searchText" />
			</div>
			<Menu :checkable="true" :menuList="_menuList" :value="value" @change="onChange" style="position:relative"></Menu>
		</div>
	</div>
</template>
<script>
import Util from '@/common/Util';
import Theme from '@/module/theme';
import Menu from './Menu';
export default {
    name: 'CmdPanel',
    components: {
        Menu
    },
    props: {
        menuList: {
            type: Array,
            default: []
        },
        value: {
            type: [Number, String]
        },
        visible: Boolean
    },
    data() {
        return {
            searchText: '',
            _menuList: [],
        }
    },
    watch: {
        visible() {
            this.searchText = '';
        },
        menuList() {
            this.searchMenu();
        },
        searchText() {
            this.searchMenu();
        }
    },
    created() {
        this._menuList = this.menuList;
        this.theme = new Theme();
    },
    methods: {
        searchMenu() {
            if (this.searchText) {
                let menu = this.menuList[0].filter((item) => {
                    return Util.fuzzyMatch(this.searchText, item.name);
                });
                this._menuList = [menu];
            } else {
                this._menuList = this.menuList.slice();
            }
        },
        onChange(item) {
            switch (item.op) {
                case 'changeTheme':
                    this.theme.loadXml(item.value);
                    window.globalData.nowTheme = item.value;
                    break;
            }
            this.$emit('update:visible', false);
        },
    }
}
</script>