<template>
  <div class="negative-margin-top">
    <a-tabs class="ow-section-tabs">
      <a-tab-pane key="identities" :tab="$t('identities.pageTit')">
        <app-state
          :loading="isLoadingIdentities"
          :error="hasIdentityLoadError"
          :empty="identitiesEmpty"
          :loading-label="$t('identities.loadingIdentities')"
          :error-title="$t('identities.loadFailed')"
          :error-description="$t('wallets.loadFailedDescription')"
          :empty-title="$t('identities.emptyIdentities')"
          :empty-description="$t('identities.emptyIdentityDescription')"
        >
          <template #actions>
            <app-button v-if="hasIdentityLoadError" variant="primary" @click="reloadIdentities()">
              {{ $t('common.retry') }}
            </app-button>
            <template v-else>
              <app-button variant="primary" :to="{ name: ROUTE_NAMES.CREATE_IDENTITY }">
                {{ $t('identities.createIdentity') }}
              </app-button>
              <app-button variant="secondary" :to="{ name: ROUTE_NAMES.IMPORT_IDENTITY }">
                {{ $t('identities.importIdentity') }}
              </app-button>
            </template>
          </template>

          <div class="ow-card-grid ow-card-grid--padded identity-home__grid">
            <identity-view
              v-for="identity in allIdentities"
              :key="identity.ontid"
              :identity="identity"
            />

            <create-entry-card
              variant="wallet"
              :bordered="true"
              :aria-label="$t('identities.pageTit')"
              :actions="[
                {
                  label: $t('identities.createIdentity'),
                  to: { name: ROUTE_NAMES.CREATE_IDENTITY },
                },
                {
                  label: $t('identities.importIdentity'),
                  to: { name: ROUTE_NAMES.IMPORT_IDENTITY },
                },
              ]"
            />
          </div>
        </app-state>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import IdentityView from '../../workflows/identity/IdentityDetailsCard.vue'
import CreateEntryCard from '../../shared/ui/cards/CreateEntryCard.vue'
import AppState from '../../shared/ui/feedback/AppState.vue'
import AppButton from '../../shared/ui/actions/AppButton.vue'
import { ROUTE_NAMES } from '../../shared/navigation/routeNames'
import { useIdentitiesPage } from '../../workflows/identity/useIdentitiesPage'

defineOptions({
  name: 'IdentitiesPage',
})

const {
  allIdentities,
  hasIdentityLoadError,
  identitiesEmpty,
  isLoadingIdentities,
  reloadIdentities,
} = useIdentitiesPage()
</script>

<style scoped>
.identity-home__grid {
  align-items: stretch;
}

.identity-home__grid > :deep(.identity-card),
.identity-home__grid > :deep(.ow-create-card) {
  height: 100%;
}
</style>
