<!--
 * @Author: lisong
 * @Date: 2021-12-24 11:00:11
 * @Description: 
-->
<template>
	<div @contextmenu.prevent @contextmenu.stop @mousedown.stop @selectstart.stop class="my-search">
		<div @click="showReplace" class="my-search-left active-click" style="border-radius: 0" tabindex="-1">
			<span :class="{ 'icon-chevron-down': replaceVisible, 'icon-chevron-right': !replaceVisible }" class="my-icon" title="Toggle Replace mode"></span>
		</div>
		<div style="flex-grow: 1">
			<div class="my-search-top">
				<div :class="{ 'my-active': input1Focus }" class="my-search-input">
					<textarea
						:style="{ height: input1Height + 'px' }"
						@blur="input1Focus = false"
						@focus="input1Focus = true"
						@input="onInput"
						@keydown="onKeydown"
						ref="input1"
						spellcheck="false"
						type="text"
						v-model="text"
					></textarea>
					<span :class="{ 'my-active': matchCase }" @click="changeCase" class="my-search-suffix my-icon icon-case-sensitive" title="Match Case(Alt+C)"></span>
					<span :class="{ 'my-active': wholeWord }" @click="changeWhole" class="my-search-suffix my-icon icon-whole-word" title="Match Whole Word(Alt+W)"></span>
				</div>
				<div v-if="count">
					<span>{{ now }}</span>
					<span>&nbsp;of&nbsp;</span>
					<span>{{ count }}</span>
				</div>
				<span :class="{ 'my-active': text }" class="no-result" v-else>No results</span>
			</div>
			<div class="my-search-bottom" style="margin-top: 5px" v-if="replaceVisible">
				<div :class="{ 'my-active': input2Focus }" class="my-search-input">
					<textarea :style="{ height: input2Height + 'px' }" @blur="input2Focus = false" @focus="input2Focus = true" @keydown="onKeyDown2" ref="input2" spellcheck="false" type="text" v-model="replaceText"></textarea>
				</div>
				<span
					:class="{ 'enabled-color': count > 0, 'disabled-color': count == 0 }"
					@click="replace"
					class="my-icon icon-replace active-click"
					style="margin-right: 5px"
					tabindex="-1"
					title="Replace(Enter)"
				></span>
				<span
					:class="{ 'enabled-color': count > 0, 'disabled-color': count == 0 }"
					@click="replaceAll"
					class="my-icon icon-replace-all active-click"
					style="margin-right: 5px"
					tabindex="-1"
					title="Replace All(Ctrl+Alt+Enter)"
				></span>
			</div>
		</div>
		<div class="my-search-right">
			<span
				:class="{ 'enabled-color': count > 0, 'disabled-color': count == 0 }"
				@blur="preFocus = false"
				@click="searchPrev"
				@focus="preFocus = true"
				class="my-icon icon-arrow-up active-click"
				style="margin-right: 5px"
				tabindex="-1"
				title="Previous Match(Shift Enter)"
			></span>
			<span
				:class="{ 'enabled-color': count > 0, 'disabled-color': count == 0 }"
				@blur="nextFocus = false"
				@click="searchNext"
				@focus="nextFocus = true"
				class="my-icon icon-arrow-down active-click"
				style="margin-right: 5px"
				tabindex="-1"
				title="Next Match(Enter)"
			></span>
			<span @click="close" class="my-icon icon-chrome-close active-click" title="Close"></span>
		</div>
	</div>
