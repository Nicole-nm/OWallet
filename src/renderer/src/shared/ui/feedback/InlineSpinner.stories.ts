import type { Meta, StoryObj } from '@storybook/vue3-vite'
import InlineSpinner from './InlineSpinner.vue'

const meta = {
  title: 'UI/Feedback/InlineSpinner',
  component: InlineSpinner,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    size: { control: 'select', options: ['small', 'default', 'large'] },
  },
} satisfies Meta<typeof InlineSpinner>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: 'Loading wallets',
  },
}

export const IconOnly: Story = {
  args: {
    label: '',
  },
}
