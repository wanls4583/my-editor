<!--
 * @Author: lisong
 * @Date: 2021-12-24 11:00:11
 * @Description: 
-->
<template>
	<div @mousedown.stop class="my-editor-search">
		<span class="my-editor-search-left iconfont" title="Toggle Replace mode">&#xe682;</span>
		<div style="flex-grow:1">
			<div class="my-editor-search-top">
				<div class="my-editor-search-input">
					<input type="text" v-model="searchText" />
					<span class="my-editor-search-suffix" title="Match Case(Alt+C)">Aa</span>
					<span class="my-editor-search-suffix iconfont" title="Match Whole Word(Alt+W)">&#xed7d;</span>
				</div>
				<div v-if="count">
					<span>{{now}}</span>
					<span>of</span>
					<span>{{count}}</span>
				</div>
				<span :style="{color:searchText?'red':'#333'}" v-else>No results</span>
			</div>
			<div class="my-editor-search-bottom" style="margin-top:5px" v-if="replaceVisible">
				<div class="my-editor-search-input">
					<input type="text" />
				</div>
				<span class="iconfont" style="margin-right:10px" title="Replace(Enter)">&#xed7e;</span>
				<span class="iconfont" style="margin-right:10px" title="Replace All(Ctrl+Alt+Enter)">&#xed7c;</span>
			</div>
		</div>
		<div class="my-editor-search-right">
			<span class="iconfont" style="margin-right:10px" title="Previous Match(Shift Enter)">&#xe6a9;</span>
			<span class="iconfont" style="margin-right:10px" title="Next Match(Enter)">&#xe6a8;</span>
			<span class="iconfont" title="Close">&#xe69a;</span>
		</div>
	</div>
</template>
<script>
export default {
    name: 'Search',
    props: {
    },
    data() {
        return {
            now: 1,
            count: 0,
            searchText: '',
            replaceVisible: false,
            wholeWord: false,
            ignoreCase: false
        }
    },
    created() {
    },
    methods: {

    }
}
</script>