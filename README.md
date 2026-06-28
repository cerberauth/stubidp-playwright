# @cerberauth/stubidp-playwright

Playwright helper to drive [stubidp](https://github.com/cerberauth/stubidp) interaction UI from your own E2E tests.

The package does **not** start, configure, or own a stubidp instance — it only takes over the browser once your app's OIDC redirect lands on stubidp, and hands control back when the flow completes.

## Install

```sh
npm install -D @cerberauth/stubidp-playwright
```

`@playwright/test` is a peer dependency — bring your own.

## Usage

```ts
import { test, expect } from '@playwright/test'
import { StubIdp } from '@cerberauth/stubidp-playwright'

test('user signs in via stubidp', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /sign in/i }).click() // app kicks off OIDC
  await new StubIdp(page).signIn({ username: 'alice' }) // package drives stub UI
  await expect(page.getByText('Welcome')).toBeVisible() // back in the app
})
```

### With the fixture

Set `stubidpOptions` once in `playwright.config.ts` instead of repeating the issuer everywhere:

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test'
export default defineConfig({
  use: { stubidpOptions: { issuer: 'https://idp.dev.example.com' } },
})
```

```ts
// my.spec.ts
import { test, expect } from '@cerberauth/stubidp-playwright'

test('signs in', async ({ page, stubidp }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /sign in/i }).click()
  await stubidp.signIn({ username: 'alice' })
  await expect(page.getByText('Welcome')).toBeVisible()
})
```

## API

### `new StubIdp(page, options?)`

| Option    | Type     | Default | Description                                                   |
| --------- | -------- | ------- | ------------------------------------------------------------- |
| `issuer`  | `string` | —       | Issuer origin; prompts are only acted on while on this origin |
| `timeout` | `number` | `15000` | Max ms for the whole interaction                              |

### `stubidp.signIn(options?)`

High-level helper. Resolves whatever prompts stubidp shows (login, consent) and returns once the browser leaves stubidp. Tolerates skip-prompt and remembered grants.

| Option      | Type                     | Default       | Description                            |
| ----------- | ------------------------ | ------------- | -------------------------------------- |
| `username`  | `string`                 | `'stub-user'` | Username to fill                       |
| `password`  | `string`                 | `'password'`  | Password to fill                       |
| `consent`   | `'allow' \| 'deny'`      | `'allow'`     | What to do at the consent prompt       |
| `returnUrl` | `string \| RegExp \| fn` | —             | URL to wait for after the flow returns |
| `timeout`   | `number`                 | inherited     | Override per-call timeout              |

### Individual step methods

Use these when you need to assert between steps:

```ts
const idp = new StubIdp(page)
await idp.login({ username: 'alice' })
await expect(page.locator('#consent-screen')).toBeVisible()
await idp.allow()
```

| Method            | Description                                               |
| ----------------- | --------------------------------------------------------- |
| `login(opts?)`    | Fill and submit the login form                            |
| `allow()`         | Click the consent-allow button                            |
| `deny()`          | Click the consent-deny / abort button                     |
| `confirmLogout()` | Click the logout-confirm button if shown, no-op otherwise |

### `assertStubidpReachable(issuer, options?)`

Utility to verify a stubidp instance is up before your tests run. Checks the OIDC discovery endpoint.

```ts
import { assertStubidpReachable } from '@cerberauth/stubidp-playwright'
await assertStubidpReachable('http://localhost:9000')
```

### `stubidpSelectors`

Raw selector functions (e.g. for custom assertions):

```ts
import { stubidpSelectors as sel } from '@cerberauth/stubidp-playwright'
await expect(sel.loginForm(page)).toBeVisible()
```

## Selector contract

The helper is coupled to stubidp's rendered markup. Stable anchors (current):

| Prompt         | Selector                                         |
| -------------- | ------------------------------------------------ |
| Login form     | `form[action$="/login"]`                         |
| Username       | `#username`                                      |
| Password       | `#password`                                      |
| Login submit   | `form[action$="/login"] button[type="submit"]`   |
| Consent allow  | `form[action$="/confirm"] button[type="submit"]` |
| Consent deny   | `form[action$="/abort"] button[type="submit"]`   |
| Logout confirm | `button[form="op.logoutForm"][value="yes"]`      |

When stubidp adds `data-testid` attributes (`stubidp-login-form`, `stubidp-username`, etc.) the helper will prefer them automatically via a fallback chain — no consumer change needed.

**Minimum stubidp version:** `0.0.3` (current stable selectors). `data-testid` support: TBD in a follow-up PR.
