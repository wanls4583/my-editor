<!--
 * @Author: lisong
 * @Date: 2021-12-09 21:38:38
 * @Description: 
-->
<template>
	<div :style="{height:height+'px'}" class="my-editor-status-bar">
		<div class="my-editor-status-left">
			<span>Line {{line}}, Column {{column}}</span>
		</div>
		<div class="my-editor-status-right">
			<span>Tab Size:{{tabSize}}</span>
			<span>{{language}}</span>
		</div>
	</div>
</template>
<script>
import Highlight from '@/highlight/core/highlight';
export default {
    name: 'Home',
    props: {
        height: {
            type: Number,
            default: 25
        },
        line: {
            type: Number,
            default: 1
        },
        column: {
            type: Number,
            default: 1
        },
        language: {
            type: String,
            default: 'JavaScript'
        },
        tabSize: {
            type: Number,
            default: 4
        }
    },
    data() {
        return {

        }
    },
}
</script>