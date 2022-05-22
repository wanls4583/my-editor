<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
	<div @selectstart.prevent class="my-terminal-bar" ref="terminalBar">
		<div class="bar-scroller my-scroll-overlay my-scroll-mini">
			<div
				:class="[item.active ? 'my-active' : '']"
				:title="item.path"
				@click="onClickItem(item.id)"
				@contextmenu.prevent.stop="onContextmenu($event, item.id)"
				class="bar-item my-hover"
				v-for="(item, index) in terminalList"
			>
				<div class="bar-content">
					<span class="bar-text">{{ item.name }}</span>
					<div class="bar-icon">
						<span @click.stop="onClose(item.id)" class="bar-close-icon iconfont icon-close" title="close"></span>
					</div>
				</div>
			</div>
		</div>
		<terminal-bar-menu ref="terminalBarMenu"></terminal-bar-menu>
	</div>
</template>
<script>
import TerminalBarMenu from './TerminalBarMenu';
import ShortCut from '@/module/shortcut/terminal-bar';
import EventBus from '@/event';
import $ from 'jquery';

export default {
	name: 'TerminalBar',
	components: {
		TerminalBarMenu,
	},
	props: {
		terminalList: {
			type: Array,
		},
	},
	data() {
		return {
			list: [],
		};
	},
	provide() {
		return {
			rootList: this.list,
		};
	},
	created() {
		this.shortcut = new ShortCut(this);
		this.initEventBus();
		$(window).on('keydown', (e) => {
			this.shortcut.onKeyDown(e);
		});
	},
	methods: {
		initEventBus() {
			EventBus.$on('terminal-editor-changed', (data) => {
				this.$nextTick(() => {
					let $tab = $(this.$refs.terminalBar).find('div.my-active');
					$tab.length && $tab[0].scrollIntoView();
				});
			});
		},
		onClickItem(id) {
			EventBus.$emit('terminal-change', id);
		},
		onClose(id) {
            EventBus.$emit('terminal-close', id);
		},
		onContextmenu(e, id) {
			this.$refs.terminalBarMenu.show(e, id);
		},
	},
};
</script>