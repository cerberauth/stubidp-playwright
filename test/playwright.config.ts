import { defineConfig } from '@playwright/test'

const STUBIDP_PORT = 8484
const RP_PORT = 3100
const STUBIDP_ISSUER = `http://localhost:${STUBIDP_PORT}`

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  retries: process.env['CI'] ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${RP_PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'default',
      use: { browserName: 'chromium' },
      testIgnore: ['**/skip-prompt.spec.ts'],
    },
    {
      name: 'skip-prompt',
      use: { browserName: 'chromium' },
      testMatch: ['**/skip-prompt.spec.ts'],
    },
  ],
  webServer: [
    {
      command: `STUBIDP_PORT=${STUBIDP_PORT} ../node_modules/.bin/stubidp --client-id e2e --client-secret e2esecret --redirect-uri http://localhost:${RP_PORT}/callback --post-logout-redirect-uri http://localhost:${RP_PORT}/ --rate-limit-disabled`,
      url: `${STUBIDP_ISSUER}/.well-known/openid-configuration`,
      reuseExistingServer: !process.env['CI'],
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: `STUBIDP_ISSUER=${STUBIDP_ISSUER} RP_PORT=${RP_PORT} ../node_modules/.bin/tsx rp/server.ts`,
      url: `http://localhost:${RP_PORT}`,
      reuseExistingServer: !process.env['CI'],
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
})
