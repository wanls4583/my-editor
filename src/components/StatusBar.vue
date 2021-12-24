<!--
 * @Author: lisong
 * @Date: 2021-12-09 21:38:38
 * @Description: 
-->
<template>
	<div :style="{height:height+'px'}" @click.stop class="my-editor-status-bar">
		<div class="my-editor-status-left">
			<div class="my-editor-status-item">
				<span>Line {{line}}, Column {{column}}</span>
			</div>
		</div>
		<div class="my-editor-status-right">
			<div @click="showTabsize" class="my-editor-status-item clickable">
				<span>Tab Size:{{_tabSize}}</span>
				<panel :menuList="tabSizeList" :styles="{right: 0, bottom: height+'px'}" @change="onTabsizeChange" v-show="tabsizeVisible"></panel>
			</div>
			<div @click="showLanguage" class="my-editor-status-item clickable">
				<span>{{_language}}</span>
				<panel :menuList="languageList" :styles="{right: 0, bottom: height+'px'}" @change="onLnaguageChange" v-show="languageVisible"></panel>
			</div>
		</div>
	</div>
</template>
<script>
import Panel from './Panel';
export default {
    name: 'Home',
    props: {
        height: {
            type: Number,
            default: 25
        },
        line: {
            type: Number,
            default: 1
        },
        column: {
            type: Number,
            default: 1
        },
        language: {
            type: String,
            default: 'JavaScript'
        },
        tabSize: {
            type: Number,
            default: 4
        }
    },
    components: {
        Panel
    },
    data() {
        return {
            _tabSize: 0,
            _language: '',
            tabsizeVisible: false,
            languageVisible: false,
            tabSizeList: [[]],
            languageList: [[{ name: 'JavaScript' }, { name: 'HTML' }, { name: 'CSS' }]]
        }
    },
    created() {
        for (let i = 1; i <= 8; i++) {
            this.tabSizeList[0].push({
                name: `Tab Width：${i}`,
                size: i
            });
        }
        this._tabSize = this.tabSize;
        this._language = this.language;
        this.setDefault();
    },
    methods: {
        setDefault() {
            this.tabSizeList[0].map((item) => {
                item.checked = item.size == this._tabSize;
            });
            this.languageList[0].map((item) => {
                item.checked = item.name == this._language;
            });
        },
        showTabsize() {
            this.languageVisible = false;
            this.tabsizeVisible = !this.tabsizeVisible;
        },
        showLanguage() {
            this.tabsizeVisible = false;
            this.languageVisible = !this.languageVisible;
        },
        onTabsizeChange(item) {
            if (this._tabSize != item.size) {
                this._tabSize = item.size;
                this.$emit('update:tabSize', item.size);
            }
            this.tabsizeVisible = false;
        },
        onLnaguageChange(item) {
            if (this._language != item.name) {
                this._language = item.name;
                this.$emit('update:language', item.name);
            }
            this.languageVisible = false;
        }
    }
}
</script>