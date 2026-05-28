<template>
  <div class="node-item ow-list-card ow-list-card--node">
    <p class="node-name" v-text="node.name"></p>
    <div class="info-item">
      <label>{{ t('myNode.stakeWalletAddress') }}</label>
      <p v-text="node.stakeAddress"></p>
    </div>
    <div class="info-item">
      <label>{{ t('myNode.operationWalletPk') }}</label>
      <p v-text="node.publicKey"></p>
    </div>
    <div class="btn-footer">
      <a-button variant="primary" @click="$emit('manage', node)">{{ t('myNode.manage') }}</a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PropType } from 'vue'
defineOptions({
  name: 'MyNodeCard',
})

defineEmits(['manage'])

defineProps({
  node: {
    type: Object as PropType<Record<string, unknown>>,
    default: () => ({}),
  },
  t: {
    type: Function,
    required: true,
  },
})
</script>

<style lang="scss" scoped>
.node-item {
  display: flex;
  flex-direction: column;

  .node-name {
    min-width: 0;
    font-family: var(--ow-font-medium);
    font-size: var(--ow-font-size-subtitle);
    color: var(--ow-color-text-primary);
    margin-bottom: var(--ow-space-4);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .info-item {
    margin-bottom: var(--ow-space-4);
    font-family: var(--ow-font-regular);
    font-size: var(--ow-font-size-body);
    color: var(--ow-color-text-muted);

    p {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .btn-footer {
    margin-top: auto;
    text-align: right;
  }
}
</style>
