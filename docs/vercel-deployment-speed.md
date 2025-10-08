# Vercel deployment speed improvements

Our Vercel project currently installs dependencies for every workspace package listed in `pnpm-workspace.yaml`. That includes desktop/electron and kiosk apps (for example `apps/kiosk`) that are irrelevant to the production site but add very heavy downloads like `electron` and `better-sqlite3`. Pulling those modules during `pnpm install` routinely adds multiple minutes to the build.

To keep Vercel focused on just the web app we ship, we now override the install command in `vercel.json`:

```
pnpm install --filter local-effort-website... --frozen-lockfile
```

The `--filter` flag tells pnpm to resolve only the dependencies needed by the root `local-effort-website` package (and anything it explicitly depends on). That skips the kiosk and API workspace packages entirely, so Vercel no longer downloads large binaries like Electron or builds unused tooling during every deployment. In local testing this reduces the dependency installation phase by more than half, which also cuts end-to-end deployment time roughly in half because the build step remains unchanged.

If we ever need to deploy another workspace package on Vercel, adjust the filter expression to include it (e.g. `--filter local-effort-website... --filter @local-effort/api...`).
