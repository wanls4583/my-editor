<!--
 * @Author: lisong
 * @Date: 2021-12-24 11:00:11
 * @Description: 
-->
<template>
	<div @contextmenu.prevent @contextmenu.stop @mousedown.stop @selectstart.stop class="my-editor-search">
		<div class="my-editor-search-left">
			<span @click="showReplace" class="iconfont" style="font-size:14px" title="Toggle Replace mode">{{replaceVisible?'&#xe61a;':'&#xe682;'}}</span>
		</div>
		<div style="flex-grow:1">
			<div class="my-editor-search-top">
				<div :class="{'active-border':input1Focus}" class="my-editor-search-input">
					<input @blur="input1Focus=false" @focus="input1Focus=true" @keydown="onKeyDown" ref="input1" type="text" v-model="searchText" />
					<span :class="{'active-suffix':ignoreCase}" @click="changeCase" class="my-editor-search-suffix" title="Match Case(Alt+C)">Aa</span>
					<span :class="{'active-suffix':wholeWord}" @click="changeWhole" class="my-editor-search-suffix iconfont" title="Match Whole Word(Alt+W)">&#xed7d;</span>
				</div>
				<div v-if="count">
					<span>{{now}}</span>
					<span>&nbsp;of&nbsp;</span>
					<span>{{count}}</span>
				</div>
				<span :style="{color:searchText?'red':'#333'}" v-else>No results</span>
			</div>
			<div class="my-editor-search-bottom" style="margin-top:5px" v-if="replaceVisible">
				<div :class="{'active-border':input2Focus}" class="my-editor-search-input">
					<input @blur="input2Focus=false" @focus="input2Focus=true" @keydown="onKeyDown2" ref="input2" type="text" v-model="replaceText" />
				</div>
				<span
					:class="{'enabled-color':count>0,'disabled-color':count==0}"
					@click="replace"
					class="iconfont active-click"
					style="margin-right:5px"
					title="Replace(Enter)"
				>&#xed7e;</span>
				<span
					:class="{'enabled-color':count>0,'disabled-color':count==0}"
					@click="replaceAll"
					class="iconfont active-click"
					style="margin-right:5px"
					title="Replace All(Ctrl+Alt+Enter)"
				>&#xed7c;</span>
			</div>
		</div>
		<div class="my-editor-search-right">
			<span
				:class="{'active-border':searchPrevActive,'enabled-color':count>0,'disabled-color':count==0}"
				@click="searchPrev"
				class="iconfont"
				style="margin-right:5px"
				title="Previous Match(Shift Enter)"
			>&#xe6a9;</span>
			<span
				:class="{'active-border':searchNextActive,'enabled-color':count>0,'disabled-color':count==0}"
				@click="searchNext"
				class="iconfont"
				style="margin-right:5px"
				title="Next Match(Enter)"
			>&#xe6a8;</span>
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
            replaceText: '',
            replaceVisible: false,
            wholeWord: false,
            ignoreCase: false,
            searchPrevActive: false,
            searchNextActive: false,
            input1Focus: false,
            input2Focus: false,
        }
    },
    watch: {
        searchText: function (newVal) {
            this.search(100);
        },
        wholeWord: function (newVal) {
            if (newVal) {
                this.focus();
            }
        },
        ignoreCase: function (newVal) {
            if (newVal) {
                this.focus();
            }
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
        search(delay) {
            clearTimeout(this.search.timer);
            this.search.timer = setTimeout(() => {
                this.$emit('search', {
                    text: this.searchText,
                    ignoreCase: this.ignoreCase,
                    wholeWord: this.wholeWord
                });
            }, delay || 0);
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
            if (!this.count) {
                return;
            }
            this.searchNextActive = true;
            this.focus();
            this.$emit('next');
        },
        searchPrev() {
            if (!this.count) {
                return;
            }
            this.searchPrevActive = true;
            this.focus();
            this.$emit('prev');
        },
        replace() {
            if (!this.count) {
                return;
            }
            this.$emit('replace', { text: this.replaceText });
        },
        replaceAll() {
            if (!this.count) {
                return;
            }
            this.$emit('replaceAll', { text: this.replaceText });
        },
        close() {
            this.$emit('close');
        },
        focus() {
            this.$nextTick(() => {
                this.$refs.input1.focus();
            });
        },
        directBlur() {
            this.searchPrevActive = false;
            this.searchNextActive = false;
        },
        onKeyDown(e) {
            if (!this.count) {
                return;
            }
            if (e.keyCode === 13 || e.keyCode === 100) {
                if (this.searchPrevActive || !this.searchNextActive && e.shiftKey) {
                    this.$emit('prev');
                } else {
                    this.$emit('next');
                }
            }
        },
        onKeyDown2(e) {
            if (!this.count) {
                return;
            }
            if (e.keyCode === 13) {
                if (e.ctrlKey && e.altKey) {
                    this.replaceAll();
                } else {
                    this.replace();
                }
            }
        },
    }
}
</script>