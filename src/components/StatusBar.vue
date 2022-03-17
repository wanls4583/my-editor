<!--
 * @Author: lisong
 * @Date: 2021-12-09 21:38:38
 * @Description: 
-->
<template>
	<div :style="{height:height+'px'}" @contextmenu.stop.prevent class="my-editor-status-bar">
		<div class="bar-left">
			<div class="bar-item" v-if="editor">
				<span>Line {{line}}, Column {{column}}</span>
			</div>
		</div>
		<div class="bar-right">
			<div @mousedown.stop="showTabsize" class="bar-item my-editor-clickable" v-if="editor">
				<span>Tab Size:{{tabSize}}</span>
				<Menu :menuList="tabSizeList" :styles="{right: 0, bottom: height+'px'}" @change="onTabsizeChange" v-show="tabsizeVisible"></Menu>
			</div>
			<div @mousedown.stop="showLanguage" class="bar-item my-editor-clickable" v-if="editor">
				<span>{{_language}}</span>
				<Menu :menuList="languageList" :styles="{right: 0, bottom: height+'px'}" @change="onLnaguageChange" v-show="languageVisible"></Menu>
			</div>
		</div>
	</div>
</template>
<script>
import Menu from './Menu';
export default {
    name: 'StatusBar',
    props: {
        height: {
            type: Number,
            default: 25
        },
    },
    components: {
        Menu
    },
    data() {
        return {
            line: 1,
            column: 0,
            tabSize: 4,
            language: '',
            tabsizeVisible: false,
            languageVisible: false,
            tabSizeList: [[]],
            languageMap: {},
            languageList: [[
                { name: 'JavaScript', value: 'JavaScript' },
                { name: 'HTML', value: 'HTML' },
                { name: 'CSS', value: 'CSS' },
                { name: 'Plain Text', value: '' }
            ]]
        }
    },
    watch: {
        tabSize(newVal) {
            console.log(newVal)
        }
    },
    computed: {
        editor() {
            return this.getNowEditor();
        },
        _language() {
            return this.languageMap[this.language];
        }
    },
    inject: ['getNowEditor'],
    created() {
        for (let i = 1; i <= 8; i++) {
            this.tabSizeList[0].push({
                name: `Tab Width：${i}`,
                size: i
            });
        }
        this.setDefault();
    },
    created() {
        this.languageList[0].forEach((item) => {
            this.languageMap[item.value] = item.name;
        });
    },
    mounted() {
    },
    methods: {
        setDefault() {
            this.tabSizeList[0].forEach((item) => {
                item.checked = item.size == this.tabSize;
            });
            this.languageList[0].forEach((item) => {
                item.checked = item.value == this.language;
            });
        },
        showTabsize() {
            let visible = this.tabsizeVisible;
            this.closeAllMenu();
            this.tabsizeVisible = !visible;
        },
        showLanguage() {
            let visible = this.languageVisible;
            this.closeAllMenu();
            this.languageVisible = !visible;
        },
        closeAllMenu() {
            this.languageVisible = false;
            this.tabsizeVisible = false;
        },
        onTabsizeChange(item) {
            if (this.tabSize != item.size) {
                this.tabSize = item.size;
                this.editor.tabSize = item.size;
            }
            this.tabsizeVisible = false;
        },
        onLnaguageChange(item) {
            if (this.language != item.name) {
                this.language = item.value;
                this.editor.language = item.value;
            }
            this.languageVisible = false;
        }
    }
}
</script>