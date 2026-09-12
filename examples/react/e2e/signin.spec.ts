import { test, expect } from '@playwright/test'
import { StubIdp } from '@cerberauth/stubidp-playwright'

const ISSUER = 'http://localhost:8585'

test('user signs in through stubidp and sees their claims', async ({ page }) => {
  await page.goto('/')
  // The "Sign In" button kicks off an async client-side redirect (fetch + location.href),
  // unlike a plain <a href>, so wait for the browser to actually leave for stubidp before
  // driving the interaction — otherwise StubIdp could start observing the app's own page.
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.waitForURL(`${ISSUER}/**`)

  await new StubIdp(page, { issuer: ISSUER }).signIn({
    username: 'alice',
    returnUrl: '/',
  })

  await expect(page.locator('#claims')).toBeVisible()
  const claims = JSON.parse((await page.locator('#claims').textContent()) ?? '{}') as {
    sub?: string
  }
  expect(claims.sub).toBeTruthy()
})

test('deny at consent returns to the app without signing in', async ({ page }) => {
  await page.goto('/')
  // The "Sign In" button kicks off an async client-side redirect (fetch + location.href),
  // unlike a plain <a href>, so wait for the browser to actually leave for stubidp before
  // driving the interaction — otherwise StubIdp could start observing the app's own page.
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.waitForURL(`${ISSUER}/**`)

  await new StubIdp(page, { issuer: ISSUER }).signIn({
    username: 'bob',
    consent: 'deny',
  })

  await expect(page.locator('#error')).toHaveText('access_denied')
})

test('logout clears the session', async ({ page }) => {
  const idp = new StubIdp(page, { issuer: ISSUER })

  await page.goto('/')
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.waitForURL(`${ISSUER}/**`)
  await idp.signIn({ username: 'carol', returnUrl: '/' })
  await expect(page.locator('#claims')).toBeVisible()

  await page.getByRole('button', { name: 'Logout' }).click()
  await idp.confirmLogout()

  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
})
