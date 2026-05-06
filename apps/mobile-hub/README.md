# Local Effort Hub

Expo shell for the native mobile hub MVP.

## Current Scope

- Static fixtures matching `@local-effort/shared` hub contracts.
- Today, Calendar, Spaces, Threads, Capture, and Profile surfaces in one native shell.
- API client stub for the migrated `/api/hub/*` backend.

## Run

Install workspace dependencies, then:

```bash
pnpm --filter @local-effort/mobile-hub start
```

Set `EXPO_PUBLIC_HUB_API_BASE_URL` when testing against a deployed or local backend.
Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` to enable native auth.

## Next Wiring Step

The app now creates a persisted Supabase session in `src/auth/useHubAuth.ts` and passes the access token into `createHubClient` when a hub API base URL is configured.
