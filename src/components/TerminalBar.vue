<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
	<div @selectstart.prevent class="my-terminal-bar" ref="terminalBar">
		<div class="my-center-between my-width-100 my-height-100">
			<div class="bar-scroller my-scroll-overlay my-scroll-mini">
				<div
					:class="[item.active ? 'my-active' : '']"
					@click="onClickItem(item.id)"
					@contextmenu.prevent.stop="onContextmenu($event, item.id)"
					class="bar-item my-hover"
					v-for="(item, index) in terminalList"
				>
					<div class="bar-content">
						<span class="bar-text">{{ item.title || item.name }}</span>
						<div class="bar-icon-wrap">
							<span @click.stop="onClose(item.id)" class="bar-icon" title="close">
								<i class="bar-close-icon my-icon icon-chrome-close"></i>
							</span>
						</div>
					</div>
				</div>
			</div>
			<div class="my-terminal-btns">
				<div class="bar-icon-wrap">
					<span @click.stop="onAdd()" class="bar-icon" title="new">
						<i class="my-icon icon-add"></i>
					</span>
				</div>
				<div class="bar-icon-wrap">
					<span @click.stop="onToggle()" class="bar-icon" title="new">
						<i class="my-icon icon-chrome-close"></i>
					</span>
				</div>
			</div>
		</div>
		<terminal-bar-menu ref="terminalBarMenu"></terminal-bar-menu>
	</div>
</template>
<script>
import TerminalBarMenu from './TerminalBarMenu';
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
	created() {
		this.initEventBus();
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
		onAdd() {
			EventBus.$emit('terminal-new');
		},
		onToggle() {
			EventBus.$emit('terminal-toggle');
		},
		onContextmenu(e, id) {
			this.$refs.terminalBarMenu.show(e, id);
		},
	},
};
</script>