</template>
<script>
import $ from 'jquery';
export default {
	name: 'Search',
	data() {
		return {
			text: '',
			replaceText: '',
			replaceVisible: false,
			wholeWord: false,
			matchCase: false,
			searchPrevActive: false,
			searchNextActive: false,
			input1Focus: false,
			input2Focus: false,
			preFocus: false,
			nextFocus: false,
			input1Height: 30,
			input2Height: 30,
			count: 0,
			now: 0,
		};
	},
	watch: {
		text() {
			let lines = this.text.split(/\r*\n/);
			this.input1Height = lines.length * 20 + 10;
		},
		replaceText() {
			let lines = this.replaceText.split(/\r*\n/);
			this.input2Height = lines.length * 20 + 10;
		},
	},
	created() {
		this.editor = this.$parent;
		$(document).on(
			'keydown',
			(this.keydownFn = (e) => {
				if (e.keyCode === 13 || e.keyCode === 100) {
					if (this.preFocus) {
						this.searchPrev();
					} else if (this.nextFocus) {
						this.searchNext();
					}
				}
			})
		);
	},
	destroyed() {
		this.editor = null;
		$(document).unbind('keydown', this.keydownFn);
	},
	methods: {
		initData(obj) {
			for (let key in obj) {
				this[key] = obj[key];
			}
		},
		getData() {
			return {
				text: this.text,
				wholeWord: this.wholeWord,
				matchCase: this.matchCase,
			};
		},
		search() {
			clearTimeout(this.searchTimer);
			this.searchTimer = setTimeout(() => {
				this.editor.fSearcher.clearSearch();
				this.searchText({
					config: {
						text: this.text,
						matchCase: this.matchCase,
						wholeWord: this.wholeWord,
					},
				});
			}, 100);
		},
		searchText(option) {
			let resultObj = this.editor.fSearcher.search(option);
			if (resultObj) {
				this.now = resultObj.now;
				this.count = resultObj.count;
			} else {
				this.count = 0;
			}
		},
		searchWord(direct) {
			let resultObj = null;
			if (this.editor.fSelecter.activedRanges.size === 0) {
				let searchConfig = this.editor.fSearcher.getSearchConfig();
				if (searchConfig) {
					this.editor.fSearcher.clearSearch();
					this.text = searchConfig.text;
					this.wholeWord = searchConfig.wholeWord;
					this.matchCase = searchConfig.matchCase;
					resultObj = this.editor.fSearcher.search({ direct: direct, active: true });
				}
			} else {
				resultObj = this.editor.fSearcher.search({ direct: direct, active: true });
			}
			if (resultObj) {
				this.now = resultObj.now;
				this.count = resultObj.count;
			}
		},
		changeCase() {
			this.matchCase = !this.matchCase;
			this.focus();
			this.onInput();
		},
		changeWhole() {
			this.wholeWord = !this.wholeWord;
			this.focus();
			this.onInput();
		},
		showReplace() {
			this.replaceVisible = !this.replaceVisible;
		},
		searchNext() {
			if (!this.count) {
				return;
			}
			this.searchText({ direct: 'next' });
		},
		searchPrev() {
			if (!this.count) {
				return;
			}
			this.searchText({ direct: 'up' });
		},
		replace() {
			if (this.editor.fSelecter.activedRanges.size) {
				let range = this.editor.fSearcher.getNowRange();
				this.editor.myContext.replace(this.replaceText, [range]);
				this.searchText();
			}
		},
		replaceAll() {
			if (this.editor.fSelecter.ranges.size) {
				this.editor.myContext.replace(this.replaceText, this.editor.fSelecter.ranges.toArray());
				this.editor.fSearcher.clearSearch();
				this.count = 0;
			}
		},
		close() {
			this.editor.focus();
			// 复制搜索框的结果到普通选区
			if (this.editor.fSelecter.activedRanges.size) {
				this.editor.searcher.clone(this.editor.fSearcher.getCacheData());
			}
			this.editor.fSearcher.clearSearch();
			this.editor.searchVisible = false;
		},
		focus() {
			requestAnimationFrame(() => {
				this.$refs.input1.focus();
				this.$refs.input1.select();
			});
		},
		directBlur() {
			this.searchPrevActive = false;
			this.searchNextActive = false;
		},
		onKeydown(e) {
			if (e.keyCode === 13 || e.keyCode === 100) {
				e.preventDefault();
				if (e.shiftKey) {
					this.searchPrev();
				} else {
					this.searchNext();
				}
			}
		},
		onKeyDown2(e) {
			if (e.keyCode === 13 || e.keyCode === 100) {
				e.preventDefault();
				if (this.count) {
					if (e.ctrlKey && e.altKey) {
						this.replaceAll();
					} else {
						this.replace();
					}
				}
			}
		},
		onInput() {
			this.search();
		},
	},
};
</script>