import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect } from 'storybook/test'
import FormField from './FormField.vue'

const meta = {
  title: 'UI/Forms/FormField',
  component: FormField,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    error: { control: 'text' },
    help: { control: 'text' },
    inline: { control: 'boolean' },
    required: { control: 'boolean' },
  },
} satisfies Meta<typeof FormField>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { label: 'Wallet Name', required: true },
  render: (args) => ({
    components: { FormField },
    setup: () => ({ args }),
    template: `
      <FormField v-bind="args">
        <input type="text" placeholder="Enter name" style="width:100%;padding:6px 8px" />
      </FormField>`,
  }),
}

export const WithError: Story = {
  args: { label: 'Password', error: 'Password must be at least 6 characters', required: true },
  render: (args) => ({
    components: { FormField },
    setup: () => ({ args }),
    template: `
      <FormField v-bind="args">
        <input type="password" placeholder="Password" style="width:100%;padding:6px 8px" />
      </FormField>`,
  }),
  play: async ({ canvasElement }) => {
    await expect(canvasElement).toHaveTextContent('Password must be at least 6 characters')
  },
}

export const WithHelp: Story = {
  args: { label: 'Mnemonic', help: 'Use a space between each word.' },
  render: (args) => ({
    components: { FormField },
    setup: () => ({ args }),
    template: `
      <FormField v-bind="args">
        <textarea rows="4" placeholder="word1 word2 word3" style="width:100%;padding:6px 8px"></textarea>
      </FormField>`,
  }),
}
