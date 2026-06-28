import { test, expect } from '@playwright/test'
import { StubIdp } from '../src/index.js'

const ISSUER = 'http://localhost:8484'

test('logout — confirm prompt clears session', async ({ page }) => {
  const idp = new StubIdp(page, { issuer: ISSUER })

  // Sign in first
  await page.goto('/')
  await page.getByRole('link', { name: 'Sign In' }).click()
  await idp.signIn({ username: 'dave' })
  await expect(page.locator('#claims')).toBeVisible()

  // Initiate logout
  await page.goto('/')
  await page.getByRole('link', { name: 'Logout' }).click()

  // Confirm the logout prompt on stubidp
  await idp.confirmLogout()

  // Should be back at RP root after post_logout_redirect_uri
  await expect(page).toHaveURL(/localhost:3100/)
  await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible()
})
