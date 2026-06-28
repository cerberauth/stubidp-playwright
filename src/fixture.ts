import { test as base } from '@playwright/test'
import { StubIdp, type StubIdpOptions } from './helper.js'

type StubIdpFixtures = {
  stubidp: StubIdp
  stubidpOptions: StubIdpOptions
}

export const test = base.extend<StubIdpFixtures>({
  stubidpOptions: [{}, { option: true }],
  stubidp: async ({ page, stubidpOptions }, use) => {
    await use(new StubIdp(page, stubidpOptions))
  },
})

export { expect } from '@playwright/test'
