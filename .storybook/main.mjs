import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'

/** @type { import('@storybook/vue3-vite').StorybookConfig } */
const isVitest = process.env.VITEST === 'true' || process.env.VITEST === '1'

const config = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: isVitest
    ? ['@storybook/addon-vitest']
    : [
        '@chromatic-com/storybook',
        '@storybook/addon-vitest',
        '@storybook/addon-a11y',
        '@storybook/addon-docs',
        '@storybook/addon-onboarding',
      ],
  framework: '@storybook/vue3-vite',
  async viteFinal(config) {
    const plugins = Array.isArray(config.plugins)
      ? config.plugins.filter((plugin) => plugin?.name !== 'vite:vue')
      : []

    return {
      ...config,
      plugins: [vue(), ...plugins],
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          '@': fileURLToPath(new URL('../src/renderer/src', import.meta.url)),
        },
      },
    }
  },
}

export default config
