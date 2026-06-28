import { test } from '@playwright/test'
import { StubIdp } from '../src/index.js'

const ISSUER = 'http://localhost:8484'

test('debug: signIn step by step', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Sign In' }).click()

  console.log('URL before signIn:', page.url())
  console.log('onStubOrigin check:', new URL(page.url()).origin === new URL(ISSUER).origin)

  const idp = new StubIdp(page, { issuer: ISSUER })

  // Test waitForURL - does it resolve immediately if already on issuer?
  const t0 = Date.now()
  await page.waitForURL((url) => url.origin === new URL(ISSUER).origin, { timeout: 2000 })
  console.log(`waitForURL(issuer) took: ${Date.now() - t0}ms`)

  // Check login form directly
  const loginLoc = page
    .locator('[data-testid="stubidp-login-form"], form[action$="/login"]')
    .first()
  const count = await loginLoc.count()
  console.log('loginForm count:', count)

  if (count > 0) {
    const visible = await loginLoc.isVisible()
    console.log('loginForm visible:', visible)
  }

  // Now try signIn
  await idp.signIn({ username: 'test-debug', timeout: 10000 })
  console.log('signIn done, URL:', page.url())

  // Wait for page to settle, then capture content regardless of #claims
  await page.waitForLoadState('networkidle').catch(() => {})
  const body = await page.locator('body').innerHTML()
  console.log('Page body:', body.slice(0, 500))

  const claims = page.locator('#claims')
  const error = page.locator('#error')
  console.log('claims count:', await claims.count())
  console.log('error count:', await error.count())
})
