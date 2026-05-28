import type { Meta, StoryObj } from '@storybook/vue3-vite'
import RedeemInfoIcon from './RedeemInfoIcon.vue'

const meta = {
  title: 'UI/Feedback/RedeemInfoIcon',
  component: RedeemInfoIcon,
  tags: ['autodocs'],
} satisfies Meta<typeof RedeemInfoIcon>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
