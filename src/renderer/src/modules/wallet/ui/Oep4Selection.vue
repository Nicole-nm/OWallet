<template>
  <div>
    <a-modal
      :title="$t('common.selectOep4')"
      :open="open"
      @cancel="handleClose"
      :footer="null"
      :width="400"
    >
      <div>
        <div class="selection-container">
          <div v-for="item of oep4s" :key="item.contract_hash" class="selection-item">
            <p>{{ item.symbol }}</p>
            <a-switch :checked="item.selected" @change="onChangeSelection(item)" />
          </div>
        </div>

        <a-pagination
          :current="pageNumber"
          :total="total"
          @change="handlePageChange"
          class="pages"
        />
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { PropType } from 'vue'
defineOptions({
  name: 'Oep4Selection',
})

interface Oep4SelectionItem {
  contract_hash: string
  symbol?: string
  selected?: boolean
  [key: string]: unknown
}

defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  oep4s: {
    type: Array as PropType<Oep4SelectionItem[]>,
    default: () => [],
  },
  pageNumber: {
    type: Number,
    default: 1,
  },
  total: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(['update:open', 'pageChange', 'toggleSelection'])

function handleClose() {
  emit('update:open', false)
}

function onChangeSelection(item: Oep4SelectionItem) {
  emit('toggleSelection', item)
}

function handlePageChange(page: number) {
  emit('pageChange', page)
}
</script>

<style scoped>
.selection-container {
  height: 370px;
  margin-top: -15px;
}
.pages {
  margin: 0 auto;
  margin-top: 20px;
  text-align: center;
}
.selection-item {
  display: flex;
  justify-content: space-between;
  padding: 7px 0;
  border-bottom: 1px solid var(--ow-color-border-default);
}
.selection-item p {
  margin: 0;
  font-size: var(--ow-font-size-body);
  font-family: var(--ow-font-regular);
  color: var(--ow-color-text-primary);
}

.oep4-info {
  font-size: var(--ow-font-size-caption);
}

.oep4-info p {
  margin: 0;
}
</style>
