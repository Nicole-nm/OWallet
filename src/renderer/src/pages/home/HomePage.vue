<template>
  <div class="row-home home-container">
    <div class="col-10 bg-container">
      <div class="home-img"></div>
      <div class="home-upgrade" v-if="hasUpdate">
        <span>{{ $t('common.versionUpdate') }}</span>
        <span v-if="latestVersion" class="home-upgrade-version"
          >{{ $t('common.latestVersion') }}: {{ latestVersion }}</span
        >
        <a @click="handleUpdate">{{ $t('common.getLatestVersion') }}</a>
      </div>
    </div>
    <div class="col-2">
      <div class="div-slogan home-slogan">
        <p>OWallet</p>
        <p>A comprehensive Ontology desktop wallet.</p>
      </div>
      <div>
        <router-link
          class="go-to-wallets"
          :to="{ name: ROUTE_NAMES.WALLETS }"
          @mouseenter="primeWallets"
          @focus="primeWallets"
        >
          <div>ENTER -></div>
        </router-link>
      </div>

      <div class="div-footer-version">
        <p>Version: {{ version }}</p>
        <p>Powered by Ontology</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ROUTE_NAMES } from '../../shared/navigation/routeNames'
import { useHomePage } from '../../workflows/home/useHomePage'

defineOptions({
  name: 'HomePage',
})

const workflow = useHomePage()
const { handleUpdate, hasUpdate, latestVersion, primeWallets, version } = workflow
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css?family=Source+Sans+Pro');

.row-home {
  margin-left: -5.13rem;
  display: flex;
  flex-wrap: nowrap;
  height: 100%;
}

.row-home .col-10 {
  padding: 0;
  flex: 0 0 83.333%;
  max-width: 83.333%;
}

.col-2 {
  flex: 0 0 16.667%;
  max-width: 16.667%;
  text-align: center;
  padding-right: 15px;
  padding-left: 15px;
  position: relative;
  background: var(--ow-color-surface);
}

.img-home-page {
  width: 100%;
  height: 100%;
}

.div-slogan {
  margin-top: 30vh;
  text-align: left;
}

.go-to-wallets {
  display: inline-block;
  width: 10rem;
  height: 2.5rem;
  line-height: 2.5rem;
  background-color: var(--ow-color-brand);
  font-family: var(--ow-font-medium);
  font-size: 14px;
  color: var(--ow-color-text-inverse);
  text-align: center;
  text-decoration: none;
  border-radius: 0;
  margin-top: 15vh;
  cursor: pointer;
}
.go-to-wallets:hover {
  background-color: var(--ow-color-brand-hover);
  color: var(--ow-color-text-inverse);
}

.div-footer-version {
  text-align: center;
  position: absolute;
  bottom: 10px;
  margin-left: auto;
  margin-right: auto;
  left: 0;
  right: 0;
}
.div-footer-version P {
  margin: 0;
  color: var(--ow-color-text-secondary);
}
.home-img {
  width: 100%;
  height: 100%;
  background: url('../../assets/home/background@1.5x.png') center center;
  background-size: cover;
}
.home-container {
  position: fixed;
  width: 100%;
  height: 100%;
  margin-top: -4rem;
}
.home-slogan :first-child {
  font-family: var(--ow-font-medium);
  font-size: 16px;
  color: var(--ow-color-text-primary);
  text-align: left;
  margin: 0;
}
.home-slogan :last-child {
  font-family: var(--ow-font-regular);
  color: var(--ow-color-text-secondary);
  margin: 0;
}
.bg-container {
  position: relative;
}
.home-upgrade {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  text-align: center;
  border: 1px solid var(--ow-color-accent);
  background: var(--ow-color-accent);
  color: var(--ow-color-text-primary);
  font-family: var(--ow-font-regular);
}
.home-upgrade-version {
  font-family: var(--ow-font-medium);
}
.home-upgrade a {
  color: var(--ow-color-brand);
}
.home-upgrade a:hover {
  color: var(--ow-color-brand-hover);
}
</style>
