import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Breadcrumb from './Breadcrumb.vue'

const meta = {
  title: 'UI/Navigation/Breadcrumb',
  component: Breadcrumb,
  tags: ['autodocs'],
  argTypes: {
    current: { control: 'text' },
  },
} satisfies Meta<typeof Breadcrumb>

export default meta
type Story = StoryObj<typeof meta>

export const SingleLevel: Story = {
  args: {
    routes: [{ path: '/Wallets', name: 'Wallets' }],
    current: 'Create Wallet',
  },
}

export const MultiLevel: Story = {
  args: {
    routes: [
      { path: '/node', name: 'Governance' },
      { path: '/node/nodeList', name: 'Node List' },
    ],
    current: 'Stake History',
  },
}
