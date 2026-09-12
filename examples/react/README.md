# React example

A minimal Vite + React single-page app that signs in through a local [stubidp](https://github.com/cerberauth/stubidp)
instance using the Authorization Code flow with PKCE via [`oauth4webapi`](https://github.com/panva/oauth4webapi)
(the same pattern used in [cerberauth/openid-connect-examples](https://github.com/cerberauth/openid-connect-examples/tree/main/examples/react-spa)),
and a Playwright e2e suite that drives it with `@cerberauth/stubidp-playwright`.

This demonstrates the package against a real SPA, distinct from the internal test fixtures in `../../test`.

The client secret is embedded in the built bundle (see `src/lib/auth/AuthProvider.tsx`) — that's only
acceptable because this points at a throwaway local stub for testing. A real SPA should register as a
public client (`token_endpoint_auth_method: none`) instead, but stubidp's CLI doesn't yet support
issuing one (`--public-client` is currently a no-op).

## Layout

- `src/lib/auth/` — the OIDC client: `AuthProvider` runs discovery on mount, `useAuth` implements
  `login`/`logout` and handles the authorization code redirect (PKCE + nonce validation, userinfo
  request) via `oauth4webapi`.
- `src/App.tsx` — a "Sign In" button and a screen rendering the returned user info.
- `e2e/` — Playwright config and specs. `e2e/playwright.config.ts` starts a `stubidp` instance and
  the built app (`vite preview`) before running the tests.

## Run it

This is a standalone project that depends on the published `@cerberauth/stubidp-playwright` package,
the same way any consumer would. From this directory:

```sh
npm install
npm run test:e2e:install
npm run test:e2e
```

To poke at the app manually:

```sh
npm run dev
```

and start a stubidp instance separately, e.g.:

```sh
npx stubidp --client-id e2e-spa --client-secret e2e-spa-secret \
  --redirect-uri http://localhost:5173 \
  --post-logout-redirect-uri http://localhost:5173
```
