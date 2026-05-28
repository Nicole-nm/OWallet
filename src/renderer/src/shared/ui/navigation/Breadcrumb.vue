<style scoped>
.breadcrumb-container {
  height: 4rem;
  padding: 1.1rem 0 1.1rem var(--ow-space-4);
  padding-left: var(--ow-layout-content-offset);
  width: 100%;
  position: fixed;
  top: 0;
  left: 0;
  background: var(--ow-color-surface);
  z-index: 100;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}
.back-icon-container {
  height: 1.7rem;
  line-height: 1.7rem;
  padding-right: var(--ow-space-5);
  border-right: 1px solid var(--ow-color-border-default);
  float: left;
  cursor: pointer;
  color: var(--ow-color-brand);
  font-size: var(--ow-font-size-subtitle);
}

.back-icon-container:hover {
  color: var(--ow-color-brand-hover);
}

.back-icon {
  display: inline-block;
  height: 10px;
  width: 18px;
  background: url(../../../assets/back.png) center center;
  background-size: cover;
  line-height: 1.7rem;
}
.breadcrumb-routes {
  float: left;
  margin-left: var(--ow-space-5);
  height: 1.7rem;
  line-height: 1.7rem;
}

.breadcrumb-routes a {
  color: var(--ow-color-text-subtle);
  font-size: var(--ow-font-size-section);
  font-family: var(--ow-font-bold);
}

.breadcrumb-current {
  float: left;
  height: 1.7rem;
  line-height: 1.7rem;
  margin-left: var(--ow-space-5);
  color: var(--ow-color-text-primary);
  font-size: var(--ow-font-size-body);
  font-family: var(--ow-font-bold);
}

.left-icon {
  font-size: var(--ow-font-size-section);
  color: var(--ow-color-text-subtle);
  margin-left: var(--ow-space-3);
}
</style>
<template>
  <div class="breadcrumb-container">
    <div class="back-icon-container" @click="back">
      <ArrowLeftOutlined />
    </div>
    <div class="breadcrumb-routes" v-for="route in routes" :key="route.path">
      <router-link :to="route.path">{{ route.name }}</router-link>
      <RightOutlined class="left-icon" />
    </div>
    <div class="breadcrumb-current">
      {{ current }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { PropType } from 'vue'
import { RightOutlined, ArrowLeftOutlined } from '@ant-design/icons-vue'

interface BreadcrumbRoute {
  name: string | number
  path: string
}

defineOptions({
  name: 'Breadcrumb',
})

defineProps({
  routes: {
    type: Array as PropType<BreadcrumbRoute[]>,
    default: () => [],
  },
  current: {
    type: [String, Number],
    default: '',
  },
})

const emit = defineEmits(['backEvent'])

function back() {
  emit('backEvent')
}
</script>
