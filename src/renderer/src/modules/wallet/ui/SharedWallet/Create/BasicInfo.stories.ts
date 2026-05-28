import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { fn } from 'storybook/test'
import BasicInfo from './BasicInfo.vue'

const meta = {
  title: 'Modules/Wallet/SharedWallet/CreateBasicInfo',
  component: BasicInfo,
  tags: ['autodocs'],
  args: {
    onNext: fn(),
    onCancel: fn(),
    onAddPk: fn(),
    onRemovePk: fn(),
    onValidateLabel: fn(),
    onValidatePublickey: fn(),
    onUpdateCopayerName: fn(),
    onUpdateCopayerPublicKey: fn(),
    'onUpdate:label': fn(),
  },
} satisfies Meta<typeof BasicInfo>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {
  args: {
    label: '',
    validLabel: true,
    pks: [
      { name: '', publickey: '', nameValid: true, pkValid: true },
      { name: '', publickey: '', nameValid: true, pkValid: true },
    ],
  },
}

export const Filled: Story = {
  args: {
    label: 'Team Treasury',
    validLabel: true,
    pks: [
      {
        name: 'Alice',
        publickey: '03d0fdb54acba3f6e53d4f8f2e3b2f1e7e6b',
        nameValid: true,
        pkValid: true,
      },
      {
        name: 'Bob',
        publickey: '02a8c5b3e6f1d4a7b9c2e5f8a1d4b7c0e3f6',
        nameValid: true,
        pkValid: true,
      },
    ],
  },
}

export const WithInvalidPublicKey: Story = {
  args: {
    label: 'Team Treasury',
    validLabel: true,
    pks: [
      { name: 'Alice', publickey: '03d0fdb54acba3f6e53d', nameValid: true, pkValid: true },
      { name: 'Bob', publickey: 'INVALID', nameValid: true, pkValid: false },
    ],
  },
}

export const InvalidLabel: Story = {
  args: {
    label: '',
    validLabel: false,
    pks: [{ name: '', publickey: '', nameValid: true, pkValid: true }],
  },
}

export const MaxCopayers: Story = {
  args: {
    label: 'Large Group Wallet',
    validLabel: true,
    pks: Array.from({ length: 12 }, (_, i) => ({
      name: `Copayer ${i + 1}`,
      publickey: `03d0fdb54acba3f6e53d4f8f2e3b2f1e7e6b${String(i).padStart(4, '0')}`,
      nameValid: true,
      pkValid: true,
    })),
  },
}
