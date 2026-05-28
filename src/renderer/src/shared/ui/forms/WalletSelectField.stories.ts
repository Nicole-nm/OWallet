import type { Meta, StoryObj } from '@storybook/vue3-vite'
import WalletSelectField from './WalletSelectField.vue'

const sampleOptions = [
  { value: 'AQ1234...abc', label: 'Main Wallet', key: 'key1', address: 'AQ1234...abc' },
  { value: 'AQ5678...def', label: 'Savings', key: 'key2', address: 'AQ5678...def' },
  { value: 'AQ9012...ghi', label: 'Ledger Wallet', address: 'AQ9012...ghi' },
]

const meta = {
  title: 'UI/Forms/WalletSelectField',
  component: WalletSelectField,
  tags: ['autodocs'],
  argTypes: {
    placeholder: { control: 'text' },
    emptyText: { control: 'text' },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof WalletSelectField>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    options: sampleOptions,
    placeholder: 'Select a wallet',
  },
}

export const WithSelection: Story = {
  args: {
    options: sampleOptions,
    value: 'AQ1234...abc',
    placeholder: 'Select a wallet',
  },
}

export const Empty: Story = {
  args: {
    options: [],
    placeholder: 'No wallets available',
    emptyText: 'Create or import a wallet first',
  },
}

export const Loading: Story = {
  args: {
    options: [],
    placeholder: 'Loading wallets',
    loading: true,
  },
}
