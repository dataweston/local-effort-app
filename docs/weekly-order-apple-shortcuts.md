# Apple Shortcuts: Weekly Menu Upload

An alternative to the Drafts app — uses the built-in Shortcuts app (no third-party purchase required).

## Quick Start

Create a Shortcut with these steps in order:

1. **Ask for Input** (text prompt for the menu)
2. **Build JSON dictionary**
3. **POST to the ingest endpoint**
4. **Parse the response and show a notification**

---

## Step-by-Step

### 1) Ask for Input
- Action: **Ask for Input**
- Input Type: **Text**
- Prompt: `Paste or type this week's menu`
- Save output to variable: `menuText`

Alternatively, use **Get Clipboard** if you always copy the menu first.

### 2) Build the JSON Body
- Action: **Dictionary**
- Keys:
  - `source` → Text: `shortcut`
  - `externalKey` → Text: `shortcut:` + **Current Date** (ISO 8601 format)
  - `text` → Variable: `menuText`
  - `metadata` → Dictionary:
    - `device` → Text: `iPhone`
    - `source` → Text: `apple-shortcut`

Save to variable: `payload`

### 3) Send the Request
- Action: **Get Contents of URL**
- URL: `https://YOUR_DOMAIN/api/recipes/ingest`
- Method: **POST**
- Headers:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer YOUR_INGEST_SECRET`
- Request Body: **JSON** → Variable: `payload`

Save output to variable: `response`

Replace `YOUR_DOMAIN` and `YOUR_INGEST_SECRET` with your actual values. The secret must match the `RECIPES_INGEST_SECRET` (or `WEEKLY_ORDER_INGEST_SECRET`) environment variable on the server.

### 4) Parse the Response
- Action: **Get Value for Key** → Key: `ok` from `response`
- Action: **Get Value for Key** → Key: `draftCount` from `response`
- Action: **Get Value for Key** → Key: `warnings` from `response`

### 5) Show Result
- Action: **If** → `ok` equals `true`
  - Action: **Show Notification**
    - Title: `Menu uploaded`
    - Body: `draftCount` + ` dishes parsed`
  - **If** → `warnings` has any value
    - Action: **Show Alert** → `Warnings: ` + `warnings`
- **Otherwise**
  - Action: **Get Value for Key** → Key: `error` from `response`
  - Action: **Show Alert** → `Upload failed: ` + `error`

### 6) Error Handling (Optional)
Wrap steps 3-5 in a **Try/Catch** block:
- On error: **Show Alert** → `Network error: ` + **Shortcut Error**

---

## Adding to Home Screen

1. Open the Shortcut in the Shortcuts app
2. Tap the **...** menu → **Add to Home Screen**
3. Choose an icon and name (e.g., "Upload Menu")
4. Tap **Add**

One tap from the home screen launches the shortcut directly.

---

## Siri Integration

After creating the Shortcut, you can trigger it by voice:
- Say: "Hey Siri, Upload Menu" (matches the Shortcut name)
- Siri will prompt for the text input

---

## Response Shape

The `/api/recipes/ingest` endpoint returns:

```json
{
  "ok": true,
  "ingestId": "uuid",
  "draftCount": 5,
  "warnings": [],
  "reused": false
}
```

- `ok` — whether the ingest succeeded
- `draftCount` — number of dishes parsed from the text
- `warnings` — any parsing warnings (e.g., "No dishes parsed from payload")
- `reused` — `true` if the same `externalKey` was already ingested (idempotent)

---

## Verify

After running the Shortcut, check the admin UI:
- Go to `/admin/weekly-order`
- Check **Ingest Inbox** for the new submission
- Check **Dish Drafts** for parsed dishes
