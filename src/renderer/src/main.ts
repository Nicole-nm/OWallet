import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import {
  Alert,
  Card,
  Checkbox,
  ConfigProvider,
  DatePicker,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Menu,
  Modal,
  Pagination,
  Radio,
  Select,
  Slider,
  Spin,
  Steps,
  Switch,
  Table,
  Tabs,
  TimePicker,
  Tooltip,
  Upload,
} from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import './shared/styles/index.scss'

import i18n from './lang'
import { migrateLegacySavePathPreference } from './shared/persistence/savePathService'
import AppButton from './shared/ui/actions/AppButton.vue'

const app = createApp(App)
const pinia = createPinia()
// Globally-registered Ant Design components. Trimmed to those actually used in
// at least one Vue template; components consumed via local `<script setup>`
// imports (Button, FormItem, Select, Spin, etc. inside shared/ui/*) stay
// per-component to keep tree-shaking effective.
//
// Removed (zero template usage as of the Round 5 bundle audit):
//   Col, Empty, List, Result, Row, Skeleton, Space, Typography
const antdComponents = [
  Alert,
  Card,
  Checkbox,
  ConfigProvider,
  DatePicker,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Menu,
  Modal,
  Pagination,
  Radio,
  Select,
  Slider,
  Spin,
  Steps,
  Switch,
  Table,
  Tabs,
  TimePicker,
  Tooltip,
  Upload,
]

app.use(pinia)
app.use(router)
app.use(i18n)

for (const component of antdComponents) {
  app.use(component)
}

app.component('AButton', AppButton)
app.component('AppButton', AppButton)

declare global {
  interface Window {
    __owScrollbarActivityInstalled?: boolean
  }
}

function installScrollbarActivityIndicator() {
  if (window.__owScrollbarActivityInstalled) {
    return
  }

  window.__owScrollbarActivityInstalled = true

  let hideTimer: number | undefined

  const showScrollbar = () => {
    document.documentElement.classList.add('ow-scrollbar--active')

    if (hideTimer !== undefined) {
      window.clearTimeout(hideTimer)
    }

    hideTimer = window.setTimeout(() => {
      document.documentElement.classList.remove('ow-scrollbar--active')
      hideTimer = undefined
    }, 800)
  }

  document.addEventListener('scroll', showScrollbar, { capture: true, passive: true })
  window.addEventListener('wheel', showScrollbar, { passive: true })
}

function removeStartupOverlay() {
  document.getElementById('owallet-startup')?.remove()
}

async function bootstrap() {
  await migrateLegacySavePathPreference()
  installScrollbarActivityIndicator()
  await router.isReady()
  app.mount('#app')
  removeStartupOverlay()
}

void bootstrap()
