import { test, expect } from '@playwright/test'
import { StubIdp } from '../src/index.js'

// This spec runs against a stubidp started with --skip-prompt.
// The helper must no-op cleanly when no UI is shown.
test('signIn no-ops when skip-prompt is active', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Sign In' }).click()

  // No prompts appear; signIn should resolve without throwing
  await new StubIdp(page, { issuer: 'http://localhost:8484' }).signIn({
    returnUrl: /\/callback/,
  })

  await expect(page.locator('#claims')).toBeVisible()
})
