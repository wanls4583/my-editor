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
			indent: 'tab',
			language: '',
			hasEditor: false,
			languageList: globalData.languageList,
			tabMenu: [
				[
					{
						op: 'changeIndent',
						name: 'Indent Using Spacee',
						value: 'space',
					},
					{
						op: 'changeIndent',
						name: 'Indent Using Tabs',
						value: 'tab',
					},
				],
				[
					{
						op: 'convertTabToSpace',
						name: 'Convert Indentation to Spaces',
					},
					{
						op: 'convertSpaceToTab',
						name: 'Convert Indentation to Tabs',
					},
				],
			],
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
		let indentList = [];
		for (let i = 1; i <= 8; i++) {
			indentList.push({
				op: 'changeTabSize',
				name: `Tab Width：${i}`,
				value: i,
			});
		}
		this.tabMenu.unshift(indentList);
	},
	mounted() {},
	methods: {
		initEventBus() {
			EventBus.$on('editor-changed', (data) => {
				if (data) {
					this.language = data.language;
					this.tabSize = data.tabSize;
					this.indent = data.indent;
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
			EventBus.$on('tab-size-change', (tabSize) => {
				this.tabSize = tabSize;
			});
			EventBus.$on('indent-change', (indent) => {
				this.indent = indent;
			});
		},
		showTabsize() {
			let cmdList = this.tabMenu.map((group, index) => {
				return group.map((item) => {
					item = Object.assign({}, item);
					if (index === 0) {
						item.selected = item.value === this.tabSize;
					} else if (index === 1) {
						item.selected = item.value === this.indent;
					}
					return item;
				});
			});
			EventBus.$emit('close-menu');
			EventBus.$emit('cmd-menu-open', {
				cmdList: cmdList,
				hoverCheck: false,
			});
		},
		showLanguage() {
			let value = globalData.nowEditorId && globalData.$mainWin.getNowEditor().language;
			let cmdList = globalData.languageList.map((item) => {
				let icon = Util.getIconByExtensions(item.extensions || []);
				icon = icon ? `my-file-icon my-file-icon-${icon}` : '';
				return {
					icon,
					name: item.name + (item.language ? `（${item.language}）` : ''),
					value: item.value,
					op: 'selectLanguage',
					active: value === item.value,
					selected: value === item.value,
				};
			});
			EventBus.$emit('close-menu');
			EventBus.$emit('cmd-menu-open', {
				cmdList: cmdList,
			});
		},
	},
};
</script>