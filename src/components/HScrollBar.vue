<template>
	<div :class="{'my-display-block': vSliderClicked}" class="my-scroll-bar-h" ref="bar">
		<div :style="{width: _vSliderWidth + 'px', left: _vSliderLeft + 'px'}" @mousedown="onVsliderDown" class="my-scroll-slider"></div>
	</div>
</template>
<script>
export default {
	name: 'HScrollBar',
	props: {
		width: {
			type: Number,
			default: 0,
		},
		scrollLeft: {
			type: Number,
			default: 0,
		},
	},
	data() {
		return {
			barWidth: 0,
			vSliderClicked: false,
		};
	},
	computed: {
		_vSliderWidth() {
			let width = (this.barWidth / this.width) * this.barWidth;
			return width > 20 ? width : 20;
		},
		_vSliderLeft() {
			let maxScrollLeft1 = this.barWidth - this._vSliderWidth;
			let maxScrollLeft2 = this.width - this.barWidth;
			return (this.scrollLeft * maxScrollLeft1) / maxScrollLeft2;
		},
	},
	created() {},
	mounted() {
		this.barWidth = this.$refs.bar.clientWidth;
		this.initResizeEvent();
		this.initEvent();
	},
	destroyed() {
		this.unbindEvent();
	},
	methods: {
		initResizeEvent() {
			const resizeObserver = new ResizeObserver((entries) => {
				if (this.$refs.bar && this.$refs.bar.clientWidth) {
					this.barWidth = this.$refs.bar.clientWidth;
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
			this.startVSliderLeft = this._vSliderLeft;
			this.vSliderClicked = true;
		},
		onDocumentMouseMove(e) {
			if (this.vSliderMouseObj) {
				let maxScrollLeft1 = this.barWidth - this._vSliderWidth;
				let maxScrollLeft2 = this.width - this.barWidth;
				let delta = e.clientX - this.vSliderMouseObj.clientX;
				let left = this.startVSliderLeft;
				left += delta;
				left = left < 0 ? 0 : left;
				left = left > maxScrollLeft1 ? maxScrollLeft1 : left;
				this.startVSliderLeft += delta;
				this.vSliderMouseObj = e;
				this.moveScrollLeft = left * (maxScrollLeft2 / maxScrollLeft1);
				if (this.moveScrollLeft && !this.moveHsliderTask) {
					this.moveHsliderTask = globalData.scheduler.addUiTask(() => {
						if (this.moveScrollLeft >= 0 && this.moveScrollLeft !== this.scrollLeft) {
							this.$emit('scroll', this.moveScrollLeft);
							this.moveScrollLeft = -1;
						} else {
							globalData.scheduler.removeUiTask(this.moveHsliderTask);
							this.moveHsliderTask = null;
						}
					});
				}
			}
		},
		onDocumentMouseUp(e) {
			globalData.scheduler.removeUiTask(this.moveHsliderTask);
			this.vSliderClicked = false;
			this.vSliderMouseObj = null;
			this.moveHsliderTask = null;
		},
	},
};
</script>