<!--
 * @Author: lisong
 * @Date: 2022-03-09 17:17:02
 * @Description: 
-->
<template>
	<div class="my-side-search">
		<div class="my-search-wrap">
			<div class="my-search-condition">
				<div class="side-search-title my-shadow">SEARCH</div>
				<div style="position: relative; padding: 0 10px 0 20px">
					<div @click="replaceVisible = !replaceVisible" class="my-search-left active-click" style="border-radius: 0" tabindex="-1">
						<span :class="{ 'my-icon-down': replaceVisible, 'my-icon-right': !replaceVisible }" class="my-icon" title="Toggle Replace mode"></span>
					</div>
					<div :class="{ 'my-active': input1Focus }" class="my-search-input">
						<textarea
							:style="{ height: input1Height + 'px' }"
							@blur="input1Focus = false"
							@focus="input1Focus = true"
							@keydown="onKeyDown1"
							placeholder="Search"
							ref="input1"
							spellcheck="false"
							type="text"
							v-model="text"
						></textarea>
						<span :class="{ 'my-active': matchCase }" @click="changeCase" class="my-search-suffix" title="Match Case(Alt+C)">Aa</span>
						<span :class="{ 'my-active': wholeWord }" @click="changeWhole" class="my-search-suffix iconfont icon-whole-word" title="Match Whole Word(Alt+W)"></span>
					</div>
					<div class="my-center-start" style="margin-top: 10px" v-show="replaceVisible">
						<div :class="{ 'my-active': input2Focus }" class="my-search-input" style="flex-grow: 1">
							<textarea
								:style="{ height: input2Height + 'px' }"
								@blur="input2Focus = false"
								@focus="input2Focus = true"
								@keydown="onKeyDown2"
								placeholder="Replace"
								ref="input2"
								spellcheck="false"
								type="text"
								v-model="replaceText"
							></textarea>
						</div>
						<span
							:class="{ 'enabled-color': results.length > 0, 'disabled-color': results.length == 0 }"
							@click="replaceAll"
							class="iconfont icon-replace-all active-click"
							style="margin-left: 10px"
							tabindex="-1"
							title="Replace All(Ctrl+Alt+Enter)"
						></span>
					</div>
				</div>
				<div style="padding: 0 10px 0 20px">
					<div style="line-height: 30px">files to exclude</div>
					<div :class="{ 'my-active': input3Focus }" class="my-search-input">
						<textarea
							:style="{ height: input3Height + 'px' }"
							@blur="input3Focus = false"
							@focus="input3Focus = true"
							@keydown="onKeyDown3"
							ref="input2"
							spellcheck="false"
							type="text"
							v-model="includePath"
						></textarea>
					</div>
					<div style="line-height: 30px">files to include</div>
					<div :class="{ 'my-active': input4Focus }" class="my-search-input">
						<textarea
							:style="{ height: input4Height + 'px' }"
							@blur="input4Focus = false"
							@focus="input4Focus = true"
							@keydown="onKeyDown4"
							ref="input2"
							spellcheck="false"
							type="text"
							v-model="excludePath"
						></textarea>
					</div>
					<div class="my-center-between" style="height: 30px; line-height: 30px">
						<span v-if="count">{{ count }} results in {{ results.length }} files</span>
						<span @click="stopSeach" class="stop-search" v-if="count&&searching">stop</span>
					</div>
				</div>
			</div>
			<file-content-search-results :list="results" ref="results"></file-content-search-results>
		</div>
		<div class="my-search-replacing" v-if="replacing"></div>
	</div>
</template>
<script>
import EventBus from '@/event';
import FileContentSearchResults from './FileContentSearchResults.vue';
import Util from '@/common/util';

const path = window.require('path');
const child_process = window.require('child_process');

