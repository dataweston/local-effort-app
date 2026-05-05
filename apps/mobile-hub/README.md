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

## Next Wiring Step

Use a Supabase access token from native auth and pass it into `createHubClient` in `src/api/hubClient.ts`.
