<template>
  <div class="negative-margin-top" data-testid="settings-page">
    <a-tabs class="ow-section-tabs">
      <a-tab-pane key="settings" :tab="t('setting.name')">
        <div class="setting-page">
          <div class="ow-settings-stack">
            <section class="ow-panel ow-settings-section">
              <header class="ow-panel-header ow-settings-section-header">
                <h2 class="ow-panel-heading">{{ t('setting.preferences') }}</h2>
              </header>

              <div
                class="ow-panel-body ow-settings-section-body ow-settings-section-body--preferences"
              >
                <div class="ow-settings-row ow-settings-row--compact">
                  <div class="ow-settings-copy">
                    <label class="ow-settings-label" for="network-selection">{{
                      t('setting.net')
                    }}</label>
                    <p class="ow-settings-copy-text">{{ t('setting.networkCopy') }}</p>
                  </div>

                  <div class="ow-settings-control">
                    <a-select
                      id="network-selection"
                      v-model:value="net"
                      class="ow-field-control"
                      :get-popup-container="getSelectPopupContainer"
                      @change="handleNetworkChange"
                    >
                      <a-select-option :value="NETWORKS.TEST_NET">{{
                        t('setting.testNet')
                      }}</a-select-option>
                      <a-select-option :value="NETWORKS.MAIN_NET">{{
                        t('setting.mainNet')
                      }}</a-select-option>
                    </a-select>
                  </div>
                </div>

                <div class="ow-settings-row ow-settings-row--compact">
                  <div class="ow-settings-copy">
                    <label class="ow-settings-label" for="node-selection">{{
                      t('setting.nodeAddress')
                    }}</label>
                    <p class="ow-settings-copy-text">{{ t('setting.nodeCopy') }}</p>
                  </div>

                  <div class="ow-settings-control">
                    <a-select
                      id="node-selection"
                      v-model:value="nodeAddress"
                      class="ow-field-control"
                      :get-popup-container="getSelectPopupContainer"
                      @change="handleNodeAddressChange"
                    >
                      <a-select-option v-for="item of nodeList" :key="item" :value="item">
                        {{ item }}
                      </a-select-option>
                    </a-select>
                  </div>
                </div>

                <div class="ow-settings-row ow-settings-row--compact">
                  <div class="ow-settings-copy">
                    <label class="ow-settings-label" for="theme-selection">{{
                      t('setting.theme')
                    }}</label>
                    <p class="ow-settings-copy-text">{{ t('setting.themeCopy') }}</p>
                  </div>

                  <div class="ow-settings-control">
                    <a-select
                      id="theme-selection"
                      v-model:value="themeMode"
                      class="ow-field-control"
                      :get-popup-container="getSelectPopupContainer"
                      @change="handleThemeModeChange"
                    >
                      <a-select-option :value="THEME_MODES.LIGHT">{{
                        t('setting.lightTheme')
                      }}</a-select-option>
                      <a-select-option :value="THEME_MODES.DARK">{{
                        t('setting.darkTheme')
                      }}</a-select-option>
                      <a-select-option :value="THEME_MODES.SYSTEM">
                        {{ t('setting.systemTheme') }}
                      </a-select-option>
                    </a-select>
                  </div>
                </div>
              </div>
            </section>

            <section class="ow-panel ow-settings-section">
              <header class="ow-panel-header ow-settings-section-header">
                <h2 class="ow-panel-heading">{{ t('setting.storage') }}</h2>
              </header>

              <div class="ow-panel-body ow-settings-section-body">
                <div class="ow-settings-row ow-settings-row--storage">
                  <div class="ow-settings-storage-header">
                    <p class="ow-settings-label">{{ t('setting.storagePathLabel') }}</p>
                    <p
                      class="ow-settings-summary-value ow-settings-summary-value--storage"
                      data-testid="settings-save-path"
                    >
                      {{ savePath }}
                    </p>
                  </div>

                  <div class="ow-settings-copy ow-settings-copy--storage">
                    <p class="ow-settings-copy-text">{{ t('setting.storageCopy') }}</p>
                    <p class="ow-settings-copy-text">{{ t('setting.notInstallationPath') }}</p>
                  </div>

                  <div class="ow-settings-control ow-settings-control--storage">
                    <div class="ow-settings-actions ow-settings-actions--end">
                      <a-button type="primary" variant="primary" @click="setSavePath">
                        {{ t('setting.change') }}
                      </a-button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section class="ow-panel ow-settings-section">
              <header
                class="ow-panel-header ow-settings-section-header ow-settings-section-header--status"
              >
                <h2 class="ow-panel-heading ow-settings-heading">
                  <span>{{ t('setting.updates') }}</span>
                  <span v-if="hasUpdate" class="setting-page__update-dot" aria-hidden="true"></span>
                </h2>

                <span
                  class="ow-status-pill ow-status-pill--wide"
                  :class="`ow-status-pill--${updateStatusTone}`"
                >
                  {{ t(updateStatusKey) }}
                </span>
              </header>

              <div class="ow-panel-body ow-settings-section-body">
                <div class="ow-settings-row ow-settings-row--updates">
                  <div class="ow-settings-copy ow-settings-copy--updates">
                    <div
                      class="ow-settings-summary-row ow-settings-summary-row--inline"
                      data-testid="settings-update-summary"
                    >
                      <span class="ow-settings-summary-label">{{
                        t('common.currentVersion')
                      }}</span>
                      <span class="ow-settings-summary-value ow-settings-summary-value--inline">{{
                        currentVersion
                      }}</span>
                    </div>

                    <div
                      v-if="lastCheckedLabel"
                      class="ow-settings-summary-row ow-settings-summary-row--inline"
                    >
                      <span class="ow-settings-summary-label">{{ t('common.lastChecked') }}</span>
                      <span class="ow-settings-summary-value ow-settings-summary-value--inline">{{
                        lastCheckedLabel
                      }}</span>
                    </div>
                  </div>

                  <div class="ow-settings-control ow-settings-control--updates">
                    <div class="ow-settings-actions ow-settings-actions--end">
                      <a-button :loading="isChecking" @click="checkForUpdates">
                        {{ t('common.checkForUpdates') }}
                      </a-button>
                      <a-button v-if="hasUpdate" type="primary" @click="openLatestRelease">
                        {{ t('common.toUpdate') }}
                      </a-button>
                    </div>
                  </div>
                </div>

                <p v-if="updateErrorKey" class="ow-settings-update-error">
                  {{ t(updateErrorKey) }}
                </p>
              </div>
            </section>
          </div>
        </div>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsPage } from '../../workflows/settings/useSettingsPage'

