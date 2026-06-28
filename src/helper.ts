import type { Page } from '@playwright/test'
import { sel } from './selectors.js'

export interface StubIdpOptions {
  /** Issuer origin of the running stub; when set, prompts are only acted on while on this origin. */
  issuer?: string
  /** Max time (ms) for the whole interaction to resolve. Default: 15 000. */
  timeout?: number
}

export interface SignInOptions {
  username?: string
  password?: string
  /** What to do at the consent prompt when shown. Default: 'allow'. */
  consent?: 'allow' | 'deny'
  /** URL/predicate to wait for once the flow returns to the app. */
  returnUrl?: string | RegExp | ((url: URL) => boolean)
  timeout?: number
}

export interface LoginOptions {
  username?: string
  password?: string
}

export class StubIdp {
  constructor(
    private readonly page: Page,
    private readonly opts: StubIdpOptions = {},
  ) {}

  private onStubOrigin(): boolean {
    if (!this.opts.issuer) return true
    try {
      return new URL(this.page.url()).origin === new URL(this.opts.issuer).origin
    } catch {
      return false
    }
  }

  private async showing(locator: ReturnType<typeof sel.loginForm>): Promise<boolean> {
    if (!this.onStubOrigin()) return false
    try {
      return (await locator.count()) > 0 && (await locator.first().isVisible())
    } catch {
      return false
    }
  }

  /** Fill and submit the login form. */
  async login({ username = 'stub-user', password = 'password' }: LoginOptions = {}) {
    await sel.username(this.page).fill(username)
    const pwd = sel.password(this.page)
    if ((await pwd.count()) > 0) await pwd.fill(password)
    await sel.loginSubmit(this.page).click()
    await this.page.waitForLoadState('load')
  }

  /** Approve the consent prompt. */
  async allow() {
    await sel.consentAllow(this.page).click()
    await this.page.waitForLoadState('load')
  }

  /** Reject the consent prompt / abort the flow. */
  async deny() {
    await sel.consentDeny(this.page).click()
    await this.page.waitForLoadState('load')
  }

  /** Confirm an RP-initiated logout prompt if one is showing. No-ops when absent. */
  async confirmLogout() {
    const loc = sel.logoutConfirm(this.page)
    try {
      await loc.waitFor({ state: 'visible', timeout: this.opts.timeout ?? 5_000 })
    } catch {
      return
    }
    await loc.click()
    await this.page.waitForLoadState('load')
  }

  /**
   * High-level: resolves whatever stubidp prompts appear until the flow returns to the app.
   * Tolerates skip-prompt (no UI shown) and remembered grants (consent skipped).
   */
  async signIn(o: SignInOptions = {}): Promise<void> {
    const deadline = Date.now() + (o.timeout ?? this.opts.timeout ?? 15_000)

    // Wait for the first sign of the stub interaction — either a prompt appears
    // (normal flow) or the browser leaves the stub (skip-prompt/remembered grant).
    // This absorbs the full RP→stub redirect chain before the prompt-polling loop starts.
    if (this.opts.issuer) {
      const issuerOrigin = new URL(this.opts.issuer).origin
      const anyPrompt = this.page
        .locator('form[action$="/login"], form[action$="/confirm"], form[action$="/abort"]')
        .first()
      await Promise.race([
        anyPrompt.waitFor({ state: 'visible', timeout: Math.max(0, deadline - Date.now()) }),
        this.page.waitForURL((url) => url.origin !== issuerOrigin, {
          timeout: Math.max(0, deadline - Date.now()),
        }),
      ]).catch(() => {})
    }

    while (Date.now() < deadline) {
      await this.page
        .waitForLoadState('domcontentloaded', { timeout: Math.max(100, deadline - Date.now()) })
        .catch(() => {})

      if (await this.showing(sel.loginForm(this.page))) {
        await this.login({
          ...(o.username !== undefined && { username: o.username }),
          ...(o.password !== undefined && { password: o.password }),
        })
        continue
      }

      if (await this.showing(sel.consentForm(this.page))) {
        if (o.consent === 'deny') {
          await this.deny()
          return
        }
        await this.allow()
        continue
      }

      // No known stub prompt visible — flow completed (skip-prompt / grant remembered / denied).
      if (o.returnUrl) {
        await this.page.waitForURL(o.returnUrl, { timeout: Math.max(0, deadline - Date.now()) })
      }
      return
    }

    throw new Error('@cerberauth/stubidp-playwright: interaction did not resolve before timeout')
  }
}
