<!--
 * @Author: lisong
 * @Date: 2021-12-24 11:00:11
 * @Description: 
-->
<template>
	<div :style="styles" @mousedown.stop @wheel.stop class="my-auto" ref="auto">
		<div>
			<div :class="{'my-active': item.active}" @mousedown="onClick(item)" class="my-auto-item my-center-between my-hover" v-for="item in tipList">
				<div class="my-center-between">
					<div :class="[item.icon]" class="my-auto-icon my-center-center iconfont"></div>
					<div class="my-auto-content">
						<span v-html="_html(item)"></span>
					</div>
				</div>
				<div class="my-auto-desc">{{item.desc}}</div>
			</div>
		</div>
	</div>
</template>
<script>
export default {
    name: 'AutoTip',
    props: {
        tipList: {
            type: Array,
            default: []
        },
        styles: {
            type: Object
        },
    },
    data() {
        return {
            nowIndex: 0,
            itemHeight: 25
        }
    },
    computed: {
        _html() {
            return (item) => {
                let index = 0;
                let html = '';
                item.indexs.forEach((_index) => {
                    html += item.result.slice(index, _index);
                    html += `<span class="match-char">${item.result[_index]}</span>`;
                    index = _index + 1;
                });
                return html + item.result.slice(index);
            }
        }
    },
    watch: {
        nowIndex() {
            let $auto = this.$refs.auto;
            let height = (this.nowIndex + 1) * this.itemHeight;
            if ($auto && height > $auto.clientHeight + $auto.scrollTop) {
                $auto.scrollTop = height - $auto.clientHeight;
            } else if ($auto && height < $auto.scrollTop + this.itemHeight) {
                $auto.scrollTop = height - this.itemHeight;
            }
        }
    },
    created() {
    },
    methods: {
        onClick(item) {
            this.$emit('change', item);
        },
        prev() {
            let index = this.getActiveIndex();
            this.tipList[index].active = false;
            index = index - 1;
            index = index < 0 ? this.tipList.length - 1 : index;
            this.tipList[index].active = true;
            this.nowIndex = index;
        },
        next() {
            let index = this.getActiveIndex();
            this.tipList[index].active = false;
            index = index + 1;
            index = index > this.tipList.length - 1 ? 0 : index;
            this.tipList[index].active = true;
            this.nowIndex = index;
        },
        getActiveIndex() {
            for (let i = 0; i < this.tipList.length; i++) {
                if (this.tipList[i].active) {
                    return i;
                }
            }
        }
    }
}
</script>
<style lang="scss" scoped>
.icon-function {
    color: #a6e22e;
}
.icon-class {
    color: gold;
}
.icon-property {
    color: lightskyblue;
}
.icon-value {
    color: lightblue;
}
</style>