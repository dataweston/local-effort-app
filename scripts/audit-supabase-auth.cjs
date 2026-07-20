require('dotenv').config();

async function main() {
  const baseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!baseUrl || !anonKey) throw new Error('Public Supabase URL/anon key are not configured');

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/auth/v1/settings`, {
    headers: { apikey: anonKey },
  });
  if (!response.ok) throw new Error(`Supabase auth settings request failed (${response.status})`);
  const settings = await response.json();
  console.log(JSON.stringify({
    source: 'supabase_auth_settings',
    googleEnabled: Boolean(settings.external?.google),
    emailEnabled: Boolean(settings.external?.email),
    phoneEnabled: Boolean(settings.external?.phone),
    signupsDisabled: Boolean(settings.disable_signup),
    note: 'Redirect URL allowlists are not exposed by this public settings endpoint and must be verified in the Supabase dashboard.',
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
