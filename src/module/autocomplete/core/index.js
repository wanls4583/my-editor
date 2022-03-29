/*
 * @Author: lisong
 * @Date: 2022-03-17 15:20:06
 * @Description: 
 */
import Util from '@/common/Util';
import JsSearcher from '../language/javascript';
import HtmlSearcher from '../language/html';
import CssSearcher from '../language/css';

export default class {
    constructor(editor, context) {
        this.searcherId = 0;
        this.preSearchTime = 0;
        this.editor = editor;
        this.context = context;
        this.initProperties(editor, context);
    }
    initProperties(editor, context) {
        Util.defineProperties(this, editor, ['language', 'cursor', 'tokenizer', 'setAutoTip']);
        Util.defineProperties(this, context, ['htmls']);
    }
    search() {
        clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => {
            _search.call(this);
        });

        function _search() {
            let type = '';
            this.clearSearch();
            if (this.language == 'HTML') {
                let multiCursorPos = this.cursor.multiCursorPos.toArray();
                let states = this.htmls[multiCursorPos[0].line - 1].states || [];
                states = states.map((item) => {
                    return this.tokenizer.ruleIdMap[item].name
                });
                if (states.indexOf('JavaScript') > -1) {
                    //在<script>标签里
                    type = 'JavaScript';
                } else if (states.indexOf('CSS') > -1) {
                    //在<style>标签里
                    type = 'CSS';
                }
            }
            this.searcherId++;
            this.searcher = this.getSearcher(type);
            this.searcher && this.searcher.search({
                searcherId: this.searcherId
            });
        }
    }
    clearSearch() {
        this.searcher && this.searcher.stop && this.searcher.stop();
        this.searcherId++;
    }
    getSearcher(type) {
        let language = type || this.language;
        let searcher = null;
        switch (language) {
            case 'JavaScript':
                this.jsSearcher = this.jsSearcher || new JsSearcher(this.editor, this.context);
                searcher = this.jsSearcher;
                break;
            case 'HTML':
                this.htmlSearcher = this.htmlSearcher || new HtmlSearcher(this.editor, this.context);
                searcher = this.htmlSearcher;
                break;
            case 'CSS':
                this.cssSearcher = this.cssSearcher || new CssSearcher(this.editor, this.context);
                searcher = this.cssSearcher;
                break;
        }
        return searcher;
    }
}