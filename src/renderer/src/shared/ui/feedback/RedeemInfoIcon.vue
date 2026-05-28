<style scoped>
.redeem-info-icon {
  margin-left: var(--ow-space-3);
  font-size: var(--ow-font-size-section);
  cursor: pointer;
  color: var(--ow-color-border-strong);
}
.redeem-info-icon:hover {
  color: var(--ow-color-text-muted);
}

.redeem-info-copy {
  font-family: var(--ow-font-regular);
  color: var(--ow-color-text-primary);
}

.redeem-info-copy__label {
  font-family: var(--ow-font-medium);
}
</style>
<template>
  <div>
    <!-- <a-icon type="info-circle-o" class="redeem-info-icon" @click="show" /> -->
    <InfoCircleOutlined class="redeem-info-icon" @click="show" />
    <a-modal title="Redeem Info" v-model:open="visible" @ok="handleOk">
      <p class="redeem-info-copy">
        <span class="redeem-info-copy__label">{{ $t('redeemInfo.claimableOngName') }}</span>
        {{ $t('redeemInfo.claimableOng') }}
      </p>
      <p class="redeem-info-copy">
        <span class="redeem-info-copy__label">{{ $t('redeemInfo.unboundOngName') }}</span>
        {{ $t('redeemInfo.unboundOng') }}
      </p>
    </a-modal>
  </div>
</template>
<script setup lang="ts">
import { InfoCircleOutlined } from '@ant-design/icons-vue'
import { ref } from 'vue'

defineOptions({
  name: 'RedeemInfoIcon',
})

const visible = ref(false)

function show() {
  visible.value = true
}

function handleOk() {
  visible.value = false
}
</script>
