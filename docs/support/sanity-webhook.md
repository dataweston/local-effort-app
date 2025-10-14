# Sanity → ISR Webhook Setup

This wires Sanity updates to trigger page revalidation (ISR) for each sale page.

## Prereqs
- The Next app is deployed and exposes `/api/revalidate`.
- You know the secret used by the Next app: `SALE_REVALIDATE_SECRET`.

## Production target
- Revalidate URL (base): `https://<your-next-deployment>/api/revalidate`
- Full URL with slug and secret (Sanity can template the slug):
  `https://<your-next-deployment>/api/revalidate?sale={slug.current}&secret=<your-secret>`

Recommended: store this URL in your deployment platform as `SALE_REVALIDATE_URL` (without the slug query). Your Square webhook and utilities can reuse it.

## Configure in Sanity Studio
1) Open Sanity manage → API → Webhooks → Create webhook
2) Name: `Sale ISR Revalidate`
3) URL: `https://<your-next-deployment>/api/revalidate?sale={slug.current}&secret=<your-secret>`
4) Method: `POST`
5) Filters:
   - Document type: `sale`
   - Also trigger when referenced `product` or `saleProduct` objects change for a given sale
6) Save.

Tip: You can add a second (optional) webhook for preloading sale slug lists using tag `sale:slugs` if you rely on cached slug queries. For most setups, the per-sale revalidate is sufficient.

## Local testing
If you need to test locally without the Next dev server, you can run the smoke test with a built-in revalidate server:

```bash
# from repo root
SALE_REVALIDATE_URL="http://127.0.0.1:3031/api/revalidate" \
SALE_REVALIDATE_SECRET="devsecret" \
npm run sale:smoke:webhook -- --with-revalidate-server --revalidate-port=3031 test-sale
```

This confirms your Square → Supabase → Revalidate flow works; Sanity webhook behaves the same.

## Verify in production
- Change a non-critical field on a sale (e.g., tagline) and publish.
- Check your Next logs for a 200 on `/api/revalidate`.
- Refresh the sale page and confirm the change is reflected after revalidation.

## Troubleshooting
- 401 from `/api/revalidate`: secret mismatch. Ensure `SALE_REVALIDATE_SECRET` matches in both Next and Sanity webhook URL.
- No update visible: ensure your page fetches use tag-based caching `sale:${slug}` (already implemented) and the correct slug is passed to the webhook.
- Wrong endpoint: ensure you are hitting the Next deployment (not the main Vite site). The revalidate endpoint lives in the Next app.
