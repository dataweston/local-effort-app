Cookbook API on Vercel

What the frontend calls
- GET `/api/search?q=...`
- GET `/api/recipes/:id`

How it works in prod
- The app prefers same-origin in the browser. We added a server proxy in `backend/api/server.js` that forwards these routes to your external Cookbook API.

Required Vercel environment variables
- `COOKBOOK_API_BASE` (Server): The external Cookbook API origin, for example `https://cookbook-api.example.com`.
  - No trailing slash.
  - Must not be your site domain (e.g., not `https://localeffortfood.com`) to avoid proxy loops.
- Optional (Client): `VITE_COOKBOOK_API_URL` if you want client-only access in non-prod builds. With the proxy, this is not required in production.

Set envs in Vercel (UI)
1) Vercel → Project → Settings → Environment Variables
2) Add `COOKBOOK_API_BASE` = `https://cookbook-api.example.com`
3) Redeploy the project (or push a commit).

Test after deploy
Replace with your domain and a real recipe id:

```
curl -i "https://localeffortfood.com/api/search?q=pancakes"
curl -i "https://localeffortfood.com/api/recipes/your-recipe-id"
```

Notes
- The proxy preserves upstream status codes and returns JSON errors like `{ error: "upstream-error" }`.
- If you see a loop or HTML instead of JSON, confirm that `COOKBOOK_API_BASE` points to the external API, not your site.
