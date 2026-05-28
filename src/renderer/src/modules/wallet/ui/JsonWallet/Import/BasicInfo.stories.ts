import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { fn } from 'storybook/test'
import BasicInfo from './BasicInfo.vue'

const meta = {
  title: 'Modules/Wallet/JsonWallet/ImportBasicInfo',
  component: BasicInfo,
  tags: ['autodocs'],
  args: {
    onNext: fn(),
    onCancel: fn(),
    onUpdateField: fn(),
    onDatLabelChange: fn(),
    onDatPasswordChange: fn(),
  },
} satisfies Meta<typeof BasicInfo>

export default meta
type Story = StoryObj<typeof meta>

const emptyForm = {
  tabName: 'wif',
  wifLabel: '',
  wif: '',
  wifPassword: '',
  wifRePassword: '',
  datPath: 'Select .dat file',
  datWallet: null,
  datLabel: [],
  datPassword: [],
  mnemonicLabel: '',
  mnemonic: '',
  mnemonicPassword: '',
  mnemonicRePassword: '',
  pkLabel: '',
  pk: '',
  pkPassword: '',
  pkRePassword: '',
  confirmModal: false,
}

const emptyValidation = {
  wifLabel: '',
  wif: '',
  wifPassword: '',
  wifRePassword: '',
  mnemonic: '',
  mnemonicPassword: '',
  mnemonicRePassword: '',
  pk: '',
  pkPassword: '',
  pkRePassword: '',
}

export const WifTab: Story = {
  args: {
    form: { ...emptyForm, tabName: 'wif' },
    validationErrors: { ...emptyValidation },
  },
}

export const WifTabFilled: Story = {
  args: {
    form: {
      ...emptyForm,
      tabName: 'wif',
      wifLabel: 'Imported Wallet',
      wif: 'L1QqHxRePkWFnQfDxniKFfBXMHbRZaZT8q3X7hwUW3SnZWG1MGVR',
      wifPassword: 'Password123!',
      wifRePassword: 'Password123!',
    },
    validationErrors: { ...emptyValidation },
  },
}

export const WifTabWithErrors: Story = {
  args: {
    form: { ...emptyForm, tabName: 'wif' },
    validationErrors: {
      ...emptyValidation,
      wifLabel: 'Label is required',
      wif: 'WIF key is required',
      wifPassword: 'Password is required',
    },
  },
}

export const DatTab: Story = {
  args: {
    form: {
      ...emptyForm,
      tabName: 'dat',
      datPath: 'wallet_backup.dat',
      datWallet: {
        accounts: [
          { address: 'AUr5QUfeBADq6BMY6Tp5yuMsUNGpsD7nLZ' },
          { address: 'AQf4Mzu1YJrhz9f3aRkkwSm9n3qhXGSh4p' },
        ],
      },
    },
    validationErrors: { ...emptyValidation },
  },
}

export const MnemonicTab: Story = {
  args: {
    form: { ...emptyForm, tabName: 'mnemonic' },
    validationErrors: { ...emptyValidation },
  },
}
