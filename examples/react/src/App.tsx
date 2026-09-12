import { AuthProvider } from './lib/auth/AuthProvider.js'
import { useAuth } from './lib/auth/useAuth.js'

// Vite inlines these at build time, so the e2e webServer must rebuild the app
// whenever the issuer/client differ from these defaults (see e2e/playwright.config.ts).
const ISSUER = import.meta.env.VITE_OIDC_ISSUER ?? 'http://localhost:8585'
const CLIENT_ID = import.meta.env.VITE_OIDC_CLIENT_ID ?? 'e2e-spa'
const CLIENT_SECRET = import.meta.env.VITE_OIDC_CLIENT_SECRET ?? 'e2e-spa-secret'

function Home() {
  const { user, isAuthenticated, login, logout, error } = useAuth()

  if (isAuthenticated) {
    return (
      <main>
        <h1>Welcome</h1>
        <pre id="claims">{JSON.stringify(user, null, 2)}</pre>
        <button id="logout" onClick={() => logout()}>
          Logout
        </button>
      </main>
    )
  }

  if (error) {
    return (
      <main>
        <h1>Error</h1>
        <p id="error">{error.error}</p>
        <p id="error-description">{error.errorDescription}</p>
      </main>
    )
  }

  return (
    <main>
      <h1>React + stubidp-playwright example</h1>
      <button id="sign-in" onClick={() => void login()}>
        Sign In
      </button>
    </main>
  )
}

export function App() {
  return (
    <AuthProvider issuer={ISSUER} clientId={CLIENT_ID} clientSecret={CLIENT_SECRET}>
      <Home />
    </AuthProvider>
  )
}
