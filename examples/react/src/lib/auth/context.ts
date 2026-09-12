import { createContext } from 'react'
import type { AuthorizationServer, Client, UserInfoResponse } from 'oauth4webapi'

export interface AuthContextType {
  accessToken?: string
  setAccessToken: (accessToken?: string) => void
  idToken?: string
  setIdToken: (idToken?: string) => void
  user?: UserInfoResponse
  setUser: (user?: UserInfoResponse) => void
  client?: Client
  clientSecret?: string
  as?: AuthorizationServer
}

export const AuthContext = createContext<AuthContextType>({
  setAccessToken: () => {},
  setIdToken: () => {},
  setUser: () => {},
})
