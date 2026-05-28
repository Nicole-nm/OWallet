<template>
  <Teleport to="body">
    <transition name="fade">
      <div
        v-if="showLoading"
        class="loading-overlay"
        role="alert"
        aria-live="assertive"
        aria-busy="true"
      >
        <a-spin size="large" :tip="label" class="loading-spinner" />
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
defineOptions({
  name: 'loading-modals',
})

defineProps({
  showLoading: {
    type: Boolean,
    default: false,
  },
  label: {
    type: String,
    default: 'Loading...',
  },
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
  opacity: 1;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}
.loading-spinner {
  width: auto;
}
.loading-overlay {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1040;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--ow-color-overlay);
  opacity: 1;
}

.loading-overlay .loading-spinner {
  z-index: 1050;
}
</style>
