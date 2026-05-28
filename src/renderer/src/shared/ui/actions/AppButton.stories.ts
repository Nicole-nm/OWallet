import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { fn, expect, within, userEvent } from 'storybook/test'
import AppButton from './AppButton.vue'

const meta = {
  title: 'UI/Actions/AppButton',
  component: AppButton,
  tags: ['autodocs'],
  args: {
    onClick: fn(),
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'accent', 'ghost', 'text', 'contrast', 'danger'],
    },
    size: { control: 'select', options: ['default', 'compact'] },
    htmlType: { control: 'select', options: ['button', 'submit', 'reset'] },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
    block: { control: 'boolean' },
  },
} satisfies Meta<typeof AppButton>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: { variant: 'primary' },
  render: (args) => ({
    components: { AppButton },
    setup: () => ({ args }),
    template: '<AppButton v-bind="args">Primary Action</AppButton>',
  }),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button', { name: /primary action/i })
    await userEvent.click(button)
    await expect(args.onClick).toHaveBeenCalledOnce()
  },
}

export const Secondary: Story = {
  args: { variant: 'secondary' },
  render: (args) => ({
    components: { AppButton },
    setup: () => ({ args }),
    template: '<AppButton v-bind="args">Secondary Action</AppButton>',
  }),
}

export const Text: Story = {
  args: { variant: 'text' },
  render: (args) => ({
    components: { AppButton },
    setup: () => ({ args }),
    template: '<AppButton v-bind="args">Text Link</AppButton>',
  }),
}

export const Compact: Story = {
  args: { variant: 'primary', size: 'compact' },
  render: (args) => ({
    components: { AppButton },
    setup: () => ({ args }),
    template: '<AppButton v-bind="args">Compact</AppButton>',
  }),
}

export const Loading: Story = {
  args: { variant: 'primary', loading: true },
  render: (args) => ({
    components: { AppButton },
    setup: () => ({ args }),
    template: '<AppButton v-bind="args">Submitting…</AppButton>',
  }),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button')
    await userEvent.click(button)
    // Loading button should suppress click events
    await expect(args.onClick).not.toHaveBeenCalled()
  },
}

export const Disabled: Story = {
  args: { variant: 'primary', disabled: true },
  render: (args) => ({
    components: { AppButton },
    setup: () => ({ args }),
    template: '<AppButton v-bind="args">Disabled</AppButton>',
  }),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button')
    await userEvent.click(button)
    // Disabled button should suppress click events
    await expect(args.onClick).not.toHaveBeenCalled()
  },
}

export const Block: Story = {
  args: { variant: 'primary', block: true },
  render: (args) => ({
    components: { AppButton },
    setup: () => ({ args }),
    template: '<div style="width:320px"><AppButton v-bind="args">Continue</AppButton></div>',
  }),
}
