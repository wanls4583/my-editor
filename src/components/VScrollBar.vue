<template>
	<div :class="{'my-display-block': vSliderClicked}" class="my-scroll-bar-v" ref="bar">
		<div :style="{height: _vSliderHeight + 'px', top: _vSliderTop + 'px'}" @mousedown="onVsliderDown" class="my-scroll-slider"></div>
	</div>
</template>
<script>
export default {
	name: 'VScrollBar',
	props: {
		height: {
			type: Number,
			default: 0,
		},
		scrollTop: {
			type: Number,
			default: 0,
		},
	},
	data() {
		return {
			barHeight: 0,
			vSliderClicked: false,
		};
	},
	computed: {
		_vSliderHeight() {
			let height = (this.barHeight / this.height) * this.barHeight;
			return height > 20 ? height : 20;
		},
		_vSliderTop() {
			let maxScrollTop1 = this.barHeight - this._vSliderHeight;
			let maxScrollTop2 = this.height - this.barHeight;
			return (this.scrollTop * maxScrollTop1) / maxScrollTop2;
		},
	},
	created() {},
	mounted() {
		this.barHeight = this.$refs.bar.clientHeight;
		this.initResizeEvent();
		this.initEvent();
	},
	destroyed() {
		this.unbindEvent();
	},
	methods: {
		initResizeEvent() {
			const resizeObserver = new ResizeObserver((entries) => {
				if (this.$refs.bar && this.$refs.bar.clientHeight) {
					this.barHeight = this.$refs.bar.clientHeight;
				}
			});
			resizeObserver.observe(this.$refs.bar);
		},
		initEvent() {
			this.initEventFn1 = (e) => {
				this.$parent.active && this.onDocumentMouseMove(e);
			};
			this.initEventFn2 = (e) => {
				this.$parent.active && this.onDocumentMouseUp(e);
			};
			document.addEventListener('mousemove', this.initEventFn1);
			document.addEventListener('mouseup', this.initEventFn2);
		},
		unbindEvent() {
			document.removeEventListener('mousemove', this.initEventFn1);
			document.removeEventListener('mouseup', this.initEventFn2);
		},
		onVsliderDown(e) {
			this.vSliderMouseObj = e;
			this.startVSliderTop = this._vSliderTop;
			this.vSliderClicked = true;
		},
		onDocumentMouseMove(e) {
			if (this.vSliderMouseObj) {
				let maxScrollTop1 = this.barHeight - this._vSliderHeight;
				let maxScrollTop2 = this.height - this.barHeight;
				let delta = e.clientY - this.vSliderMouseObj.clientY;
				let top = this.startVSliderTop;
				top += delta;
				top = top < 0 ? 0 : top;
				top = top > maxScrollTop1 ? maxScrollTop1 : top;
				this.startVSliderTop += delta;
				this.vSliderMouseObj = e;
				this.moveScrollTop = top * (maxScrollTop2 / maxScrollTop1);
				if (this.moveScrollTop && !this.moveVsliderTask) {
					this.moveVsliderTask = globalData.scheduler.addUiTask(() => {
						if (this.moveScrollTop >= 0 && this.moveScrollTop !== this.scrollTop) {
							this.$emit('scroll', this.moveScrollTop);
							this.moveScrollTop = -1;
						} else {
							globalData.scheduler.removeUiTask(this.moveVsliderTask);
							this.moveVsliderTask = null;
						}
					});
				}
			}
		},
		onDocumentMouseUp(e) {
			globalData.scheduler.removeUiTask(this.moveVsliderTask);
			this.vSliderClicked = false;
			this.vSliderMouseObj = null;
			this.moveVsliderTask = null;
		},
	},
};
</script>