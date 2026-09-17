// Throwaway diagnostic: why does gmail.cjs search 401 "Login Required" while
// gmail.cjs status reports a healthy grant? Delete after use.
require('dotenv').config();

async function main() {
  const gal = require.resolve('google-auth-library');
  let nested = null;
  try {
    nested = require.resolve('google-auth-library', { paths: [require.resolve('@googleapis/gmail')] });
  } catch (err) {
    nested = `unresolved: ${err.message}`;
  }
  console.log('google-auth-library (top):', gal);
  console.log('google-auth-library (via @googleapis/gmail):', nested);
  console.log('same copy:', gal === nested);

  const { getAuthorizedGoogleOAuthClient } = require('./backend/api/brain/gmailSync');
  const oauth = await getAuthorizedGoogleOAuthClient();
  const creds = oauth.credentials || {};
  console.log('creds.access_token present:', Boolean(creds.access_token));
  console.log('creds.refresh_token present:', Boolean(creds.refresh_token));
  console.log('creds.expiry_date:', creds.expiry_date ? new Date(creds.expiry_date).toISOString() : null);
  console.log('creds.scope:', creds.scope || creds.scopes || '(none recorded)');

  const { OAuth2Client } = require('google-auth-library');
  console.log('oauth instanceof top-level OAuth2Client:', oauth instanceof OAuth2Client);

  const { gmail: createGmailClient } = require('@googleapis/gmail');
  const client = createGmailClient({ version: 'v1', auth: oauth });
  try {
    const res = await client.users.messages.list({ userId: 'me', q: 'after:2026/09/05', maxResults: 2 });
    console.log('LIST OK via injected auth:', (res.data.messages || []).length, 'message(s)');
  } catch (err) {
    console.log('LIST FAILED via injected auth:', err.code, err.message);
  }

  // Control: pass the token explicitly as a bearer header instead of relying on
  // the auth client plumbing. If this succeeds, the grant is fine and the
  // failure is in how googleapis binds the auth client.
  const { token } = await oauth.getAccessToken();
  console.log('getAccessToken returned token:', Boolean(token));
  const direct = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=2&q=after%3A2026%2F09%2F05',
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const body = await direct.json();
  console.log('DIRECT REST status:', direct.status);
  console.log('DIRECT REST body:', JSON.stringify(body).slice(0, 400));
}

main().catch((err) => {
  console.error('PROBE ERROR:', err.message);
  process.exitCode = 1;
});
