<!--
 * @Author: lisong
 * @Date: 2022-05-13 19:43:11
 * @Description: 
-->
<template>
	<div @click="onClickTerminal" @contextmenu.stop.prevent="onContextmenu" class="my-terminal my-scroll-overlay my-scroll-small">
		<div v-for="(item, index) in list">
			<span>{{item.text || '&nbsp;'}}</span>
			<template v-if="index === list.length - 1">
				<span>{{text}}</span>
				<span :style="{opacity: opacity}" class="my-terminal-cursor">
					<textarea @blur="onBlur" @focus="onFocus" @keydown="onKeydown" class="my-terminal-textarea" ref="textarea" v-model="text"></textarea>
				</span>
			</template>
		</div>
		<template v-if="!list.length">
			<span>{{text}}</span>
			<span :style="{opacity: opacity}" class="my-terminal-cursor">
				<textarea @blur="onBlur" @focus="onFocus" @keydown="onKeydown" class="my-terminal-textarea" ref="textarea" v-model="text"></textarea>
			</span>
		</template>
	</div>
</template>
<script>
const iconvLite = window.require('iconv-lite');
const spawn = window.require('child_process').spawn;
export default {
	name: 'Terminal',
	data() {
		return {
			list: [],
			opacity: 0,
			text: '',
		};
	},
	watch: {
		text() {
			this.text = this.text.replace(/\r\n|\n|\r/, '\r\n');
			if (/\r\n/.test(this.text)) {
				let texts = this.text.split('\r\n');
				let text = texts.slice(0, texts.length - 1).join('\r\n');
				this.text = texts.pop();
				this.cmdProcess.stdin.write(iconvLite.encode(text + '\r\n', 'cp936'));
			}
		},
	},
	created() {
		this.cmdProcess = spawn('powershell');
		this.cmdProcess.stdout.on('data', (data) => {
			this.addLine(data);
		});
		this.cmdProcess.stderr.on('data', (data) => {
			this.addLine(data);
		});
	},
	methods: {
		addLine(data) {
			let texts = iconvLite.decode(data, 'cp936').split(/\r\n|\n|\r/);
			texts = texts.map((item) => {
				return {
					text: item,
				};
			});
			if (this.list.length) {
				let firstLine = texts[0].text;
				texts = texts.slice(1);
				this.list.peek().text += firstLine;
			}
			this.list.push(...texts);
			this.added = true;
			requestAnimationFrame(() => {
				this.$refs.textarea[0].scrollIntoView({ behavior: 'instant' }); //"auto","instant"或"smooth"
				if (this.added) {
					setTimeout(() => {
						this.focus();
					}, 500);
				}
			});
		},
		// 显示光标
		showCursor() {
			if (this.cursorVisible) {
				return;
			}
			this.cursorVisible = true;
			this.opacity = 1;
			let _timer = () => {
				clearTimeout(this.curserTimer);
				this.curserTimer = setTimeout(() => {
					this.opacity = this.opacity === 1 ? 0 : 1;
					_timer();
				}, 500);
			};
			_timer();
		},
		// 隐藏光标
		hideCursor() {
			clearTimeout(this.curserTimer);
			this.cursorVisible = false;
			this.opacity = 0;
		},
		focus() {
			this.$refs.textarea[0].focus();
			requestAnimationFrame(() => {
				this.$refs.textarea[0].focus();
			});
		},
		onFocus() {
			this.showCursor();
		},
		onBlur() {
			this.hideCursor();
		},
		onKeydown(e) {
			if (e.keyCode === 13 || e.keyCode === 100) {
				e.preventDefault();
				this.text += '\r\n';
			}
		},
		onClickTerminal(e) {
			this.focus();
		},
		onContextmenu(e) {},
	},
};
</script>