import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { fn, expect, userEvent, within } from 'storybook/test'
import BasicInfo from './BasicInfo.vue'

const meta = {
  title: 'Modules/Wallet/JsonWallet/CreateBasicInfo',
  component: BasicInfo,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    password: { control: 'text' },
    rePassword: { control: 'text' },
  },
  args: {
    onNext: fn(),
    onCancel: fn(),
    'onUpdate:label': fn(),
    'onUpdate:password': fn(),
    'onUpdate:rePassword': fn(),
  },
} satisfies Meta<typeof BasicInfo>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {
  args: {
    label: '',
    password: '',
    rePassword: '',
    validationErrors: { label: '', password: '', rePassword: '' },
  },
}

export const Filled: Story = {
  args: {
    label: 'My Wallet',
    password: 'SecurePass123',
    rePassword: 'SecurePass123',
    validationErrors: { label: '', password: '', rePassword: '' },
  },
}

export const WithValidationErrors: Story = {
  args: {
    label: '',
    password: 'abc',
    rePassword: 'xyz',
    validationErrors: {
      label: 'Label is required',
      password: 'Password must be at least 6 characters',
      rePassword: 'Passwords do not match',
    },
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement).toHaveTextContent('Label is required')
    await expect(canvasElement).toHaveTextContent('Password must be at least 6 characters')
    await expect(canvasElement).toHaveTextContent('Passwords do not match')
  },
}

export const InteractionTest: Story = {
  args: {
    label: '',
    password: '',
    rePassword: '',
    validationErrors: { label: '', password: '', rePassword: '' },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    // Fill all fields
    const inputs = canvasElement.querySelectorAll('input')
    await userEvent.type(inputs[0]!, 'Test Wallet')
    await userEvent.type(inputs[1]!, 'Password123!')
    await userEvent.type(inputs[2]!, 'Password123!')
    // Click Next
    const nextButton = canvas.getByRole('button', { name: /next/i })
    await userEvent.click(nextButton)
    await expect(args.onNext).toHaveBeenCalled()
  },
}
