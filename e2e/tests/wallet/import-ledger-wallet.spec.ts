import { test, expect } from '../../fixtures/electronApp'

test.describe('Import Ledger Wallet', () => {
  test('shows the refreshed ledger onboarding copy and support action on the connect step', async ({
    appPage,
  }) => {
    await appPage.evaluate(() => {
      window.location.hash = '#/Wallets/importLedgerWallet'
    })
    await appPage.waitForURL(/importLedgerWallet/i)

    await expect(appPage.getByText('Ledger Info')).toBeVisible()
    await expect(appPage.getByRole('button', { name: /cancel/i })).toBeVisible()
    await expect(appPage.getByRole('button', { name: 'Ledger Support' })).toBeVisible()
    await expect(appPage.getByRole('button', { name: /^connect$/i })).toBeDisabled()
    await expect(appPage.getByText('How to use?')).toHaveCount(0)
  })
})