export default {
	components: {
		FileContentSearchResults,
	},
	data() {
		return {
			text: '',
			replaceText: '',
			replaceVisible: true,
			wholeWord: false,
			matchCase: false,
			input1Focus: false,
			input2Focus: false,
			input3Focus: false,
			input4Focus: false,
			replacing: false,
			searching: false,
			input1Height: 30,
			input2Height: 30,
			input3Height: 30,
			input4Height: 30,
			includePath: '',
			excludePath: '',
			results: [],
			count: 0,
		};
	},
	watch: {
		text() {
			let lines = this.text.split(/\n/);
			this.input1Height = lines.length * 20 + 10;
			this.search();
		},
		includePath() {
			this.search();
		},
		excludePath() {
			this.search();
		},
		replaceText() {
			let lines = this.replaceText.split(/\n/);
			this.input2Height = lines.length * 20 + 10;
		},
	},
	created() {
		this.wholeWordPattern = new RegExp(`^(${globalData.defaultWordPattern.source})$`);
		this.initEvent();
	},
	mounted() {},
	methods: {
		initEvent() {
			EventBus.$on('find-in-folder', (option) => {
				option = option || {};
				if (option.path) {
					this.includePath = option.path;
				}
				if (option.replace) {
					this.replaceVisible = true;
				}
				requestAnimationFrame(() => {
					this.$refs.input1.focus();
				});
			});
		},
		createSearch() {
			let searcher = child_process.fork(path.join(globalData.dirname, 'main/process/search/index.js'));
			let results = [];
			searcher.on('message', (data) => {
				if (data === 'end') {
					this.stopSeach();
				} else {
					data.results.forEach((item) => {
						item.open = false;
						item.active = false;
						this.count += 1;
						results.push(item);
						// 搜索完一个文件
						if (item.path) {
							let file = { id: item.id, name: item.name, path: item.path, children: results, open: true };
							this.results.push(file);
							this.addQueue.push(file);
							results.forEach((_item) => {
								_item.id = item.id;
								_item.name = item.name;
								_item.path = item.path;
							});
							results = [];
							this.addResults();
						}
					});
					// 最多搜索30000个结果
					if(this.count > 30000) {
						this.stopSeach();
					}
				}
			});
			return searcher;
		},
		addResults() {
			if (!this.addTimer) {
				this.addTimer = setTimeout(() => {
					this.$refs.results.addResults(this.addQueue);
					this.addQueue = [];
					this.addTimer = null;
				}, 60);
			}
		},
		search() {
			clearTimeout(this.searchTimer);
			this.stopSeach();
			this.results = [];
			this.addQueue = [];
			this.count = 0;
			if (!this.includePath || !this.text || (this.excludePath && this.includePath.startsWith(this.excludePath))) {
				return;
			}
			this.searchTimer = setTimeout(() => {
				this.searching = true;
				this.searchingText = this.text;
				this.searcher = this.createSearch();
				this.searcher.send({
					path: this.parsePath(this.includePath),
					excludePath: this.parsePath(this.excludePath),
					matchCase: this.matchCase,
					wholeWord: this.wholeWord,
					text: this.text,
				});
				this.$refs.results.clear();
			}, 300);
		},
		stopSeach() {
			this.searching = false;
			if (this.searcher) {
				let searcher = this.searcher;
				this.searcher = null;
				searcher.kill();
			}
		},
		changeCase() {
			this.matchCase = !this.matchCase;
			this.search();
		},
		changeWhole() {
			this.wholeWord = !this.wholeWord;
			this.search();
		},
		replaceAll() {
			if (!this.results.length || this.searching) {
				return;
			}
			let reg = this.text.replace(/\\|\.|\*|\+|\-|\?|\(|\)|\[|\]|\{|\}|\^|\$|\~|\!|\&|\|/g, '\\$&');
			if (!/\n/.test(reg) && this.wholeWordPattern.test(reg) && this.wholeWord) {
				reg = '(?:\\b|(?<=[^0-9a-zA-Z]))' + reg + '(?:\\b|(?=[^0-9a-zA-Z]))';
			}
			reg = new RegExp(reg, this.matchCase ? 'igm' : 'gm');
			this.replacing = true;
			_replace.call(this, this.results);

			function _replace(results) {
				if (!results.length) {
					this.replacing = false;
					this.search();
					return;
				}
				let filePath = results.shift().path;
				Util.readFile(filePath).then((text) => {
					text = text.replace(reg, this.replaceText);
					Util.writeFile(filePath, text).then(() => {
						_replace.call(this, results);
					});
				});
			}
		},
		parsePath(dirPath) {
			const fileTree = globalData.fileTree;
			dirPath = dirPath || '';
			if (!dirPath) {
				return dirPath;
			}
			let res = /^\.[\\\/]([^\\\/]+)(?:[\\\/]|$)/.exec(dirPath);
			if (res) {
				let project = (res && res[1]) || '';
				for (let i = 0; i < fileTree.length; i++) {
					if (project === fileTree[i].name) {
						dirPath = path.join(fileTree[i].path, dirPath.slice(res[1].length + 2));
						break;
					}
				}
			}
			try {
				dirPath = path.normalize(dirPath);
				dirPath = path.parse(dirPath);
				dirPath = path.join(dirPath.dir, dirPath.base);
			} catch (e) {
				dirPath = '';
			}
			return dirPath;
		},
		onKeyDown1(e) {
			if (e.keyCode === 13 || e.keyCode === 100) {
				e.preventDefault();
				this.search();
			}
		},
		onKeyDown2(e) {
			if (e.keyCode === 13 || e.keyCode === 100) {
				e.preventDefault();
				this.search();
			}
		},
		onKeyDown3(e) {
			if (e.keyCode === 13 || e.keyCode === 100) {
				e.preventDefault();
				this.search();
			}
		},
		onKeyDown4(e) {
			if (e.keyCode === 13 || e.keyCode === 100) {
				e.preventDefault();
				this.search();
			}
		},
	},
};
</script>
