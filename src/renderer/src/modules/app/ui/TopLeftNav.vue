<template>
  <div>
    <div class="left-nav text-center">
      <router-link class="logo-div" :to="{ name: ROUTE_NAMES.HOME }">
        <img class="logo-img" src="../../../assets/logo.png" alt="" />
      </router-link>

      <router-link :to="{ name: ROUTE_NAMES.WALLETS }" active-class="nav-wallets-active">
        <a-tooltip placement="right" :title="$t('setting.wallets')">
          <div class="nav-wallets"></div>
        </a-tooltip>
      </router-link>

      <!-- <router-link :to="{name:'Identities'}" active-class="nav-accounts-active">
        <a-tooltip placement="right" :title="$t('setting.ontid')">
              <div class="nav-accounts"></div>
          </a-tooltip>
      </router-link> -->

      <router-link
        :to="{ name: ROUTE_NAMES.SETTING }"
        active-class="nav-setting-active"
        class="setting-link"
      >
        <a-tooltip placement="right" :title="$t('setting.settings')">
          <div class="setting-entry">
            <div class="setting-img"></div>
            <span v-if="hasUpdate" class="setting-update-dot"></span>
          </div>
        </a-tooltip>
      </router-link>

      <router-link :to="{ name: ROUTE_NAMES.NODE_MANAGEMENT }" active-class="node-stake-active">
        <a-tooltip placement="right" :title="$t('setting.nodeStake')">
          <div class="node-stake-icon"></div>
        </a-tooltip>
      </router-link>

      <router-link :to="{ name: ROUTE_NAMES.DAPPS }" active-class="nav-dapps-active">
        <a-tooltip placement="right" :title="$t('dapps.dapps')">
          <div class="nav-dapps"></div>
        </a-tooltip>
      </router-link>

      <!-- <div class="setting-img" alt="" @click="toSetting"></div> -->

      <a-tooltip placement="right" :title="$t('setting.help')">
        <div class="nav-help" @click="emit('help')"></div>
      </a-tooltip>

      <div class="nav-network">{{ network }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ROUTE_NAMES } from '../../../shared/navigation/routeNames'

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

<style scoped>
.left-nav {
  width: 4rem;
  height: 100%;
  position: fixed;
  left: 0;
  background-color: var(--ow-color-sidebar-bg);
  z-index: 1001;
  transition: background-color 0.2s ease;
}

.logo-img {
  height: 4rem;
  width: 4rem;
}

.logo-div {
  height: 4rem;
  width: 4rem;
  background-color: var(--ow-color-sidebar-bg);
}

.setting-img,
.setting-btn {
  height: 1.5rem;
  width: 1.5rem;
}

.nav-setting-active .setting-img {
  background: url('../../../assets/selectsetting.png') center center;
}

.setting-link {
  position: fixed;
  bottom: 4rem;
  left: 1.25rem;
  width: 1.5rem;
  height: 1.5rem;
}

.setting-entry {
  position: relative;
  width: 100%;
  height: 100%;
}

.setting-img {
  background: url('../../../assets/settingunselect.png') center center;
  background-size: contain;
}

.setting-link:hover .setting-img {
  background: url('../../../assets/selectsetting.png') center center;
}

.setting-img {
  cursor: pointer;
}

.setting-update-dot {
  position: absolute;
  top: -2px;
  right: -4px;
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 999px;
  background: #ff4d4f;
  border: 1px solid var(--ow-color-sidebar-bg);
}

.temp-top {
  margin-top: 30px;
}

.nav-help {
  width: 1.5rem;
  height: 1.5rem;
  position: absolute;
  bottom: 8rem;
  left: 1.25rem;
  background: url('../../../assets/helpunselected.png') center center;
  cursor: pointer;
}

.node-stake-icon {
  width: 24px;
  height: 24px;
  margin: 67px auto;
  background: url('../../../assets/node.png');
  background-size: cover;
  cursor: pointer;
}

.node-stake-active div {
  background: url('../../../assets/nodeSelect.png') center center;
}
.node-stake-icon:hover {
  background: url('../../../assets/nodeSelect.png') center center;
}

.nav-help:hover {
  background: url('../../../assets/helpselect.png');
}

.nav-network {
  position: absolute;
  bottom: 10px;
  left: 0;
  text-align: center;
  font-family: PingFangSC-Regular;
  font-size: 12px;
  color: var(--ow-color-sidebar-text);
  width: 100%;
}

.nav-accounts {
  width: 24px;
  height: 24px;
  margin: 67px auto;
  background: url('../../../assets/accounts.png');
  background-size: cover;
  cursor: pointer;
}

.nav-accounts-active div {
  background: url('../../../assets/account-hover.png');
  background-size: cover;
}

.nav-accounts:hover {
  background: url('../../../assets/account-hover.png');
  background-size: cover;
}

.nav-wallets {
  width: 24px;
  height: 24px;
  margin: 67px auto;
  background: url('../../../assets/unselectwallet.png') center center;
  background-size: cover;
  cursor: pointer;
}

.nav-wallets-active div {
  background: url('../../../assets/selectwallet.png') center center;
}

.nav-wallets:hover {
  background: url('../../../assets/selectwallet.png') center center;
}

.nav-dapps {
  width: 24px;
  height: 24px;
  margin: 67px auto;
  background: url('../../../assets/dapps.png') center center;
  background-size: contain;
  cursor: pointer;
}

.nav-dapps-active div {
  background: url('../../../assets/dapps-hover.png') center center;
  background-size: contain;
}

.nav-dapps:hover {
  background: url('../../../assets/dapps-hover.png') center center;
  background-size: contain;
}
</style>
