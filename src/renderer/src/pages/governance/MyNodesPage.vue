<template>
  <div class="nodes-container">
    <breadcrumb :current="t('myNode.myNode')" @backEvent="back" />
    <ul class="ow-card-grid ow-card-grid--padded ow-card-grid--nodes">
      <li v-for="node in myNodes" :key="node.publicKey">
        <my-node-card :node="node" :t="t" @manage="onManage" />
      </li>
      <li>
        <create-entry-card
          variant="node"
          action-layout="single"
          :actions="[{ label: t('myNode.applyNode'), to: { name: ROUTE_NAMES.NODE_APPLY } }]"
        />
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import Breadcrumb from '../../shared/ui/navigation/Breadcrumb.vue'
import CreateEntryCard from '@/shared/ui/cards/CreateEntryCard.vue'
import MyNodeCard from '../../modules/governance/ui/MyNodeCard.vue'
import { ROUTE_NAMES } from '../../shared/navigation/routeNames'
import { useMyNodesPage } from '../../workflows/governance/useMyNodesPage'

defineOptions({
  name: 'MyNodesPage',
})

const { t, myNodes, back, onManage } = useMyNodesPage()
</script>
