<!--
 * @Author: lisong
 * @Date: 2021-12-24 11:00:11
 * @Description: 
-->
<template>
	<div :style="styles" @mousedown.stop class="my-auto">
		<div class="my-light-bg">
			<div :class="{active: item.active}" @mousedown="onClick(item)" class="my-auto-item" v-for="item in tipList">
				<div class="my-auto-icon"></div>
				<div class="my-auto-content">
					<span v-html="_html(item)"></span>
				</div>
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
        // tipList(newVal) {
        // }
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
        },
        next() {
            let index = this.getActiveIndex();
            this.tipList[index].active = false;
            index = index + 1;
            index = index > this.tipList.length - 1 ? 0 : index;
            this.tipList[index].active = true;
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