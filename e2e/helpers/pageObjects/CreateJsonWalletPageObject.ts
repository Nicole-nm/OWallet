import type { Page } from '@playwright/test'

/**
 * Page Object for the Create JSON Wallet page.
 * Two-step wizard: BasicInfo → ConfirmInfo
 */
export class CreateJsonWalletPageObject {
  constructor(private page: Page) {}

  get basicFields() {
    return this.page.locator('.json-create .ow-form-item')
  }

  // --- Step 1: Basic Info ---

  get labelInput() {
    return this.basicFields.nth(0).locator('input').first()
  }

  get passwordInput() {
    return this.basicFields.nth(1).locator('input').first()
  }

  get rePasswordInput() {
    return this.basicFields.nth(2).locator('input').first()
  }

  get cancelButton() {
    return this.page.getByRole('button', { name: /cancel/i })
  }

  get nextButton() {
    return this.page.getByRole('button', { name: /next/i })
  }

  /** Validation error messages visible on the form. */
  get validationErrors() {
    return this.page.locator('.json-create .ant-form-item-explain-error')
  }

  get confirmContainer() {
    return this.page.locator('.json-confirm')
  }

  async fillBasicInfo(label: string, password: string, rePassword: string) {
    await this.labelInput.fill(label)
    await this.passwordInput.fill(password)
    await this.rePasswordInput.fill(rePassword)
  }

  async submitBasicStep() {
    await this.nextButton.click()
  }

  // --- Step 2: Confirm Info ---

  /** The wallet address displayed in the confirm step. */
  get walletAddress() {
    return this.confirmContainer
      .locator('.json-confirm__summary-row')
      .nth(1)
      .locator('.json-confirm__value')
  }

  /** The "Download" backup button. */
  get downloadButton() {
    return this.page.getByRole('button', { name: /download/i })
  }

  /** The final submit / done button. */
  get doneButton() {
    return this.page.getByRole('button', { name: /next/i }).last()
  }

  async submitConfirmStep() {
    await this.doneButton.click()
  }
}
