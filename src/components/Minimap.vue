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
			width: 220,
			height: 100,
			scale: 0.1,
			ratio: 2,
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
	computed: {
		charObj() {
			return this.$parent.charObj;
		},
		htmls() {
			return this.$parent.myContext.htmls;
		},
	},
	created() {
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
							this.drawLine(this.renderedIdMap[data.lineId]);
						}
					}
				})
			);
		},
		initResizeEvent() {
			const resizeObserver = new ResizeObserver((entries) => {
				if (this.$refs.wrap) {
					this.height = this.$refs.wrap.clientHeight * this.ratio;
					this.maxVisibleLines = Math.ceil(this.$refs.wrap.clientHeight / this.scale / this.charObj.charHight) + 1;
					this.$nextTick(() => {
						this.ctx.restore();
						this.ctx.save();
						this.ctx.scale(this.scale, this.scale);
					});
				}
			});
			resizeObserver.observe(this.$refs.wrap);
		},
		setStartLine() {
			let height = this.height / this.scale / this.ratio;
			let maxScrollTop = this.contentHeight - height;
			let scrollTop = this.scrollTop - height / 2;
			scrollTop = scrollTop < 0 ? 0 : scrollTop;
			scrollTop = scrollTop > maxScrollTop ? maxScrollTop : scrollTop;
			this.startLine = Math.floor(scrollTop / this.charObj.charHight);
			this.startLine++;
			this.top = scrollTop % this.charObj.charHight;
		},
		drawLine(line, clear) {
			let charHight = this.charObj.charHight * this.ratio;
			let lineObj = this.htmls[line - 1];
			let tokens = lineObj.tokens;
			let top = (line - this.startLine) * charHight - this.top * this.ratio;
			clear && this.ctx.clearRect(0, top, this.width / this.scale, charHight);
			top -= charHight / 2;
			this.ctx.font = `${14 * this.ratio}px Consolas`;
			this.ctx.textBaseline = 'middle';
			if (tokens) {
				let left = 0;
				tokens.forEach((token) => {
					let text = lineObj.text.slice(token.startIndex, token.endIndex);
					let scopeId = token.scopeId || this.$parent.tokenizer.getScopeId(token);
					this.ctx.fillStyle = globalData.colors['editor.foreground'];
					if (scopeId) {
						let scope = globalData.scopeIdMap[scopeId];
						if (scope.settings && scope.settings.foreground) {
							this.ctx.fillStyle = scope.settings.foreground;
						}
					}
					this.ctx.fillText(text, left, top);
					left += this.ctx.measureText(text).width;
				});
			} else {
				this.ctx.fillStyle = globalData.colors['editor.foreground'];
				this.ctx.fillText(lineObj.text, 0, top);
			}
			this.renderedIdMap[lineObj.lineId] = line;
		},
		render() {
			this.ctx.clearRect(0, 0, this.width / this.scale, this.height / this.scale);
			for (let line = this.startLine, i = 0; line <= this.htmls.length && i < this.maxVisibleLines; line++, i++) {
				this.drawLine(line);
				this.endLine = line;
			}
		},
	},
};
</script>
