<template>
  <div class="negative-margin-top wallets-page">
    <a-tabs :activeKey="activeTab" @update:activeKey="activeTab = $event" class="ow-section-tabs">
      <template #rightExtra>
        <a-input
          ref="filterInputRef"
          v-model:value="filterQuery"
          :placeholder="$t('wallets.filterPlaceholder')"
          :aria-label="$t('wallets.filterAriaLabel')"
          class="wallets-page__filter"
          allow-clear
        />
      </template>
      <a-tab-pane key="1" :tab="$t('wallets.common')">
        <app-state
          :loading="isLoadingWallets"
          :error="hasWalletLoadError"
          :empty="normalWalletEmpty"
          :loading-label="$t('wallets.loadingWallets')"
          :error-title="$t('wallets.loadFailed')"
          :error-description="$t('wallets.loadFailedDescription')"
          :empty-title="$t('wallets.emptyCommonWallets')"
          :empty-description="$t('wallets.emptyCommonWalletDescription')"
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

          <p v-if="normalFilteredEmpty" class="wallets-page__no-matches">
            {{ $t('wallets.filterNoResults', { query: filterQuery }) }}
            <button type="button" class="wallets-page__no-matches-clear" @click="filterQuery = ''">
              {{ $t('wallets.filterClear') }}
            </button>
          </p>
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
          :empty-description="$t('wallets.emptySharedWalletDescription')"
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

          <p v-if="sharedFilteredEmpty" class="wallets-page__no-matches">
            {{ $t('wallets.filterNoResults', { query: filterQuery }) }}
            <button type="button" class="wallets-page__no-matches-clear" @click="filterQuery = ''">
              {{ $t('wallets.filterClear') }}
            </button>
          </p>
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
          :empty-description="$t('wallets.emptyLedgerWalletDescription')"
        >
          <template #actions>
            <app-button v-if="hasWalletLoadError" variant="primary" @click="reloadWallets()">
              {{ $t('common.retry') }}
            </app-button>
            <app-button v-else variant="primary" :to="{ name: ROUTE_NAMES.IMPORT_LEDGER_WALLET }">
              {{ $t('wallets.importLedgerWallet') }}
            </app-button>
          </template>

          <p v-if="hardwareFilteredEmpty" class="wallets-page__no-matches">
            {{ $t('wallets.filterNoResults', { query: filterQuery }) }}
            <button type="button" class="wallets-page__no-matches-clear" @click="filterQuery = ''">
              {{ $t('wallets.filterClear') }}
            </button>
          </p>
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
import { onBeforeUnmount, onMounted, ref } from 'vue'
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

const filterInputRef = ref<{ focus: () => void } | null>(null)

function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

function handleGlobalKey(event: KeyboardEvent) {
  if (event.key !== '/') return
  if (event.ctrlKey || event.metaKey || event.altKey) return
  if (isTextEntryTarget(event.target)) return
  event.preventDefault()
  filterInputRef.value?.focus()
}

onMounted(() => window.addEventListener('keydown', handleGlobalKey))
onBeforeUnmount(() => window.removeEventListener('keydown', handleGlobalKey))

const {
  activeTab,
  filterQuery,
  hardwareFilteredEmpty,
  hardwareWalletEmpty,
  hardwareWalletSort,
  hasWalletLoadError,
  isLoadingWallets,
  normalFilteredEmpty,
  normalWallet,
  normalWalletEmpty,
  reloadWallets,
  sharedFilteredEmpty,
  sharedWallet,
  sharedWalletEmpty,
  showPathModal,
} = useWalletsPage()
</script>

<style scoped>
.wallets-page :deep(.ow-app-state__actions) {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--ow-space-4);
}

.wallets-page__filter {
  width: 20rem;
  margin-left: var(--ow-space-3);
  margin-right: var(--ow-space-10);
}

.wallets-page__no-matches {
  margin: var(--ow-space-3) 0 0;
  padding: 0 var(--ow-space-4);
  color: var(--ow-color-text-subtle);
  font-family: var(--ow-font-medium);
}

.wallets-page__no-matches-clear {
  margin-left: var(--ow-space-2);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ow-color-brand);
  font-family: var(--ow-font-medium);
  cursor: pointer;
}

.wallets-page__no-matches-clear:hover,
.wallets-page__no-matches-clear:focus-visible {
  text-decoration: underline;
}

.wallets-page__no-matches-clear:focus-visible {
  outline: none;
  box-shadow: var(--ow-shadow-focus);
  border-radius: var(--ow-radius-card);
}
</style>
