<!--
 * @Author: lisong
 * @Date: 2021-12-09 21:38:38
 * @Description: 
-->
<template>
	<div :style="{ height: height + 'px' }" @contextmenu.stop.prevent class="my-status-bar my-width-100">
		<div class="my-height-100 my-center-between">
			<div class="bar-left">
				<div class="bar-item" v-if="hasEditor">
					<span>Line {{ line }}, Column {{ column }}</span>
				</div>
			</div>
			<div class="bar-right">
				<div @mousedown.stop="showTabsize" class="bar-item my-hover" v-if="hasEditor">
					<span>Tab Size:{{ tabSize }}</span>
					<div class="my-list" style="position: absolute; bottom: 30px">
						<Menu :menuList="tabSizeList" :styles="{ position: 'relative' }" :value="tabSize" @change="onTabsizeChange" v-if="tabsizeVisible"></Menu>
					</div>
				</div>
				<div @mousedown.stop="showLanguage" class="bar-item my-hover" v-if="hasEditor">
					<span>{{ nowLanguage }}</span>
				</div>
			</div>
		</div>
	</div>
</template>
<script>
import Menu from './Menu';
import EventBus from '@/event';
import Util from '@/common/util';
import globalData from '@/data/globalData';

export default {
	name: 'StatusBar',
	props: {
		height: {
			type: Number,
			default: 25,
		},
	},
	components: {
		Menu,
	},
	data() {
		return {
			line: 1,
			column: 0,
			tabSize: 4,
			language: '',
			tabsizeVisible: false,
			hasEditor: false,
			tabSizeList: [],
			languageList: globalData.languageList,
		};
	},
	computed: {
		nowLanguage() {
			for (let i = 0; i < this.languageList.length; i++) {
				if (this.languageList[i].value === this.language) {
					return this.languageList[i].name;
				}
			}
		},
	},
	created() {
		this.initEventBus();
		for (let i = 1; i <= 8; i++) {
			this.tabSizeList.push({
				name: `Tab Width：${i}`,
				value: i,
			});
		}
	},
	mounted() {},
	methods: {
		initEventBus() {
			EventBus.$on('editor-changed', (data) => {
				if (data) {
					this.language = data.language;
					this.tabSize = data.tabSize;
					this.line = data.line;
					this.column = data.column;
					this.hasEditor = true;
				} else {
					this.hasEditor = false;
				}
			});
			EventBus.$on('cursor-change', (data) => {
				this.line = data.line;
				this.column = data.column;
			});
			EventBus.$on('language-change', (data) => {
				this.language = data.language;
			});
			EventBus.$on('close-menu', (language) => {
				this.tabsizeVisible = false;
			});
		},
		showTabsize() {
			let visible = this.tabsizeVisible;
			EventBus.$emit('close-menu');
			this.tabsizeVisible = !visible;
		},
		showLanguage() {
			let cmdList = globalData.languageList.map((item) => {
				let icon = Util.getIconByExtensions(item.extensions || []);
				icon = icon ? `my-file-icon my-file-icon-${icon}` : 'my-file-icon';
				return {
					op: 'selectLanguage',
					name: item.name + (item.language ? `（${item.language}）` : ''),
					value: item.value,
					icon,
				};
			});
			EventBus.$emit('close-menu');
			EventBus.$emit('cmd-menu-open', {
				cmdList: cmdList,
				value: globalData.nowEditorId && globalData.$mainWin.getNowEditor().language,
			});
		},
		onTabsizeChange(item) {
			if (this.tabSize != item.value) {
				EventBus.$emit('tab-size-change', item.value);
				this.tabSize = item.value;
			}
			this.tabsizeVisible = false;
		},
	},
};
</script>