defineOptions({
  name: 'SettingPage',
})

const {
  t,
  net,
  changeNet,
  checkForUpdates,
  currentVersion,
  NETWORKS,
  THEME_MODES,
  nodeAddress,
  changeNode,
  hasChecked,
  hasUpdate,
  isChecking,
  lastCheckedLabel,
  nodeList,
  openLatestRelease,
  savePath,
  themeMode,
  updateErrorKey,
  setSavePath,
  changeThemeMode,
} = useSettingsPage()

const updateStatusKey = computed(() => {
  if (isChecking.value) {
    return 'setting.updateStatusChecking'
  }

  if (updateErrorKey.value) {
    return 'setting.updateStatusFailed'
  }

  if (!hasChecked.value) {
    return 'setting.updateStatusUnknown'
  }

  return hasUpdate.value ? 'setting.updateStatusAvailable' : 'setting.updateStatusLatest'
})

const updateStatusTone = computed(() => {
  if (isChecking.value) {
    return 'checking'
  }

  if (updateErrorKey.value) {
    return 'failed'
  }

  if (!hasChecked.value) {
    return 'idle'
  }

  return hasUpdate.value ? 'warning' : 'success'
})

function getSelectPopupContainer(triggerNode: HTMLElement) {
  return triggerNode.parentElement || document.body
}

function handleNetworkChange(value: string) {
  net.value = value
  changeNet()
}

function handleNodeAddressChange(value: string) {
  nodeAddress.value = value
  changeNode()
}

function handleThemeModeChange(value: string) {
  themeMode.value = value
  changeThemeMode()
}
</script>

<style>
.setting-page {
  box-sizing: border-box;
  height: 100%;
  padding: var(--ow-space-6) var(--ow-space-5) var(--ow-space-6) var(--ow-space-16);
  overflow: auto;
}

.setting-page__update-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--ow-color-danger, #ff4d4f);
  box-shadow: 0 0 0 4px rgba(255, 77, 79, 0.12);
  flex: 0 0 auto;
}

@media (max-width: 768px) {
  .setting-page {
    padding: 0 12px 20px;
  }
}
</style>
