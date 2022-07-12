<template>
	<div :class="{'my-scroll-clicked': hSliderClicked}" @mousedown="onHBarDown" class="my-scroll-bar-h" ref="bar" v-show="_hScrollAble">
		<div :style="{width: _hSliderWidth + 'px', left: _vSliderLeft + 'px'}" @mousedown="onHsliderDown" class="my-scroll-slider"></div>
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
			hSliderClicked: false,
		};
	},
	computed: {
		_hSliderWidth() {
			let width = (this.barWidth / this.width) * this.barWidth;
			return width > 20 ? width : 20;
		},
		_vSliderLeft() {
			let maxScrollLeft1 = this.barWidth - this._hSliderWidth;
			let maxScrollLeft2 = this.width - this.barWidth;
			return (this.scrollLeft * maxScrollLeft1) / maxScrollLeft2;
		},
		_hScrollAble() {
			return this.width > this.barWidth;
		},
	},
	created() {},
	mounted() {
		this.barWidth = this.$refs.bar.clientWidth;
		this.initResizeEvent();
		this.initEvent();
	},
	beforeDestroy() {
		this.resizeObserver.unobserve(this.$refs.bar);
	},
	destroyed() {
		this.unbindEvent();
		globalData.scheduler.removeUiTask(this.moveHsliderTask);
	},
	methods: {
		initResizeEvent() {
			this.resizeObserver = new ResizeObserver((entries) => {
				if (this.$refs.bar && this.$refs.bar.clientWidth) {
					this.barWidth = this.$refs.bar.clientWidth;
				}
			});
			this.resizeObserver.observe(this.$refs.bar);
		},
		initEvent() {
			this.initEventFn1 = (e) => {
				this.onDocumentMouseMove(e);
			};
			this.initEventFn2 = (e) => {
				this.onDocumentMouseUp(e);
			};
			document.addEventListener('mousemove', this.initEventFn1);
			document.addEventListener('mouseup', this.initEventFn2);
		},
		unbindEvent() {
			document.removeEventListener('mousemove', this.initEventFn1);
			document.removeEventListener('mouseup', this.initEventFn2);
		},
		getScrollLeft(sliderLeft) {
			let maxScrollLeft1 = this.barWidth - this._hSliderWidth;
			let maxScrollLeft2 = this.width - this.barWidth;
			return sliderLeft * (maxScrollLeft2 / maxScrollLeft1);
		},
		onHBarDown(e) {
			if (!this.hSliderClicked) {
				let scrollLeft = e.offsetX - this._hSliderWidth / 2;
				if (scrollLeft > this.barWidth - this._hSliderWidth) {
					scrollLeft = this.barWidth - this._hSliderWidth;
				}
				scrollLeft = scrollLeft < 0 ? 0 : scrollLeft;
				this.$emit('scroll', this.getScrollLeft(scrollLeft));
				this.$nextTick(() => {
					this.onHsliderDown(e);
				});
			}
		},
		onHsliderDown(e) {
			this.vSliderMouseObj = e;
			this.startVSliderLeft = this._vSliderLeft;
			this.hSliderClicked = true;
		},
		onDocumentMouseMove(e) {
			if (this.vSliderMouseObj) {
				let maxScrollLeft1 = this.barWidth - this._hSliderWidth;
				let delta = e.clientX - this.vSliderMouseObj.clientX;
				let left = this.startVSliderLeft;
				left += delta;
				left = left < 0 ? 0 : left;
				left = left > maxScrollLeft1 ? maxScrollLeft1 : left;
				this.startVSliderLeft += delta;
				this.vSliderMouseObj = e;
				this.moveScrollLeft = this.getScrollLeft(left);
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
			this.hSliderClicked = false;
			this.vSliderMouseObj = null;
			this.moveHsliderTask = null;
		},
	},
};
</script>