<template>
  <div>
    <div class="left-nav ow-text-center">
      <router-link class="logo-div" :to="{ name: ROUTE_NAMES.HOME }">
        <img class="logo-img" src="../../../assets/logo.svg" alt="" />
      </router-link>

      <router-link
        :to="{ name: ROUTE_NAMES.WALLETS }"
        class="nav-item"
        :class="{ 'nav-item--active': isWalletSectionActive }"
      >
        <a-tooltip placement="right" :title="$t('setting.wallets')">
          <WalletOutlined class="nav-icon" />
        </a-tooltip>
      </router-link>

      <router-link
        :to="{ name: ROUTE_NAMES.NODE_MANAGEMENT }"
        class="nav-item"
        :class="{ 'nav-item--active': isNodeSectionActive }"
      >
        <a-tooltip placement="right" :title="$t('vote.node')">
          <ShareAltOutlined class="nav-icon" />
        </a-tooltip>
      </router-link>

      <router-link
        :to="{ name: ROUTE_NAMES.DAPPS }"
        class="nav-item"
        :class="{ 'nav-item--active': isDappsActive }"
      >
        <a-tooltip placement="right" :title="$t('dapps.dapps')">
          <AppstoreOutlined class="nav-icon" />
        </a-tooltip>
      </router-link>

      <router-link
        :to="{ name: ROUTE_NAMES.SETTING }"
        class="setting-link"
        :class="{ 'nav-item--active': isSettingActive }"
      >
        <a-tooltip placement="right" :title="$t('setting.settings')">
          <span class="setting-entry">
            <SettingOutlined class="nav-icon" />
            <span v-if="hasUpdate" class="setting-update-dot"></span>
          </span>
        </a-tooltip>
      </router-link>

      <a-tooltip placement="right" :title="$t('setting.help')">
        <QuestionCircleOutlined class="nav-icon nav-help" @click="emit('help')" />
      </a-tooltip>

      <div class="nav-network">{{ network }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  WalletOutlined,
  ShareAltOutlined,
  AppstoreOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons-vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ROUTE_NAMES } from '../../../shared/navigation/routeNames'

const route = useRoute()

const isWalletSectionActive = computed(() => {
  const path = route.path
  return (
    path.startsWith('/wallets') ||
    path.startsWith('/shared-wallet') ||
    path.startsWith('/wallet') ||
    path.startsWith('/identities')
  )
})

const isNodeSectionActive = computed(() => route.path.startsWith('/governance'))
const isDappsActive = computed(() => route.path.startsWith('/dapps'))
const isSettingActive = computed(() => route.path.startsWith('/setting'))

defineOptions({
  name: 'TopLeftNav',
})

defineProps({
  network: {
    type: String,
    default: '',
  },
  hasUpdate: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['help'])
</script>

<style scoped lang="scss">
.left-nav {
  width: 4rem;
  height: 100%;
  position: fixed;
  left: 0;
  background-color: var(--ow-color-sidebar-bg);
  z-index: var(--ow-z-nav);
  transition: background-color var(--ow-duration) var(--ow-ease);
}

.logo-img {
  height: 4rem;
  width: 4rem;
}

.logo-div {
  display: block;
  height: 4rem;
  width: 4rem;
  background-color: var(--ow-color-sidebar-bg);
}

/* Shared nav glyph: crisp vector icon, muted by default, brand on hover/active. */
.nav-icon {
  font-size: 1.625rem;
  color: var(--ow-color-sidebar-text);
  opacity: 0.55;
  cursor: pointer;
  transition:
    color var(--ow-duration) var(--ow-ease),
    opacity var(--ow-duration) var(--ow-ease);
}

.nav-item {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 67px auto;
}

.nav-item:hover .nav-icon,
.nav-item--active .nav-icon {
  color: var(--ow-color-brand);
  opacity: 1;
}

.setting-link {
  position: fixed;
  bottom: 4rem;
  left: 0;
  display: flex;
  justify-content: center;
  width: 4rem;
}

.setting-link:hover .nav-icon,
.setting-link.nav-item--active .nav-icon {
  color: var(--ow-color-brand);
  opacity: 1;
}

.setting-entry {
  position: relative;
  display: inline-flex;
}

.setting-update-dot {
  position: absolute;
  top: -2px;
  right: -4px;
  width: 0.6rem;
  height: 0.6rem;
  border-radius: var(--ow-radius-pill);
  background: var(--ow-color-danger);
  border: 1px solid var(--ow-color-sidebar-bg);
}

.nav-help {
  position: absolute;
  bottom: 8rem;
  left: 0;
  display: flex;
  justify-content: center;
  width: 4rem;
}

.nav-help:hover {
  color: var(--ow-color-brand);
  opacity: 1;
}

.nav-network {
  position: absolute;
  bottom: 10px;
  left: 0;
  text-align: center;
  font-family: var(--ow-font-regular);
  font-size: 12px;
  color: var(--ow-color-sidebar-text);
  width: 100%;
}
</style>
