import type { Page } from '@playwright/test'

export const sel = {
  loginForm: (p: Page) =>
    p.locator('[data-testid="stubidp-login-form"], form[action$="/login"]').first(),
  username: (p: Page) => p.locator('[data-testid="stubidp-username"], #username').first(),
  password: (p: Page) => p.locator('[data-testid="stubidp-password"], #password').first(),
  loginSubmit: (p: Page) =>
    p
      .locator('[data-testid="stubidp-login-submit"], form[action$="/login"] button[type="submit"]')
      .first(),
  consentForm: (p: Page) => p.locator('form[action$="/confirm"]').first(),
  consentAllow: (p: Page) =>
    p
      .locator(
        '[data-testid="stubidp-consent-allow"], form[action$="/confirm"] button[type="submit"]',
      )
      .first(),
  consentDeny: (p: Page) =>
    p
      .locator('[data-testid="stubidp-consent-deny"], form[action$="/abort"] button[type="submit"]')
      .first(),
  logoutConfirm: (p: Page) =>
    p
      .locator('[data-testid="stubidp-logout-confirm"], button[form="op.logoutForm"][value="yes"]')
      .first(),
  logoutSuccess: (p: Page) =>
    p.locator('[data-testid="stubidp-logout-success"], :text("Signed out")').first(),
  loginCancel: (p: Page) => p.locator('form[action$="/abort"] button[type="submit"]').first(),
}
