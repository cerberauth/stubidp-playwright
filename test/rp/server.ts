import { createHash, randomBytes } from 'node:crypto'
import express from 'express'

const PORT = parseInt(process.env['RP_PORT'] ?? '3100', 10)
const ISSUER = process.env['STUBIDP_ISSUER'] ?? 'http://localhost:8484'
const CLIENT_ID = process.env['CLIENT_ID'] ?? 'e2e'
const CLIENT_SECRET = process.env['CLIENT_SECRET'] ?? 'e2esecret'
const REDIRECT_URI = `http://localhost:${PORT}/callback`

const app = express()
app.use(express.urlencoded({ extended: false }))

// In-memory state store (pkce verifiers keyed by state)
const pending = new Map<string, string>()

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

app.get('/', (_req, res) => {
  res.send(`
    <html><body>
      <h1>Test RP</h1>
      <a id="sign-in" href="/start">Sign In</a>
      <a id="logout" href="/logout">Logout</a>
    </body></html>
  `)
})

app.get('/start', async (_req, res) => {
  const verifier = base64url(randomBytes(32))
  const challenge = base64url(Buffer.from(createHash('sha256').update(verifier).digest()))
  const state = base64url(randomBytes(16))
  pending.set(state, verifier)

  // Fetch discovery to get auth endpoint
  const discovery = await fetch(`${ISSUER}/.well-known/openid-configuration`).then(
    (r) => r.json() as Promise<{ authorization_endpoint: string }>,
  )

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'openid profile email',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })

  res.redirect(`${discovery.authorization_endpoint}?${params}`)
})

app.get('/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query as Record<string, string>

  if (error) {
    res.send(`
      <html><body>
        <h1>Error</h1>
        <p id="error">${error}</p>
        <p id="error-description">${error_description ?? ''}</p>
      </body></html>
    `)
    return
  }

  const verifier = pending.get(state)
  if (!verifier) {
    res.status(400).send('Unknown state')
    return
  }
  pending.delete(state)

  const discovery = await fetch(`${ISSUER}/.well-known/openid-configuration`).then(
    (r) => r.json() as Promise<{ token_endpoint: string }>,
  )

  const tokenRes = await fetch(discovery.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code_verifier: verifier,
    }),
  })

  const tokens = (await tokenRes.json()) as { id_token?: string; error?: string }
  if (tokens.error) {
    res.status(400).send(`Token error: ${tokens.error}`)
    return
  }

  // Decode JWT payload (no verification needed for test RP)
  const payload = JSON.parse(
    Buffer.from((tokens.id_token ?? '').split('.')[1] ?? '', 'base64url').toString(),
  ) as Record<string, unknown>

  res.send(`
    <html><body>
      <h1>Welcome</h1>
      <pre id="claims">${JSON.stringify(payload, null, 2)}</pre>
    </body></html>
  `)
})

app.get('/logout', async (_req, res) => {
  const discovery = await fetch(`${ISSUER}/.well-known/openid-configuration`).then(
    (r) => r.json() as Promise<{ end_session_endpoint?: string }>,
  )

  if (discovery.end_session_endpoint) {
    const params = new URLSearchParams({
      post_logout_redirect_uri: `http://localhost:${PORT}/`,
      client_id: CLIENT_ID,
    })
    res.redirect(`${discovery.end_session_endpoint}?${params}`)
  } else {
    res.redirect('/')
  }
})

app.listen(PORT, () => {
  console.log(`Test RP listening on http://localhost:${PORT}`)
})
