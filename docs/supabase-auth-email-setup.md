# Supabase auth email setup (SMTP, redirect allowlist, branded templates)

Fixes the July 2026 incident where password-reset emails went out via Supabase's
built-in mailer: spam-filtered, unbranded, and the link landed on the homepage.
See `AGENTS.md` § "Human-facing communications (hard rules)".

All three steps are in the Supabase dashboard for this project. Do them in order,
then run the verification checklist at the bottom before telling anyone to reset.

---

## 1. Custom SMTP via Brevo

Supabase's built-in mailer is rate-limited to a few emails/hour and lands in spam.
We already have a Brevo account (it sends waitlist/marketing mail).

**In Brevo** (app.brevo.com):
1. Settings → **SMTP & API** → **SMTP** tab → generate an SMTP key if none exists.
   (This is *not* the same as the API key in `BREVO_API_KEY`.)
2. Note the login shown on that page (your Brevo account email) and the key.
3. Settings → **Senders, Domains & Dedicated IPs**: confirm `localeffortfood.com`
   is an authenticated domain (DKIM/SPF green). If not, complete domain
   authentication first — this is most of the spam-folder fix.
4. Confirm the sender address you'll use (recommended: `yum@localeffortfood.com`,
   name "Local Effort") is a validated sender.

**In Supabase** (supabase.com/dashboard → project):
1. Project Settings → **Authentication** → **SMTP Settings** → enable
   **Custom SMTP**:
   - Host: `smtp-relay.brevo.com`
   - Port: `587`
   - Username: your Brevo account email
   - Password: the Brevo **SMTP key**
   - Sender email: `yum@localeffortfood.com`
   - Sender name: `Local Effort`
2. Authentication → **Rate Limits**: with custom SMTP enabled you can raise the
   email rate limit — set it to at least 30/hour so resets never queue behind
   the old 2–4/hour cap.

## 2. Redirect URL allowlist

Supabase silently rewrites any `redirectTo` that isn't allowlisted to the Site
URL — this is exactly how reset links dumped people on the homepage.

Authentication → **URL Configuration**:
- **Site URL**: `https://www.localeffortfood.com`
- **Redirect URLs** — add all of:
  - `https://www.localeffortfood.com/hub`
  - `https://localeffortfood.com/hub`
  - `http://localhost:5173/hub` (local dev)

## 3. Branded reset-password template

Authentication → **Email Templates** → **Reset Password**.

**Subject:**

```
Set your Local Effort Hub password
```

**Message body (HTML):**

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1E3D8;padding:32px 16px;">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#FFFFFF;border:1px solid #3A2E3F;padding:32px;font-family:Georgia,'Times New Roman',serif;color:#3A2E3F;">
        <tr>
          <td>
            <p style="margin:0 0 4px;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Local Effort</p>
            <h1 style="margin:0 0 20px;font-size:22px;font-weight:normal;">Set your Hub password</h1>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
              Hi — this is Local Effort, your personal chef team in the Twin Cities.
              You're receiving this because a password reset was requested for your
              account ({{ .Email }}) on our Hub, where you can see your weekly meal
              plan and leave us notes.
            </p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
              Click the button below to choose a new password. It takes about a minute,
              and afterward you'll land right in your Hub.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="background-color:#7A846E;">
                  <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 28px;font-size:15px;color:#F1E3D8;text-decoration:none;">Choose a new password</a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#6b5f70;">
              This link expires after one hour. If it has expired, go to
              <a href="https://www.localeffortfood.com/hub" style="color:#3A2E3F;">localeffortfood.com/hub</a>
              and choose &ldquo;Forgot your password?&rdquo; to get a fresh one.
            </p>
            <p style="margin:0;font-size:13px;line-height:1.6;color:#6b5f70;">
              Didn't request this, or stuck? Just reply to this email or write
              <a href="mailto:yum@localeffortfood.com" style="color:#3A2E3F;">yum@localeffortfood.com</a>
              and a human will sort it out.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

## Verification checklist (mandatory before any real send)

Per `AGENTS.md`, the recipient's inbox is production. After completing 1–3:

1. Go to `https://www.localeffortfood.com/hub` → "Forgot your password?" → enter
   `dataweston@gmail.com`.
2. Open the email **in Gmail** — confirm it arrived in the inbox (not spam),
   sender shows "Local Effort", and the copy reads correctly.
3. Click the button. Confirm you land on **/hub** and see the
   "Choose a new password" screen (not the homepage).
4. Set a password, confirm you land in the Hub signed in.
5. Only after all four pass: contact real staff/customers, each with a personal
   note for context — never the bare system email alone.

Code-side guard (shipped July 2026): `src/lib/supabaseClient.js` forwards any
recovery link that lands off `/hub` to `/hub` with the token intact, before the
Supabase client can consume it.
