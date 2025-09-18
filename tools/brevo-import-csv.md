# CSV → Brevo Importer

Run a one-off import of contacts from a CSV file into Brevo (formerly Sendinblue).

Usage

- Set `BREVO_API_KEY` in your environment. Optional: `BREVO_LIST_ID`.
- Run: `npm run brevo:import -- path/to.csv --list 12`.
- Flags:
  - `--list <id>`: Add contacts to Brevo list ID
  - `--dry`: Dry-run; prints what would be upserted
  - `--delimiter ","|";"`: CSV delimiter override

Column mapping

- email: required
- firstName/firstname/first_name
- lastName/lastname/last_name
- phone/sms/mobile
- Any other columns become Brevo `attributes` (strings). FIRSTNAME/LASTNAME are also set when present.

Examples

- Dry run: `npm run brevo:import -- ./contacts.csv --dry`
- With list: `npm run brevo:import -- ./contacts.csv --list 7`

Notes

- Uses simple fetch calls to Brevo v3 API with `updateEnabled=true`.
- If contact exists, falls back to PUT update.
- Exits non-zero if any rows fail.
 - Requires Node 18+ for global `fetch`. On older Node, install `node-fetch` locally and re-run.
