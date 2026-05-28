import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AppButton from '../actions/AppButton.vue'
import AppState from './AppState.vue'

const meta = {
  title: 'UI/Feedback/AppState',
  component: AppState,
  tags: ['autodocs'],
} satisfies Meta<typeof AppState>

export default meta
type Story = StoryObj<typeof meta>

export const Loading: Story = {
  args: {
    loading: true,
    loadingLabel: 'Loading wallets',
  },
}

export const Empty: Story = {
  args: {
    empty: true,
    emptyTitle: 'No wallets yet',
    emptyDescription: 'Create or import a wallet to get started.',
  },
  render: (args) => ({
    components: { AppButton, AppState },
    setup: () => ({ args }),
    template: `
      <AppState v-bind="args">
        <template #actions>
          <AppButton variant="primary">Create Wallet</AppButton>
        </template>
      </AppState>`,
  }),
}

export const Error: Story = {
  args: {
    error: true,
    errorTitle: 'Wallets could not be loaded',
    errorDescription: 'Check the keystore path and try again.',
  },
  render: (args) => ({
    components: { AppButton, AppState },
    setup: () => ({ args }),
    template: `
      <AppState v-bind="args">
        <template #actions>
          <AppButton variant="primary">Retry</AppButton>
        </template>
      </AppState>`,
  }),
}
