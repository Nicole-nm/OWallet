<template>
  <ConfigProvider :theme="antdThemeConfig">
    <div id="app">
      <top-left-nav
        v-show="route.name !== 'Home'"
        :network="networkLabel"
        :has-update="hasUpdate"
        @help="openHelp"
      ></top-left-nav>

      <div class="container-fluid">
        <router-view></router-view>
      </div>

      <loading-modal :show-loading="showLoading"></loading-modal>
    </div>
  </ConfigProvider>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { ConfigProvider } from 'ant-design-vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import TopLeftNav from './modules/app/ui/TopLeftNav.vue'
import LoadingModal from './modules/app/ui/LoadingModal.vue'
import { useLoadingModalStore } from './shared/composables/useGlobalLoading'
import { preloadImageAssets } from './shared/lib/assetPreloader'
import { configureRuntimeFeedback } from './shared/lib/runtimeFeedback'
import {
  THEME_MODES,
  applyResolvedTheme,
  createAntdThemeConfig,
  resolveTheme,
  watchSystemTheme,
} from './shared/lib/theme'
import { open } from './shared/platform/urlOpener'
import { isTestNetNetwork } from './shared/lib/constants'
import { refreshAppUpdateStatus } from './workflows/support/appUpdateStatusRefresh'
import { useAppUpdateStore } from './stores/modules/AppUpdate'
import { useSettingStore } from './stores/modules/Setting'
import logoIcon from './assets/logo.png'
import walletIcon from './assets/unselectwallet.png'
import walletActiveIcon from './assets/selectwallet.png'
import settingIcon from './assets/settingunselect.png'
import settingActiveIcon from './assets/selectsetting.png'
import nodeIcon from './assets/node.png'
import nodeActiveIcon from './assets/nodeSelect.png'
import dappsIcon from './assets/dapps.png'
import dappsActiveIcon from './assets/dapps-hover.png'
import helpIcon from './assets/helpunselected.png'
import helpActiveIcon from './assets/helpselect.png'
import walletCopyIcon from './assets/copy.png'
import commonCopyIcon from './assets/copy_new.svg'

const APP_ICON_ASSETS = [
  logoIcon,
  walletIcon,
  walletActiveIcon,
  settingIcon,
  settingActiveIcon,
  nodeIcon,
  nodeActiveIcon,
  dappsIcon,
  dappsActiveIcon,
  helpIcon,
  helpActiveIcon,
  walletCopyIcon,
  commonCopyIcon,
]

defineOptions({
  name: 'AppRoot',
})

const { t } = useI18n()
const route = useRoute()
const loadingStore = useLoadingModalStore()
const appUpdateStore = useAppUpdateStore()
const settingStore = useSettingStore()
const { showLoading } = loadingStore
const { hasUpdate } = storeToRefs(appUpdateStore)
const { themeMode, resolvedTheme } = storeToRefs(settingStore)
const networkLabel = computed(() =>
  isTestNetNetwork(settingStore.network) ? t('common.testNet') : t('common.mainNet')
)
const antdThemeConfig = computed(() => createAntdThemeConfig(resolvedTheme.value))
let stopSystemThemeSync = () => {}

function openHelp() {
  open('https://medium.com/ontologynetwork/owallet-faq-7f4f96784253')
}

preloadImageAssets(APP_ICON_ASSETS)
configureRuntimeFeedback({
  showLoading: () => loadingStore.showLoadingModals(),
  hideLoading: () => loadingStore.hideLoadingModals(),
})

watch(
  () => route.fullPath,
  () => {
    loadingStore.resetLoadingModals()
  }
)

watch(
  themeMode,
  (mode) => {
    stopSystemThemeSync()

    const nextResolvedTheme = resolveTheme(mode)
    settingStore.setResolvedTheme(nextResolvedTheme)
    applyResolvedTheme(nextResolvedTheme)

    if (mode === THEME_MODES.SYSTEM) {
      stopSystemThemeSync = watchSystemTheme((systemTheme: string) => {
        settingStore.setResolvedTheme(systemTheme)
        applyResolvedTheme(systemTheme)
      })
      return
    }

    stopSystemThemeSync = () => {}
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  stopSystemThemeSync()
})

onMounted(() => {
  void refreshAppUpdateStatus().catch(() => {})
})
</script>
