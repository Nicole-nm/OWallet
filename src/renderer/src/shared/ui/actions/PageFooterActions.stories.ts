import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PageFooterActions from './PageFooterActions.vue'
import AppButton from './AppButton.vue'

const meta = {
  title: 'UI/Actions/PageFooterActions',
  component: PageFooterActions,
  tags: ['autodocs'],
  argTypes: {
    align: { control: 'select', options: ['between', 'center', 'end'] },
  },
} satisfies Meta<typeof PageFooterActions>

export default meta
type Story = StoryObj<typeof meta>

export const SpaceBetween: Story = {
  args: { align: 'between' },
  render: (args) => ({
    components: { PageFooterActions, AppButton },
    setup: () => ({ args }),
    template: `
      <PageFooterActions v-bind="args">
        <AppButton variant="secondary">Cancel</AppButton>
        <AppButton variant="primary">Submit</AppButton>
      </PageFooterActions>`,
  }),
}

export const CenterAligned: Story = {
  args: { align: 'center' },
  render: (args) => ({
    components: { PageFooterActions, AppButton },
    setup: () => ({ args }),
    template: `
      <PageFooterActions v-bind="args">
        <AppButton variant="primary">Confirm</AppButton>
      </PageFooterActions>`,
  }),
}
