import 'ant-design-vue/dist/reset.css'
import '../src/renderer/src/shared/styles/index.scss'
import { setup } from '@storybook/vue3'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import AppButton from '../src/renderer/src/shared/ui/actions/AppButton.vue'
import { createStorybookI18n, createStorybookRouter, setupPlatformMock } from './decorators'

// Mock the Electron bridge so stories can render without the preload context.
setupPlatformMock()

setup((app) => {
  app.use(createPinia())
  app.use(createStorybookRouter())
  app.use(createStorybookI18n())
  app.use(Antd)
  if (!app.component('AButton')) {
    app.component('AButton', AppButton)
  }
  if (!app.component('AppButton')) {
    app.component('AppButton', AppButton)
  }
})

/** @type { import('@storybook/vue3-vite').Preview } */
const preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      test: 'todo',
    },
  },
}

export default preview
