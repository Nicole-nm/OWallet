import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { fn, expect, within, userEvent } from 'storybook/test'
import MyNodeCard from './MyNodeCard.vue'

const meta = {
  title: 'Modules/Governance/MyNodeCard',
  component: MyNodeCard,
  tags: ['autodocs'],
  args: {
    onManage: fn(),
    t: (key: string) => {
      const translations: Record<string, string> = {
        'myNode.stakeWalletAddress': 'Stake Wallet Address',
        'myNode.operationWalletPk': 'Operation Wallet Public Key',
        'myNode.manage': 'Manage',
      }
      return translations[key] ?? key
    },
  },
} satisfies Meta<typeof MyNodeCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    node: {
      name: 'OntPool-1',
      stakeAddress: 'AUr5QUfeBADq6BMY6Tp5yuMsUNGpsD7nLZ',
      publicKey: '03d0fdb54acba3f6e53d4f8f2e3b2f1e7e6b3d92c81a0e6a6f6a76de3b2f1e7e6b',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('OntPool-1')).toBeVisible()
    await expect(canvas.getByText(/AUr5QU/)).toBeVisible()
  },
}

export const ClickManage: Story = {
  args: {
    node: {
      name: 'TestNode',
      stakeAddress: 'AQf4Mzu1YJrhz9f3aRkkwSm9n3qhXGSh4p',
      publicKey: '02a8c5b3e6f1d4a7b9c2e5f8a1d4b7c0e3f6a9d2c5b8e1f4a7d0c3b6e9f2a5d8',
    },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const manageBtn = canvas.getByRole('button', { name: /manage/i })
    await userEvent.click(manageBtn)
    await expect(args.onManage).toHaveBeenCalled()
  },
}

export const LongValues: Story = {
  args: {
    node: {
      name: 'Very Long Node Name That Should Be Displayed Properly',
      stakeAddress: 'AUr5QUfeBADq6BMY6Tp5yuMsUNGpsD7nLZAUr5QUfeBADq6BMY6Tp5yu',
      publicKey: '03d0fdb54acba3f6e53d4f8f2e3b2f1e7e6b3d92c81a0e6a6f6a76de3b2f1e7e6b3d92c81a0e6a',
    },
  },
}
