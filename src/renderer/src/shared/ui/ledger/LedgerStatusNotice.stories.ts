import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, within } from 'storybook/test'
import LedgerStatusNotice from './LedgerStatusNotice.vue'

const meta = {
  title: 'UI/Ledger/LedgerStatusNotice',
  component: LedgerStatusNotice,
  tags: ['autodocs'],
  argTypes: {
    status: { control: 'text' },
    showTitle: { control: 'boolean' },
    compact: { control: 'boolean' },
  },
} satisfies Meta<typeof LedgerStatusNotice>

export default meta
type Story = StoryObj<typeof meta>

export const Connected: Story = {
  args: { status: 'Connected', showTitle: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('Connected')).toBeVisible()
  },
}

export const Waiting: Story = {
  args: { status: 'Waiting for device…', showTitle: true },
}

export const CompactMode: Story = {
  args: { status: 'Connected', showTitle: true, compact: true },
}

export const NoTitle: Story = {
  args: { status: 'Ready', showTitle: false },
}

export const WithExtra: Story = {
  args: { status: 'Connected' },
  render: (args) => ({
    components: { LedgerStatusNotice },
    setup: () => ({ args }),
    template: `
      <LedgerStatusNotice v-bind="args">
        <span style="color:#999;font-size:12px">Firmware v2.1.0</span>
      </LedgerStatusNotice>`,
  }),
}
