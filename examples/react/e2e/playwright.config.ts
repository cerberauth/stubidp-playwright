import { fileURLToPath } from 'node:url'
import { defineConfig } from '@playwright/test'

const RP_DIR = fileURLToPath(new URL('..', import.meta.url))

const STUBIDP_PORT = 8585
const RP_PORT = 5173
const STUBIDP_ISSUER = `http://localhost:${STUBIDP_PORT}`
const CLIENT_ID = 'e2e-spa'
// Only fine because this is a throwaway local stub — a real SPA should be a public client.
const CLIENT_SECRET = 'e2e-spa-secret'

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
  projects: [{ name: 'default', use: { browserName: 'chromium' } }],
  webServer: [
    {
      // No trailing slash: the app registers window.location.origin as its redirect_uri.
      command: `STUBIDP_PORT=${STUBIDP_PORT} node_modules/.bin/stubidp --client-id ${CLIENT_ID} --client-secret ${CLIENT_SECRET} --redirect-uri http://localhost:${RP_PORT} --post-logout-redirect-uri http://localhost:${RP_PORT} --rate-limit-disabled`,
      cwd: RP_DIR,
      url: `${STUBIDP_ISSUER}/.well-known/openid-configuration`,
      reuseExistingServer: !process.env['CI'],
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      // Vite inlines VITE_* env vars at build time, so they must match the
      // App.tsx defaults (also passed here to `vite build` for clarity).
      command: `VITE_OIDC_ISSUER=${STUBIDP_ISSUER} VITE_OIDC_CLIENT_ID=${CLIENT_ID} VITE_OIDC_CLIENT_SECRET=${CLIENT_SECRET} npm run build && npm run preview`,
      cwd: RP_DIR,
      url: `http://localhost:${RP_PORT}`,
      reuseExistingServer: !process.env['CI'],
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
})
