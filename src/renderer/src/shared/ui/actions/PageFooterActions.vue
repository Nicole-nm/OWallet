<template>
  <footer class="footer-btns" aria-label="Page actions">
    <div class="ow-footer-actions" :class="`ow-footer-actions--${align}`">
      <slot />
    </div>
  </footer>
</template>

<script setup lang="ts">
defineOptions({
  name: 'PageFooterActions',
})

defineProps({
  align: {
    type: String,
    default: 'between',
  },
})
</script>
