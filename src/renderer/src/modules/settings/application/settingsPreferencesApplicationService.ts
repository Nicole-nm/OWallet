import {
  DEFAULT_NETWORK,
  NETWORKS,
  getNodeListForNetwork,
  isTestNetNetwork,
} from '../../../shared/lib/constants'
import { THEME_MODES } from '../../../shared/lib/theme'
import { setLanguage } from '../../../shared/persistence/languagePersistence'
import {
  hasConfiguredSavePathSetting,
  loadConfiguredSavePath,
  selectAndPersistSavePath,
} from '../../../shared/persistence/savePathService'

export const SETTINGS_NETWORKS = NETWORKS
export const SETTINGS_THEME_MODES = THEME_MODES

type NetworkValue = (typeof NETWORKS)[keyof typeof NETWORKS]

interface SettingsStoreLike {
  network: NetworkValue
  nodeAddress?: string
  themeMode: string
  setNetwork(network: NetworkValue): void
  setNodeAddress(nodeAddress: string): void
  setThemeMode(themeMode: string): void
}

interface SettingsPreferenceOptions {
  settingStore: SettingsStoreLike
  translate?: (key: string) => string
}

function normalizeNetwork(network: string) {
  return Object.values(NETWORKS).includes(network) ? network : DEFAULT_NETWORK
}

function getValidNodeAddress(nodeAddress = '', nodeList: string[] = []) {
  return nodeList.includes(nodeAddress) ? nodeAddress : nodeList[0] || ''
}

export function loadSettingsPageState({
  settingStore,
  language,
}: {
  settingStore: SettingsStoreLike
  language: string
}) {
  const network = normalizeNetwork(settingStore.network)
  const nodeList = getNodeListForNetwork(network) || []
  const nodeAddress = getValidNodeAddress(settingStore.nodeAddress, nodeList)

  return {
    ok: true,
    network,
    nodeAddress,
    nodeList,
    language,
    themeMode: settingStore.themeMode,
  }
}

export function changeNetworkPreference(
  network: string,
  { settingStore, translate }: SettingsPreferenceOptions
) {
  const nextNetwork = normalizeNetwork(network)
  const nextNodeList = getNodeListForNetwork(nextNetwork) || []
  const nextNodeAddress = nextNodeList[0] || ''

  settingStore.setNetwork(nextNetwork)
  settingStore.setNodeAddress(nextNodeAddress)

  const networkLabel =
    typeof translate === 'function'
      ? isTestNetNetwork(nextNetwork)
        ? translate('common.testNet')
        : translate('common.mainNet')
      : nextNetwork

  return {
    ok: true,
    network: nextNetwork,
    nodeList: nextNodeList,
    nodeAddress: nextNodeAddress,
    message:
      typeof translate === 'function'
        ? `${translate('setting.setNetworkSuccess')}${networkLabel}`
        : '',
  }
}

export function changeNodeAddressPreference(
  nodeAddress: string,
  { settingStore, translate }: SettingsPreferenceOptions
) {
  const nodeList = getNodeListForNetwork(normalizeNetwork(settingStore.network)) || []
  const nextNodeAddress = getValidNodeAddress(nodeAddress, nodeList)
  settingStore.setNodeAddress(nextNodeAddress)

  return {
    ok: true,
    nodeAddress: nextNodeAddress,
    message:
      typeof translate === 'function'
        ? `${translate('setting.setNodeSuccess')}${nextNodeAddress}`
        : '',
  }
}

export function changeThemeModePreference(
  themeMode: string,
  { settingStore }: Pick<SettingsPreferenceOptions, 'settingStore'>
) {
  settingStore.setThemeMode(themeMode)

  return { ok: true, themeMode: settingStore.themeMode }
}

export function loadConfiguredSavePathPreference() {
  return loadConfiguredSavePath()
}

export function hasConfiguredSavePathPreference() {
  return hasConfiguredSavePathSetting()
}

export function selectAndPersistSavePathPreference() {
  return selectAndPersistSavePath()
}

export function changeApplicationLanguage(language: string) {
  setLanguage(language)
  return { ok: true, language }
}
