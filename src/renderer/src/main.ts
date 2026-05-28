import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import {
  Alert,
  Card,
  Checkbox,
  Col,
  ConfigProvider,
  DatePicker,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Menu,
  Modal,
  Pagination,
  Radio,
  Result,
  Row,
  Select,
  Skeleton,
  Slider,
  Space,
  Spin,
  Steps,
  Switch,
  Table,
  Tabs,
  TimePicker,
  Tooltip,
  Typography,
  Upload,
} from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import './shared/styles/index.scss'

import i18n from './lang'
import { migrateLegacySavePathPreference } from './shared/persistence/savePathService'
import AppButton from './shared/ui/actions/AppButton.vue'

const app = createApp(App)
const pinia = createPinia()
const antdComponents = [
  Alert,
  Card,
  Checkbox,
  Col,
  ConfigProvider,
  DatePicker,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Menu,
  Modal,
  Pagination,
  Radio,
  Result,
  Row,
  Select,
  Skeleton,
  Slider,
  Space,
  Spin,
  Steps,
  Switch,
  Table,
  Tabs,
  TimePicker,
  Tooltip,
  Typography,
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

async function bootstrap() {
  await migrateLegacySavePathPreference()
  await router.isReady()
  app.mount('#app')
}

void bootstrap()
