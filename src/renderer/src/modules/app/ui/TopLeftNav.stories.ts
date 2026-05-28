import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { fn } from 'storybook/test'
import TopLeftNav from './TopLeftNav.vue'

const meta = {
  title: 'Modules/App/TopLeftNav',
  component: TopLeftNav,
  tags: ['autodocs'],
  args: {
    onHelp: fn(),
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof TopLeftNav>

export default meta
type Story = StoryObj<typeof meta>

export const MainNet: Story = {
  args: {
    network: 'MainNet',
  },
}

export const TestNet: Story = {
  args: {
    network: 'TestNet',
  },
}

export const NoNetwork: Story = {
  args: {
    network: '',
  },
}

export const WithUpdate: Story = {
  args: {
    hasUpdate: true,
    network: 'MainNet',
  },
}
