<!--
 * @Author: lisong
 * @Date: 2022-11-12 13:15:02
 * @Description: 
-->
<template>
	<div class="my-minimap" ref="wrap">
		<canvas :height="height" :width="width" ref="canvas"></canvas>
	</div>
</template>
<script>
import EventBus from '@/event';
import globalData from '@/data/globalData';

export default {
	name: 'Minimap',
	components: {},
	props: {
		contentHeight: Number,
		scrollTop: Number,
	},
	data() {
		return {
			startLine: 1,
			maxVisibleLines: 1,
			width: 0,
			height: 0,
			scale: 0.1,
			top: 0,
		};
	},
	watch: {
		scrollTop() {
			this.setStartLine();
		},
		startLine() {
			this.render();
		},
	},
	computed: {},
	created() {
		this.width = 120 / this.scale;
		this.renderedIdMap = {};
	},
	mounted() {
		this.ctx = this.$refs.canvas.getContext('2d');
		this.initEvent();
	},
	methods: {
		initEvent() {
			this.initResizeEvent();
			this.initEventBus();
		},
		initEventBus() {
			EventBus.$on(
				'render-line',
				(this.initEventBus.fn1 = (data) => {
					if (this.$parent.editorId === data.editorId) {
						if (this.renderedIdMap[data.lineId]) {
							this.drawLine(this.renderedIdMap[data.lineId].line, true);
						}
					}
				})
			);
		},
		initResizeEvent() {
			const resizeObserver = new ResizeObserver((entries) => {
				if (this.$refs.wrap) {
					this.height = this.$refs.wrap.clientHeight / this.scale;
					this.maxVisibleLines = Math.ceil(this.height / this.$parent.charObj.charHight) + 1;
				}
			});
			resizeObserver.observe(this.$refs.wrap);
		},
		setStartLine() {
			let height = this.height;
			let maxScrollTop = this.contentHeight - height;
			let scrollTop = this.scrollTop - height / 2;
			scrollTop = scrollTop < 0 ? 0 : scrollTop;
			scrollTop = scrollTop > maxScrollTop ? maxScrollTop : scrollTop;
			this.startLine = Math.floor(scrollTop / this.$parent.charObj.charHight);
			this.startLine++;
			this.top = scrollTop % this.$parent.charObj.charHight;
		},
		drawLine(line, clear) {
			let charHight = this.$parent.charObj.charHight;
			let top = (line - this.startLine) * charHight - this.top;
			let lineObj = this.$parent.myContext.htmls[line - 1];
			let cache = this.renderedIdMap[lineObj.lineId];
			let tokens = lineObj.tokens;
			let html = '';
			if (clear) {
				this.ctx.clearRect(0, top, this.width / this.scale, charHight);
			}
			if (!lineObj.html) {
				if (lineObj.tokens && lineObj.tokens.length) {
					lineObj.tokens = this.$parent.tokenizer.splitLongToken(lineObj.tokens);
					lineObj.html = this.$parent.tokenizer.createHtml(lineObj.tokens, lineObj.text);
				}
			}
			top -= charHight / 2;
			html = lineObj.html || lineObj.text;
			if (cache && cache.html === html) {
				this.ctx.drawImage(cache.canvas, 20, top);
			} else {
				let canvas = document.createElement('canvas');
				let ctx = canvas.getContext('2d');
				canvas.width = this.$refs.canvas.width;
				canvas.height = charHight;
				ctx.font = `${charHight}px Consolas`;
				ctx.textBaseline = 'middle';
				if (tokens) {
					let left = 20;
					for (let i = 0; i < tokens.length; i++) {
						let token = tokens[i];
						let text = lineObj.text.slice(token.startIndex, token.endIndex);
						ctx.fillStyle = globalData.colors['editor.foreground'];
						if (token.scopeId) {
							let scope = globalData.scopeIdMap[token.scopeId];
							if (scope.settings && scope.settings.foreground) {
								ctx.fillStyle = scope.settings.foreground;
							}
						}
						ctx.fillText(text, left, 0);
						left += ctx.measureText(text).width;
						// 退出无效渲染
						if (left > this.width) {
							break;
						}
					}
				} else {
					ctx.fillStyle = globalData.colors['editor.foreground'];
					ctx.fillText(lineObj.text, 20, 0);
				}
				this.ctx.drawImage(canvas, 20, top);
				this.renderedIdMap[lineObj.lineId] = {
					line: line,
					html: html,
					canvas: canvas,
				};
			}
		},
		render() {
			cancelAnimationFrame(this.renderTimer);
			this.renderTimer = requestAnimationFrame(() => {
				this.renderLine();
			});
		},
		renderLine() {
			this.ctx.clearRect(0, 0, this.width / this.scale, this.height / this.scale);
			for (let line = this.startLine, i = 0; line <= this.$parent.myContext.htmls.length && i < this.maxVisibleLines; i++) {
				let fold = this.$parent.folder.getFoldByLine(line);
				this.drawLine(line);
				if (fold) {
					line = fold.end.line;
				} else {
					line++;
				}
			}
		},
	},
};
</script>
