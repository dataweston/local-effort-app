# Element Server Suite Setup

This folder keeps the Element Server Suite deployment shape next to the Local Effort app. The server itself should run on Kubernetes through Element's `ess-helm` chart; this repo owns the values, DNS/TLS assumptions, and the integration contract for the Hub/community tool.

## Deployment Decision

Use one repo for now.

Reasons:

- The current app already owns Supabase auth, customers, weekly-order data, Hub spaces, object threads, planner cards, and brain inbox workflows.
- Element is infrastructure for realtime rooms, calling, notifications, and Matrix clients. The Local Effort app remains the domain portal.
- Keeping values and integration docs here lets app changes and server-side room semantics evolve together.

Split to a second repo only when Kubernetes operations need separate access control, CI, secrets rotation, or release cadence.

## Domains

Pick a permanent Matrix server name before first production launch. Matrix user IDs and room aliases embed this name.

Suggested production shape:

| Purpose | Host |
| --- | --- |
| Matrix server name | `community.localeffortfood.com` |
| Matrix Client-Server API | `matrix.community.localeffortfood.com` |
| Element Web | `chat.community.localeffortfood.com` |
| Account/auth UI | `account.community.localeffortfood.com` |
| Admin UI | `admin.community.localeffortfood.com` |
| Matrix RTC backend | `mrtc.community.localeffortfood.com` |

The example values use placeholders. Copy them to a non-committed environment file before applying real hostnames or secrets.

## Prerequisites

- A Kubernetes cluster with an ingress controller.
- `kubectl`, `helm`, and access to the target cluster.
- DNS records for every host above pointing at the ingress/load balancer.
- Persistent volumes for Synapse/Postgres/media.
- A TLS plan. The example assumes cert-manager with Let's Encrypt.
- A secrets plan. Do not commit generated Matrix registration secrets, signing keys, SMTP passwords, TURN secrets, or admin passwords.

## First Install

The upstream quick setup installs the chart from the GitHub Container Registry OCI chart path. As of May 27, 2026, the latest GitHub release is `26.5.1`; pin that version until you intentionally upgrade.

Create the namespace:

```powershell
kubectl create namespace ess
```

Install with the repo-owned values:

```powershell
helm upgrade --install ess oci://ghcr.io/element-hq/ess-helm/matrix-stack `
  --namespace ess `
  --version 26.5.1 `
  --values infra/element-ess/values/hostnames.example.yaml `
  --values infra/element-ess/values/tls-letsencrypt.example.yaml `
  --wait
```

For production, copy the example files to an ignored local/deployment location, fill in real values, and pin the chart version in your deployment pipeline.

## Post-Install Checks

```powershell
kubectl get pods -n ess
kubectl get ingress -n ess
kubectl get certificates -n ess
kubectl exec -n ess -it deploy/ess-matrix-authentication-service -- mas-cli manage register-user
```

Then verify:

- `https://matrix.community.localeffortfood.com/_matrix/client/versions`
- `https://chat.community.localeffortfood.com`
- `https://community.localeffortfood.com/.well-known/matrix/client`
- `https://community.localeffortfood.com/.well-known/matrix/server`

## App Integration Targets

Initial integration should be server-side only:

- Add a Matrix application-service or bot token outside the browser.
- Map Hub spaces to Matrix spaces/rooms.
- Mirror selected Hub thread messages into Matrix rooms.
- Write inbound Matrix events into `ObjectThreadMessage` and optionally `HubCapture` / brain inbox.
- Keep Supabase auth as the app identity source until OIDC/SSO is intentionally configured.

Do not expose Matrix admin tokens, app-service tokens, or Synapse registration secrets to Vite client code.
