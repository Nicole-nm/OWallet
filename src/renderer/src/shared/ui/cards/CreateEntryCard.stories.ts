import type { Meta, StoryObj } from '@storybook/vue3-vite'
import CreateEntryCard from './CreateEntryCard.vue'

const meta = {
  title: 'UI/Cards/CreateEntryCard',
  component: CreateEntryCard,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['wallet', 'identity'] },
    actionLayout: { control: 'select', options: ['stacked', 'single'] },
    bordered: { control: 'boolean' },
  },
} satisfies Meta<typeof CreateEntryCard>

export default meta
type Story = StoryObj<typeof meta>

export const WalletCard: Story = {
  args: {
    actions: [
      { label: 'Create', to: '/Wallets/createJsonWallet' },
      { label: 'Import', to: '/Wallets/importJsonWallet' },
    ],
    variant: 'wallet',
  },
}

export const SingleAction: Story = {
  args: {
    actions: [{ label: 'Create Wallet', to: '/Wallets/createJsonWallet' }],
    actionLayout: 'single',
  },
}

export const Bordered: Story = {
  args: {
    actions: [
      { label: 'Create', to: '/Wallets/createJsonWallet' },
      { label: 'Import', to: '/Wallets/importJsonWallet' },
    ],
    bordered: true,
  },
}
