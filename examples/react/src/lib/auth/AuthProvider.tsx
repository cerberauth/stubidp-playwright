import { useEffect, useState, type ReactNode } from 'react'
import {
  allowInsecureRequests,
  discoveryRequest,
  processDiscoveryResponse,
  type Client,
} from 'oauth4webapi'
import { AuthContext, type AuthContextType } from './context.js'

interface AuthProviderProps {
  issuer: string
  clientId: string
  // stubidp's CLI always assigns a client secret (there's no way to register a
  // true public client yet), so this demo authenticates with client_secret_post
  // instead of the `none` method a real browser-only SPA should use.
  clientSecret: string
  children: ReactNode
}

export function AuthProvider({ children, issuer, clientId, clientSecret }: AuthProviderProps) {
  const client: Client = {
    client_id: clientId,
    token_endpoint_auth_method: 'client_secret_post',
    redirect_uris: [window.location.origin],
  }

  const [as, setAs] = useState<AuthContextType['as']>()
  const [accessToken, setAccessToken] = useState<AuthContextType['accessToken']>()
  const [idToken, setIdToken] = useState<AuthContextType['idToken']>()
  const [user, setUser] = useState<AuthContextType['user']>()

  useEffect(() => {
    if (!issuer || as) {
      return
    }

    const issuerUrl = new URL(issuer)
    const insecureOpts = issuerUrl.protocol === 'http:' ? { [allowInsecureRequests]: true } : {}
    discoveryRequest(issuerUrl, { algorithm: 'oidc', ...insecureOpts })
      .then((response) => processDiscoveryResponse(issuerUrl, response))
      .then(setAs)
      .catch((error: unknown) => {
        console.error('Failed to fetch issuer metadata', error)
      })
  }, [issuer, as])

  return (
    <AuthContext.Provider
      value={{
        as,
        client,
        clientSecret,
        accessToken,
        setAccessToken,
        idToken,
        setIdToken,
        user,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
