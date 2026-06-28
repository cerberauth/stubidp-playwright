/**
 * Assert that a stubidp instance is reachable at the given issuer URL.
 * Checks the OIDC discovery endpoint. Throws if not reachable.
 */
export async function assertStubidpReachable(
  issuer: string,
  { timeout = 5_000 }: { timeout?: number } = {},
): Promise<void> {
  const url = `${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) {
      throw new Error(
        `@cerberauth/stubidp-playwright: stubidp discovery returned HTTP ${res.status} at ${url}`,
      )
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(
        `@cerberauth/stubidp-playwright: stubidp not reachable at ${url} within ${timeout}ms`,
      )
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}
