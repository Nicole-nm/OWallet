<template>
  <div class="negative-margin-top">
    <a-tabs :activeKey="activeTab" @update:activeKey="activeTab = $event" class="ow-section-tabs">
      <a-tab-pane key="1" :tab="$t('wallets.common')">
        <app-state
          :loading="isLoadingWallets"
          :error="hasWalletLoadError"
          :empty="normalWalletEmpty"
          :loading-label="$t('wallets.loadingWallets')"
          :error-title="$t('wallets.loadFailed')"
          :error-description="$t('wallets.loadFailedDescription')"
          :empty-title="$t('wallets.emptyCommonWallets')"
          :empty-description="$t('wallets.emptyWalletDescription')"
        >
          <template #actions>
            <app-button v-if="hasWalletLoadError" variant="primary" @click="reloadWallets()">
              {{ $t('common.retry') }}
            </app-button>
            <template v-else>
              <app-button variant="primary" :to="{ name: ROUTE_NAMES.CREATE_JSON_WALLET }">
                {{ $t('wallets.createCommonWallet') }}
              </app-button>
              <app-button variant="secondary" :to="{ name: ROUTE_NAMES.IMPORT_JSON_WALLET }">
                {{ $t('wallets.importCommonWallet') }}
              </app-button>
            </template>
          </template>

          <div class="ow-card-grid ow-card-grid--padded">
            <div
              class="ow-list-card ow-list-card--wallet"
              v-for="w in normalWallet"
              :key="w.address"
            >
              <json-wallet-details :wallet="w"></json-wallet-details>
            </div>

            <create-entry-card
              variant="wallet"
              :bordered="true"
              :aria-label="$t('wallets.common')"
              :actions="[
                {
                  label: $t('wallets.createCommonWallet'),
                  to: { name: ROUTE_NAMES.CREATE_JSON_WALLET },
                },
                {
                  label: $t('wallets.importCommonWallet'),
                  to: { name: ROUTE_NAMES.IMPORT_JSON_WALLET },
                },
              ]"
            />
          </div>
        </app-state>
      </a-tab-pane>

      <a-tab-pane key="2" :tab="$t('wallets.shared')">
        <app-state
          :loading="isLoadingWallets"
          :error="hasWalletLoadError"
          :empty="sharedWalletEmpty"
          :loading-label="$t('wallets.loadingWallets')"
          :error-title="$t('wallets.loadFailed')"
          :error-description="$t('wallets.loadFailedDescription')"
          :empty-title="$t('wallets.emptySharedWallets')"
          :empty-description="$t('wallets.emptyWalletDescription')"
        >
          <template #actions>
            <app-button v-if="hasWalletLoadError" variant="primary" @click="reloadWallets()">
              {{ $t('common.retry') }}
            </app-button>
            <template v-else>
              <app-button variant="primary" :to="{ name: ROUTE_NAMES.CREATE_SHARED_WALLET }">
                {{ $t('wallets.createSharedWallet') }}
              </app-button>
              <app-button variant="secondary" :to="{ name: ROUTE_NAMES.IMPORT_SHARED_WALLET }">
                {{ $t('wallets.joinSharedWallet') }}
              </app-button>
            </template>
          </template>

          <div class="ow-card-grid ow-card-grid--padded">
            <div
              class="ow-list-card ow-list-card--wallet"
              v-for="w in sharedWallet"
              :key="w.address"
            >
              <shared-wallet-details :wallet="w"></shared-wallet-details>
            </div>

            <create-entry-card
              variant="wallet"
              :bordered="true"
              :aria-label="$t('wallets.shared')"
              :actions="[
                {
                  label: $t('wallets.createSharedWallet'),
                  to: { name: ROUTE_NAMES.CREATE_SHARED_WALLET },
                },
                {
                  label: $t('wallets.joinSharedWallet'),
                  to: { name: ROUTE_NAMES.IMPORT_SHARED_WALLET },
                },
              ]"
            />
          </div>
        </app-state>
      </a-tab-pane>

      <a-tab-pane key="3" :tab="$t('wallets.ledger')">
        <app-state
          :loading="isLoadingWallets"
          :error="hasWalletLoadError"
          :empty="hardwareWalletEmpty"
          :loading-label="$t('wallets.loadingWallets')"
          :error-title="$t('wallets.loadFailed')"
          :error-description="$t('wallets.loadFailedDescription')"
          :empty-title="$t('wallets.emptyLedgerWallets')"
          :empty-description="$t('wallets.emptyWalletDescription')"
        >
          <template #actions>
            <app-button v-if="hasWalletLoadError" variant="primary" @click="reloadWallets()">
              {{ $t('common.retry') }}
            </app-button>
            <app-button v-else variant="primary" :to="{ name: ROUTE_NAMES.IMPORT_LEDGER_WALLET }">
              {{ $t('wallets.importLedgerWallet') }}
            </app-button>
          </template>

          <div class="ow-card-grid ow-card-grid--padded">
            <div
              class="ow-list-card ow-list-card--wallet"
              v-for="w in hardwareWalletSort"
              :key="w.address"
            >
              <json-wallet-details :wallet="w"></json-wallet-details>
            </div>

            <create-entry-card
              variant="wallet"
              :bordered="true"
              action-layout="single"
              :aria-label="$t('wallets.ledger')"
              :actions="[
                {
                  label: $t('wallets.importLedgerWallet'),
                  to: { name: ROUTE_NAMES.IMPORT_LEDGER_WALLET },
                },
              ]"
            />
          </div>
        </app-state>
      </a-tab-pane>
    </a-tabs>
    <set-path-modal
      :modelValue="showPathModal"
      @update:modelValue="showPathModal = $event"
    ></set-path-modal>
  </div>
</template>

<script setup lang="ts">
import JsonWalletDetails from '../../workflows/wallet/JsonWalletDetailsCard.vue'
import SharedWalletDetails from '../../workflows/wallet/SharedWalletDetailsCard.vue'
import SetPathModal from '../../shared/ui/modals/SetPath.vue'
import CreateEntryCard from '../../shared/ui/cards/CreateEntryCard.vue'
import AppState from '../../shared/ui/feedback/AppState.vue'
import AppButton from '../../shared/ui/actions/AppButton.vue'
import { ROUTE_NAMES } from '../../shared/navigation/routeNames'
import { useWalletsPage } from '../../workflows/wallet/useWalletsPage'

defineOptions({
  name: 'WalletsPage',
})

const {
  activeTab,
  hardwareWalletEmpty,
  hardwareWalletSort,
  hasWalletLoadError,
  isLoadingWallets,
  normalWallet,
  normalWalletEmpty,
  reloadWallets,
  sharedWallet,
  sharedWalletEmpty,
  showPathModal,
} = useWalletsPage()
</script>
