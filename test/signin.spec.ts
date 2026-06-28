import { test, expect } from '@playwright/test'
import { StubIdp } from '../src/index.js'

const ISSUER = 'http://localhost:8484'

test.describe('signIn — happy path', () => {
  test('completes login and consent, lands on welcome page', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Sign In' }).click()

    await new StubIdp(page, { issuer: ISSUER }).signIn({
      username: 'alice',
      returnUrl: /\/callback/,
    })

    await expect(page.locator('#claims')).toBeVisible()
    const claims = JSON.parse((await page.locator('#claims').textContent()) ?? '{}') as {
      sub?: string
    }
    expect(claims.sub).toBeTruthy()
  })

  test('remembered grant skips consent on second sign-in', async ({ page }) => {
    const idp = new StubIdp(page, { issuer: ISSUER })

    // First sign-in — consent shown
    await page.goto('/')
    await page.getByRole('link', { name: 'Sign In' }).click()
    await idp.signIn({ username: 'bob' })
    await expect(page.locator('#claims')).toBeVisible()

    // Second sign-in — consent must be skipped automatically
    await page.goto('/')
    await page.getByRole('link', { name: 'Sign In' }).click()
    await idp.signIn({ username: 'bob', returnUrl: /\/callback/ })
    await expect(page.locator('#claims')).toBeVisible()
  })
})

test.describe('signIn — deny', () => {
  test('deny returns access_denied error to RP', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Sign In' }).click()

    await new StubIdp(page, { issuer: ISSUER }).signIn({
      username: 'carol',
      consent: 'deny',
    })

    await expect(page.locator('#error')).toHaveText('access_denied')
  })
})
