<script setup lang="ts">
import { computed } from "vue";
import { renderMath } from "@/lib/math";

const props = defineProps<{ text: string }>();
const html = computed(() => renderMath(props.text ?? ""));
</script>

<template>
  <span class="math-text" v-html="html"></span>
</template>
