<template>
  <div class="shared-join-search">
    <section class="shared-join-search__section">
      <div class="shared-join-search__section-copy">
        <span class="shared-join-search__section-title">{{ $t('importSharedWallet.import') }}</span>
        <span class="shared-join-search__section-caption">{{
          $t('importSharedWallet.inputAddress')
        }}</span>
      </div>

      <a-input
        class="input shared-join-search__input"
        v-model:value="searchText"
        :placeholder="$t('importSharedWallet.inputAddress')"
      />
    </section>

    <page-footer-actions align="between" class="shared-join-search__actions">
      <a-button variant="secondary" type="default" @click="emit('cancel')">
        {{ $t('importSharedWallet.cancel') }}
      </a-button>
      <a-button variant="primary" type="primary" @click="emit('next')" :disabled="!searchText">
        {{ $t('importSharedWallet.search') }}
      </a-button>
    </page-footer-actions>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import PageFooterActions from '../../../../../shared/ui/actions/PageFooterActions.vue'

defineOptions({
  name: 'QuerySharedWallet',
})

const props = defineProps({
  searchText: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:searchText', 'cancel', 'next'])

const searchText = computed({
  get: () => props.searchText,
  set: (value) => emit('update:searchText', value),
})
</script>

<style scoped>
.shared-join-search {
  width: min(100%, 760px);
  margin: 0 auto;
  padding-bottom: 96px;
  display: grid;
  gap: var(--ow-space-4);
}

.shared-join-search__section {
  display: grid;
  gap: var(--ow-space-3);
  padding: var(--ow-space-4);
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-card);
}

.shared-join-search__section-copy {
  display: grid;
  gap: 2px;
}

.shared-join-search__section-title {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-primary);
}

.shared-join-search__section-caption {
  font-size: var(--ow-font-size-caption);
  line-height: var(--ow-line-height-caption);
  color: var(--ow-color-text-secondary);
}

.shared-join-search__input {
  width: 100%;
}

.shared-join-search__actions {
  height: 72px;
}

.shared-join-search__actions :deep(.ow-footer-actions) {
  margin: 12px auto;
  gap: var(--ow-space-3);
}

@media (max-width: 560px) {
  .shared-join-search {
    gap: var(--ow-space-3);
  }

  .shared-join-search__section {
    padding: 12px;
  }

  .shared-join-search__actions {
    height: 68px;
  }

  .shared-join-search__actions :deep(.ow-footer-actions) {
    margin: 10px auto;
  }
}
</style>
