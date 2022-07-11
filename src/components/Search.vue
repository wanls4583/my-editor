<!--
 * @Author: lisong
 * @Date: 2021-12-24 11:00:11
 * @Description: 
-->
<template>
	<div @contextmenu.prevent @contextmenu.stop @mousedown.stop @selectstart.stop class="my-search">
		<div @click="showReplace" class="my-search-left active-click" style="border-radius: 0" tabindex="-1">
			<span :class="{ 'icon-down1': replaceVisible, 'icon-right': !replaceVisible }" class="iconfont" style="font-size: 14px" title="Toggle Replace mode"></span>
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
					<span :class="{ 'my-active': matchCase }" @click="changeCase" class="my-search-suffix" title="Match Case(Alt+C)">Aa</span>
					<span :class="{ 'my-active': wholeWord }" @click="changeWhole" class="my-search-suffix iconfont icon-whole-word" title="Match Whole Word(Alt+W)"></span>
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
					class="iconfont icon-replace active-click"
					style="margin-right: 5px"
					tabindex="-1"
					title="Replace(Enter)"
				></span>
				<span
					:class="{ 'enabled-color': count > 0, 'disabled-color': count == 0 }"
					@click="replaceAll"
					class="iconfont icon-replace-all active-click"
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
				class="iconfont icon-up active-click"
				style="margin-right: 5px"
				tabindex="-1"
				title="Previous Match(Shift Enter)"
			></span>
			<span
				:class="{ 'enabled-color': count > 0, 'disabled-color': count == 0 }"
				@blur="nextFocus = false"
				@click="searchNext"
				@focus="nextFocus = true"
				class="iconfont icon-down active-click"
				style="margin-right: 5px"
				tabindex="-1"
				title="Next Match(Enter)"
			></span>
			<span @click="close" class="iconfont icon-close active-click" title="Close"></span>
		</div>
	</div>
</template>
<script>
import $ from 'jquery';
export default {
	name: 'Search',
	props: {
		now: {
			type: Number,
			default: 1,
		},
		count: {
			type: Number,
			default: 0,
		},
	},
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
		};
	},
	watch: {
		text() {
			let lines = this.text.split(/\n/);
			this.input1Height = lines.length * 20 + 10;
		},
		replaceText() {
			let lines = this.replaceText.split(/\n/);
			this.input2Height = lines.length * 20 + 10;
		},
	},
	created() {
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
			let searchId = this.search.id || 1;
			this.search.id = searchId;
			this.$nextTick(() => {
				if (this.search.id !== searchId) {
					return;
				}
				this.$emit('search', {
					text: this.text,
					matchCase: this.matchCase,
					wholeWord: this.wholeWord,
				});
			});
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
			this.$emit('next');
		},
		searchPrev() {
			if (!this.count) {
				return;
			}
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
			this.$refs.input1.focus();
			requestAnimationFrame(() => {
				this.$refs.input1.focus();
			});
		},
		directBlur() {
			this.searchPrevActive = false;
			this.searchNextActive = false;
		},
		onKeydown(e) {
			if (e.keyCode === 13 || e.keyCode === 100) {
				e.preventDefault();
				if(e.shiftKey) {
					this.$emit('prev');
				} else {
					this.$emit('next');
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
			clearTimeout(this.searchTimer);
			this.searchTimer = setTimeout(() => {
				this.search();
			}, 100);
		},
	},
};
</script>