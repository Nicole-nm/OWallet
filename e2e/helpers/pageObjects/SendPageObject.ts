import type { Page } from '@playwright/test'

/**
 * Page Object for the Common Send page.
 * Handles send form, validation, confirmation step.
 */
export class SendPageObject {
  constructor(private page: Page) {}

  get recipientInput() {
    return this.page.getByPlaceholder(/recipient address/i)
  }

  get amountInput() {
    return this.page.getByPlaceholder(/^amount$/i)
  }

  get assetSelect() {
    return this.page.locator('.send-step__select').first()
  }

  get nextButton() {
    return this.page.locator('.send-step__actions').getByRole('button', { name: /next/i })
  }

  get confirmButton() {
    return this.page
      .locator('.send-confirm__actions')
      .getByRole('button', { name: /submit|confirm|send/i })
  }

  get cancelButton() {
    return this.page.getByRole('button', { name: /cancel/i })
  }

  get validationErrors() {
    return this.page.locator('.ant-message-notice')
  }

  get confirmTable() {
    return this.page.locator('.send-confirm__summary-card')
  }

  get agreementCheckbox() {
    return this.page.getByRole('checkbox')
  }

  async fillSendForm(recipient: string, amount: string) {
    await this.amountInput.click()
    await this.amountInput.fill(amount)
    await this.recipientInput.fill(recipient)
    await this.page.locator('body').click()
  }

  async submitSend() {
    await this.nextButton.click()
  }

  async confirmSend() {
    await this.confirmButton.click()
  }
}
