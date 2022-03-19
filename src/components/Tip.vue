<!--
 * @Author: lisong
 * @Date: 2021-12-24 11:00:11
 * @Description: 
-->
<template>
	<div :style="styles" @mousedown.stop class="my-tip">
		<div v-html="content"></div>
	</div>
</template>
<script>
export default {
    name: 'Tip',
    props: {
        content: String,
        styles: {
            type: Object
        }
    },
    data() {
        return {
        }
    },
    created() {
    },
    methods: {
    }
}
</script>