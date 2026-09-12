// This code is heavily based on the following example: https://github.com/panva/oauth4webapi/blob/HEAD/examples/oidc.ts
// (see also github.com/cerberauth/openid-connect-examples/tree/main/examples/react-spa for the same pattern)

import { useContext, useEffect, useState } from 'react'
import * as oauth from 'oauth4webapi'
import { AuthContext } from './context.js'

const webStorageKey = 'oidc:auth'

interface LoginParams {
  scope?: string
  redirectUri?: string
}

interface StoredAuthState {
  codeVerifier: string
  state: string
  nonce: string
  redirectUri: string
}

interface AuthError {
  error: string
  errorDescription?: string
}

export function useAuth() {
  const { setAccessToken, idToken, setIdToken, setUser, client, clientSecret, user, as } =
    useContext(AuthContext)
  const [isHandlingRedirect, setHandlingRedirect] = useState(false)
  const [error, setError] = useState<AuthError>()

  const login = async (params?: LoginParams) => {
    if (!as || !client) {
      return
    }

    const scope = params?.scope ?? 'openid profile email'
    const redirectUri = params?.redirectUri ?? window.location.origin

    const codeVerifier = oauth.generateRandomCodeVerifier()
    const codeChallenge = await oauth.calculatePKCECodeChallenge(codeVerifier)
    const state = oauth.generateRandomState()
    const nonce = oauth.generateRandomNonce()

    const authorizationUrl = new URL(as.authorization_endpoint!)
    authorizationUrl.searchParams.set('client_id', client.client_id)
    authorizationUrl.searchParams.set('redirect_uri', redirectUri)
    authorizationUrl.searchParams.set('response_type', 'code')
    authorizationUrl.searchParams.set('scope', scope)
    authorizationUrl.searchParams.set('code_challenge', codeChallenge)
    authorizationUrl.searchParams.set('code_challenge_method', 'S256')
    authorizationUrl.searchParams.set('state', state)
    authorizationUrl.searchParams.set('nonce', nonce)

    const stored: StoredAuthState = { codeVerifier, state, nonce, redirectUri }
    sessionStorage.setItem(webStorageKey, JSON.stringify(stored))

    window.location.assign(authorizationUrl.toString())
  }

  const handleLoginRedirect = async () => {
    if (!as || !client || isHandlingRedirect) {
      return
    }
    setHandlingRedirect(true)

    const storage = sessionStorage.getItem(webStorageKey)
    if (!storage) {
      console.error('No stored code_verifier and nonce found')
      setHandlingRedirect(false)
      return
    }
    sessionStorage.removeItem(webStorageKey)
    const { codeVerifier, state, nonce, redirectUri } = JSON.parse(storage) as StoredAuthState

    const currentUrl = new URL(window.location.href)
    let params: URLSearchParams
    try {
      params = oauth.validateAuthResponse(as, client, currentUrl, state)
    } catch (err) {
      if (err instanceof oauth.AuthorizationResponseError) {
        setError({ error: err.error, errorDescription: err.error_description })
      } else {
        console.error('Failed to validate authorization response', err)
      }
      setHandlingRedirect(false)
      window.history.replaceState({}, document.title, redirectUri)
      return
    }

    const insecureOpts =
      new URL(as.issuer).protocol === 'http:' ? { [oauth.allowInsecureRequests]: true } : {}

    const authorizationResponse = await oauth.authorizationCodeGrantRequest(
      as,
      client,
      oauth.ClientSecretPost(clientSecret ?? ''),
      params,
      redirectUri,
      codeVerifier,
      insecureOpts,
    )

    const authorizationCodeResult = await oauth.processAuthorizationCodeResponse(
      as,
      client,
      authorizationResponse,
      {
        expectedNonce: nonce,
        requireIdToken: true,
      },
    )

    const accessToken = authorizationCodeResult.access_token
    setAccessToken(accessToken)
    setIdToken(authorizationCodeResult.id_token)
    // Guaranteed by requireIdToken: true above.
    const claims = oauth.getValidatedIdTokenClaims(authorizationCodeResult)!

    const response = await oauth.userInfoRequest(as, client, accessToken, insecureOpts)
    const userInfo = await oauth.processUserInfoResponse(as, client, claims.sub, response)
    setUser(userInfo)

    setHandlingRedirect(false)
    window.history.replaceState({}, document.title, redirectUri)
  }

  const logout = () => {
    if (!as?.end_session_endpoint || !idToken) {
      return
    }

    const endSessionUrl = new URL(as.end_session_endpoint)
    endSessionUrl.searchParams.set('post_logout_redirect_uri', window.location.origin)
    endSessionUrl.searchParams.set('id_token_hint', idToken)

    setAccessToken(undefined)
    setIdToken(undefined)
    setUser(undefined)

    window.location.assign(endSessionUrl.toString())
  }

  useEffect(() => {
    if (window.location.search.includes('code=') || window.location.search.includes('error=')) {
      void handleLoginRedirect()
    }
  }, [window.location.search, as, client])

  return {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    error,
  }
}
