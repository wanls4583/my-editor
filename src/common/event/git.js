import EventBus from '@/event';
import globalData from '@/data/globalData';

const fs = window.require('fs');
const path = window.require('path');
const SimpleGit = window.require('simple-git');

export default class {
	constructor() {
		this.cwd = '';
		this.simpleGit = new SimpleGit();
		this.gitTimerMap = {};
		this.init();
	}
	init() {
		EventBus.$on('git-status', fileObj => {
			if (!fs.existsSync(path.join(fileObj.path, '.git'))) {
				return;
			}
			this.gitTimerMap[fileObj.path] = setTimeout(() => {
				if (this.cwd != fileObj.path) {
					this.simpleGit.cwd(fileObj.path);
				}
				this.simpleGit.status().then(result => {
					let untracked = {};
					let added = {};
					let conflicted = {};
					let modified = {};
					let deleted = {};
					let renamed = {};
					if (result.not_added.length) {
						result.not_added.forEach(item => {
							_addPathMap(item, untracked);
						});
						untracked[''] = true;
					}
					if (result.created.length) {
						result.created.forEach(item => {
							_addPathMap(item, added);
						});
						added[''] = true;
					}
					if (result.conflicted.length) {
						result.conflicted.forEach(item => {
							_addPathMap(item, conflicted);
						});
						conflicted[''] = true;
					}
					if (result.modified.length) {
						result.modified.forEach(item => {
							_addPathMap(item, modified);
						});
						modified[''] = true;
					}
					if (result.renamed.length) {
						result.renamed.forEach(item => {
							_addPathMap(item, renamed);
						});
						renamed[''] = true;
					}
					if (result.deleted.length) {
						result.deleted.forEach(item => {
							_addPathMap(item, deleted);
						});
						deleted[''] = true;
					}
					globalData.fileStatus[fileObj.path] = {
						untracked: untracked,
						added: added,
						conflicted: conflicted,
						modified: modified,
						renamed: renamed,
						deleted: deleted,
					};
					EventBus.$emit('git-statused', fileObj);
				});
			}, 500);

			function _addPathMap(filePath, obj) {
				filePath = path.join(filePath);
				while (filePath.length > 1 && path.basename(filePath)) {
					obj[filePath] = true;
					filePath = path.dirname(filePath);
				}
			}
		});
	}
}
