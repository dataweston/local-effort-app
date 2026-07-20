# Hub authentication flow

## User experience

1. `/hub` presents **Continue with Google** as the primary and default action.
2. Hub stores the complete internal destination, including an invite token.
3. Supabase returns to that Hub URL; the auth provider establishes the session,
   removes callback credentials from the address bar, and restores the saved
   destination if Supabase landed on the site root.
4. Existing profiles enter Hub immediately.
5. A matching invited Google account sees one profile-completion form and then
   enters Hub. No password creation is required.
6. An authenticated account with neither a profile nor a valid invite sees a
   clear access-not-found screen with a sign-out/account-switch action.
7. Existing email/password users can reveal the secondary password form.

## Compatibility behavior

Already-issued `recovery`, `magiclink`, and `invite` hash callbacks that land
outside `/hub` are forwarded to `/hub` before Supabase consumes the token. A
successful legacy recovery password update performs a clean reload of `/hub`.

The Hub UI does not send new Supabase auth emails. This is intentional: outbound
auth email remains banned until Supabase relays through verified Brevo SMTP with
the branded template and the exact received-link path passes testing.

## Dashboard prerequisites

- Supabase Google provider enabled with the production Google OAuth credentials.
- Site URL set to `https://www.localeffortfood.com`.
- Redirect allowlist includes both apex and `www` Hub URLs plus local development:
  - `https://www.localeffortfood.com/hub`
  - `https://www.localeffortfood.com/hub/**`
  - `https://localeffortfood.com/hub`
  - `https://localeffortfood.com/hub/**`
  - `http://localhost:5173/hub`
  - `http://localhost:5173/hub/**`

The public settings audit is `node scripts/audit-supabase-auth.cjs`. It confirms
whether Google is enabled but cannot inspect the private redirect allowlist.
