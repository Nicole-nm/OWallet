import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { fn, expect, within, userEvent } from 'storybook/test'
import ConnectLedger from './ConnectLedger.vue'

const meta = {
  title: 'Modules/Wallet/LedgerWallet/ConnectLedger',
  component: ConnectLedger,
  tags: ['autodocs'],
  args: {
    onNext: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof ConnectLedger>

export default meta
type Story = StoryObj<typeof meta>

export const Disconnected: Story = {
  args: {
    ledgerStatus: '',
    publicKey: '',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const connectButton = canvas.getByRole('button', { name: /connect/i })
    await expect(connectButton).toBeDisabled()
  },
}

export const Connecting: Story = {
  args: {
    ledgerStatus: 'Waiting for device…',
    publicKey: '',
  },
}

export const Connected: Story = {
  args: {
    ledgerStatus: 'Connected',
    publicKey: '03d0fdb54acba3f6e53d4f8f2e3b2f1e7e6b3d92c81a0e6a6f6a76de3b2f1e7e6b',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const connectButton = canvas.getByRole('button', { name: /connect/i })
    await expect(connectButton).toBeEnabled()
    await userEvent.click(connectButton)
    await expect(args.onNext).toHaveBeenCalled()
  },
}

export const CancelFlow: Story = {
  args: {
    ledgerStatus: 'Connected',
    publicKey: '03d0fdb54acba3f6e53d4f8f2e3b2f1e7e6b3d92c81a0e6a6f6a76de3b2f1e7e6b',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const cancelBtn = canvas.getByRole('button', { name: /cancel/i })
    await userEvent.click(cancelBtn)
    await expect(args.onCancel).toHaveBeenCalled()
  },
}
