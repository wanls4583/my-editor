<!--
 * @Author: lisong
 * @Date: 2021-12-24 11:00:11
 * @Description: 
-->
<template>
	<div @contextmenu.prevent @contextmenu.stop @mousedown.stop @selectstart.stop class="my-editor-search">
		<span @click="showReplace" class="my-editor-search-left iconfont" title="Toggle Replace mode">&#xe682;</span>
		<div style="flex-grow:1">
			<div class="my-editor-search-top">
				<div class="my-editor-search-input">
					<input @keydown="onKeyDown" ref="input1" type="text" v-model="searchText" />
					<span :class="{'my-editor-search-active':ignoreCase}" @click="changeCase" class="my-editor-search-suffix" title="Match Case(Alt+C)">Aa</span>
					<span :class="{'my-editor-search-active':wholeWord}" @click="changeWhole" class="my-editor-search-suffix iconfont" title="Match Whole Word(Alt+W)">&#xed7d;</span>
				</div>
				<div v-if="count">
					<span>{{now}}</span>
					<span>&nbsp;of&nbsp;</span>
					<span>{{count}}</span>
				</div>
				<span :style="{color:searchText?'red':'#333'}" v-else>No results</span>
			</div>
			<div class="my-editor-search-bottom" style="margin-top:5px" v-if="replaceVisible">
				<div class="my-editor-search-input">
					<input ref="input2" type="text" />
				</div>
				<span class="iconfont" style="margin-right:10px" title="Replace(Enter)">&#xed7e;</span>
				<span class="iconfont" style="margin-right:10px" title="Replace All(Ctrl+Alt+Enter)">&#xed7c;</span>
			</div>
		</div>
		<div class="my-editor-search-right">
			<span @click="searchPrev" class="iconfont" style="margin-right:10px" title="Previous Match(Shift Enter)">&#xe6a9;</span>
			<span @click="searchNext" class="iconfont" style="margin-right:10px" title="Next Match(Enter)">&#xe6a8;</span>
			<span @click="close" class="iconfont" title="Close">&#xe69a;</span>
		</div>
	</div>
</template>
<script>
export default {
    name: 'Search',
    props: {
        now: {
            type: Number,
            default: 1
        },
        count: {
            type: Number,
            default: 0
        }
    },
    data() {
        return {
            searchText: '',
            replaceVisible: false,
            wholeWord: false,
            ignoreCase: false
        }
    },
    watch: {
        searchText: function (newVal) {
            this.search();
        }
    },
    created() {
    },
    methods: {
        initData(obj) {
            for (let key in obj) {
                this[key] = obj[key];
            }
            this.search();
        },
        search() {
            this.$emit('search', {
                value: this.searchText,
                ignoreCase: this.ignoreCase,
                wholeWord: this.wholeWord
            });
        },
        changeCase() {
            this.ignoreCase = !this.ignoreCase;
            this.search();
        },
        changeWhole() {
            this.wholeWord = !this.wholeWord;
            this.search();
        },
        showReplace() {
            this.replaceVisible = !this.replaceVisible;
        },
        searchNext() {
            this.$emit('next');
        },
        searchPrev() {
            this.$emit('prev');
        },
        close() {
            this.$emit('close');
        },
        focus() {
            this.$nextTick(() => {
                this.$refs.input1.focus();
            });
        },
        onKeyDown(e) {
            if (e.keyCode === 13) {
                this.searchNext();
            }
        }
    }
}
</script>