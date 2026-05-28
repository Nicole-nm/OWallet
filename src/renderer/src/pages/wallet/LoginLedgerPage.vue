<template>
  <div id="wrapper">
    <main>
      <div class="left-side">
        <router-link to="Wallets" class="backBtn"> Back </router-link>
        <div class="doc">
          <div class="title">Login with Ledger</div>
          <ledger-status-notice :status="ledgerStatus" :show-title="false" />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import LedgerStatusNotice from '../../shared/ui/ledger/LedgerStatusNotice.vue'
import { useLoginLedgerPage } from '../../workflows/wallet/useLoginLedgerPage'

defineOptions({
  name: 'LoginLedgerPage',
})

const { ledgerStatus } = useLoginLedgerPage()
</script>

<style scoped>
#wrapper {
  height: 100vh;
  padding: var(--ow-space-16) 80px;
}

main {
  display: flex;
  justify-content: space-between;
}

.left-side {
  display: flex;
  flex-direction: column;
  margin-top: var(--ow-space-16);
}

.title {
  color: var(--ow-color-text-primary);
  font-size: var(--ow-font-size-title);
  font-family: var(--ow-font-bold);
  font-weight: bold;
  margin-bottom: var(--ow-space-4);
}

.doc p {
  color: var(--ow-color-text-primary);
  margin-bottom: var(--ow-space-3);
}

.doc button {
  font-size: var(--ow-font-size-section);
  cursor: pointer;
  outline: none;
  padding: var(--ow-space-2) var(--ow-space-5);
  border-radius: var(--ow-radius-control);
  min-width: 120px;
  display: inline-block;
  color: var(--ow-color-text-inverse);
  background-color: var(--ow-color-brand);
  transition: all 0.15s ease;
  box-sizing: border-box;
  border: 1px solid var(--ow-color-brand);
}

.backBtn {
  font-size: var(--ow-font-size-section);
  color: var(--ow-color-brand);
}
</style>
