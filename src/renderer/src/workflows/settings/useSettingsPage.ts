import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import {
  changeApplicationLanguage,
  changeNetworkPreference,
  changeNodeAddressPreference,
  changeThemeModePreference,
  loadConfiguredSavePathPreference,
  loadSettingsPageState,
  SETTINGS_NETWORKS,
  SETTINGS_THEME_MODES,
  selectAndPersistSavePathPreference,
} from '../../modules/settings/application/settingsPreferencesApplicationService'
import { openExternalUrl } from '../../modules/app/application/externalNavigationApplicationService'
import { notifySuccess, notifyWarning } from '../../shared/ui/feedback'
import { useAppUpdateStore } from '../../stores/modules/AppUpdate'
import { useSettingStore } from '../../stores/modules/Setting'
import { refreshAppUpdateStatus } from '../support/appUpdateStatusRefresh'

export function useSettingsPage() {
  const { t, locale } = useI18n()
  const appUpdateStore = useAppUpdateStore()
  const settingStore = useSettingStore()
  const settingsState = loadSettingsPageState({ settingStore, language: locale.value })
  const {
    currentVersion,
    errorKey,
    hasChecked,
    hasUpdate,
    isChecking,
    lastCheckedAt,
    latestVersion,
  } = storeToRefs(appUpdateStore)

  const net = ref(settingsState.network)
  const nodeAddress = ref(settingsState.nodeAddress)
  const nodeList = ref(settingsState.nodeList)
  const lang = ref(settingsState.language)
  const savePath = ref('')
  const themeMode = ref(settingsState.themeMode)
  const displayedLatestVersion = computed(
    () => latestVersion.value || (hasChecked.value && !errorKey.value ? currentVersion.value : '')
  )
  const lastCheckedLabel = computed(() => {
    if (!lastCheckedAt.value) {
      return ''
    }

    return new Date(lastCheckedAt.value).toLocaleString()
  })

  function changeNet() {
    const result = changeNetworkPreference(net.value, { settingStore, translate: t })
    net.value = result.network
    nodeList.value = result.nodeList
    nodeAddress.value = result.nodeAddress
    notifySuccess(result.message, { literal: true })
  }

  function changeNode() {
    const result = changeNodeAddressPreference(nodeAddress.value, { settingStore, translate: t })
    nodeAddress.value = result.nodeAddress
    notifySuccess(result.message, { literal: true })
  }

  function changeLanguage() {
    const result = changeApplicationLanguage(lang.value)
    locale.value = result.language
    lang.value = result.language
  }

  function changeThemeMode() {
    const result = changeThemeModePreference(themeMode.value, { settingStore })
    themeMode.value = result.themeMode
  }

  async function checkForUpdates() {
    const result = await refreshAppUpdateStatus()

    if (!result.ok) {
      notifyWarning(result.errorKey || 'common.updateCheckFailed')
      return result
    }

    if (result.hasUpdate) {
      notifyWarning('common.newVersionAvailable')
      return result
    }

    notifySuccess('common.currentlyLatestVersion')
    return result
  }

  function openLatestRelease() {
    if (!appUpdateStore.releaseUrl) {
      return
    }

    openExternalUrl(appUpdateStore.releaseUrl)
  }

  async function setSavePath() {
    const result = await selectAndPersistSavePathPreference()
    if (!result.ok) {
      notifyWarning(result.errorKey || 'common.savedbFailed')
      return
    }

    savePath.value = result.path || ''
    window.location.reload()
  }

  onMounted(async () => {
    savePath.value = (await loadConfiguredSavePathPreference()) || ''
  })

  return {
    NETWORKS: SETTINGS_NETWORKS,
    THEME_MODES: SETTINGS_THEME_MODES,
    lang,
    net,
    nodeAddress,
    nodeList,
    savePath,
    t,
    themeMode,
    changeLanguage,
    changeNet,
    changeNode,
    changeThemeMode,
    hasChecked,
    hasUpdate,
    isChecking,
    currentVersion,
    displayedLatestVersion,
    lastCheckedLabel,
    updateErrorKey: errorKey,
    setSavePath,
    checkForUpdates,
    openLatestRelease,
  }
}
