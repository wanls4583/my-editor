<!--
 * @Author: lisong
 * @Date: 2022-11-12 13:15:02
 * @Description: 
-->
<template>
	<div class="my-minimap" ref="wrap">
		<canvas :height="height" ref="canvas" width="220"></canvas>
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
		maxVisibleLines: Number,
		scrollTop: Number,
	},
	data() {
		return {
			startLine: 1,
			height: 100,
			scale: 0.1,
			ratio: 2,
		};
	},
	watch: {
		contentHeight() {},
		maxVisibleLines() {},
		scrollTop() {},
	},
	created() {},
	mounted() {
		this.ctx = this.$refs.canvas.getContext('2d');
		this.initEvent();
	},
	methods: {
		initEvent() {
			this.initResizeEvent();
		},
		initResizeEvent() {
			const resizeObserver = new ResizeObserver((entries) => {
				if (this.$refs.wrap) {
					this.height = this.$refs.wrap.clientHeight * this.ratio;
					this.$nextTick(() => {
						this.ctx.restore();
						this.ctx.save();
						this.ctx.scale(this.scale, this.scale);
					});
				}
			});
			resizeObserver.observe(this.$refs.wrap);
		},
		drawLine(line) {
			let charHight = this.$parent.charObj.charHight * this.ratio;
			let lineObj = this.$parent.myContext.htmls[line - 1];
			let tokens = lineObj.tokens;
			let top = (line - this.startLine) * charHight + charHight / 2;
			this.ctx.font = `${14 * this.ratio}px Consolas`;
			this.ctx.textBaseline = 'middle';
			if (tokens) {
				let left = 0;
				tokens.forEach((token) => {
					let text = lineObj.text.slice(token.startIndex, token.endIndex);
					this.ctx.fillStyle = globalData.colors['editor.foreground'];
					if (token.scopeId) {
						let scope = globalData.scopeIdMap[token.scopeId];
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
		},
	},
};
</script>
