# Archived: Cookbook Next.js App

Status: Archived on 2025-09-21

This Next.js app (under `cookbook/repo/web`) is not used in production on `localeffortfood.com`.

Current production URLs are served by the main React SPA:
- `/cookbook` → `src/pages/CookbookSearchPage.jsx`
- `/recipes/:id` → `src/pages/CookbookRecipePage.jsx`

Why archived
- We now keep a single source of truth for cookbook UI in the SPA to reduce confusion.
- No Vercel routes point to this Next.js app in this repository.

If you need this UI again
- Option A (recommended): deploy this Next.js app as a separate project/subdomain (e.g., `cookbook.localeffortfood.com`).
- Option B: unarchive and explicitly wire rewrites to this app, replacing the SPA routes.

Until then, do not develop against this folder. See the SPA pages listed above for active development.
