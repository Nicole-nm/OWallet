<template>
  <a-table
    :columns="columns"
    :dataSource="dataSource"
    :pagination="false"
    :bordered="false"
    size="small"
  >
    <template #bodyCell="{ column, record }">
      <div v-if="column.key === 'name'" class="vote-record-cell vote-record-cell--name">
        {{ record.name }}
      </div>
      <div v-else-if="column.key === 'address'" class="vote-record-cell vote-record-cell--address">
        {{ record.address }}
      </div>
      <div v-else-if="column.key === 'weight'" class="vote-record-cell vote-record-cell--weight">
        {{ record.weightDisplay }}
      </div>
    </template>
  </a-table>
</template>

<script setup lang="ts">
defineProps<{
  columns: Record<string, unknown>[]
  dataSource: Record<string, unknown>[]
}>()
</script>

<style lang="scss" scoped>
.vote-record-cell {
  min-width: 0;
  font-family: var(--ow-font-regular);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-primary);
}

.vote-record-cell--name {
  white-space: normal;
  overflow-wrap: anywhere;
}

.vote-record-cell--address {
  display: -webkit-box;
  overflow: hidden;
  white-space: normal;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.vote-record-cell--weight {
  white-space: nowrap;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
