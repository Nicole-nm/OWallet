<template>
  <AEmpty :description="description" :image="compactEmptyImage" />
</template>

<script setup lang="ts">
import { Empty as AEmpty } from 'ant-design-vue'

defineProps<{
  description: string
}>()

const compactEmptyImage = AEmpty.PRESENTED_IMAGE_SIMPLE
</script>
