<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
	<div class="side-tree">
		<div @click.stop="onClickItem(item)" class="side-item" v-for="item in list">
			<template v-if="item.type==='dir'">
				<div :class="{'active':item.active}" :style="{'padding-left':_paddingLeft}" class="side-item-title">
					<span class="left-icon iconfont icon-down1" v-if="item.open"></span>
					<span class="left-icon iconfont icon-right" v-else></span>
					<span class="side-item-text" style="margin-left:4px">{{item.name}}</span>
				</div>
				<side-tree :deep="deep+1" :list="item.children" v-if="item.open"></side-tree>
			</template>
			<div :class="{'active':item.active}" :style="{'padding-left':_paddingLeft}" class="side-item-title" v-else>{{item.name}}</div>
		</div>
	</div>
</template>
<script>
export default {
    name: 'SideTree',
    props: {
        list: {
            type: Array
        },
        deep: {
            type: Number,
            default: 1
        }
    },
    inject: ['rootList'],
    data() {
        return {
        }
    },
    computed: {
        _paddingLeft() {
            return this.deep * 20 + 'px';
        },
    },
    mounted() {
    },
    methods: {
        onClickItem(item) {
            this.inActive(this.rootList);
            item.open = !item.open;
            item.active = true;
        },
        inActive(list) {
            list.map(item => {
                item.active = false;
                item.children && this.inActive(item.children);
            });
        }
    }
}
</script>>