# Drafts iPhone One-Tap Upload (Weekly Order)

This guide creates a one-tap Drafts action that sends menu notes to the weekly-order ingest endpoint.

## 1) Create the Drafts Action
1. Open Drafts on iPhone.
2. Go to Actions > New Action.
3. Name it: "Upload Weekly Menu".
4. Add a single action step: **Script** (or **Advanced: URL** if you prefer).

## 2) URL + Headers
**Method:** `POST`  
**URL:** `https://YOUR_DOMAIN/api/recipes/ingest`

Headers:
- `Content-Type: application/json`
- `Authorization: Bearer YOUR_INGEST_SECRET`

Where `YOUR_INGEST_SECRET` must match `RECIPES_INGEST_SECRET` (or `WEEKLY_ORDER_INGEST_SECRET`) on the server.

## 3) Body (JSON)
Use this JSON body template. Drafts placeholders are included:

```json
{
  "source": "drafts",
  "externalKey": "drafts:[[uuid]]",
  "text": "[[draft]]",
  "createdAt": "[[created]]",
  "metadata": {
    "title": "[[title]]",
    "tags": "[[tags]]",
    "device": "iPhone"
  }
}
```

Notes:
- `externalKey` makes uploads idempotent (re-sending the same Draft won't duplicate).
- `text` is the full draft content.
- `metadata` is optional but helpful for debugging.

## 4) Optional: Script Action (Recommended)
If you use a Script step instead of URL, paste this:

```javascript
const endpoint = "https://YOUR_DOMAIN/api/recipes/ingest";
const token = "YOUR_INGEST_SECRET";

const payload = {
  source: "drafts",
  externalKey: `drafts:${draft.uuid}`,
  text: draft.content,
  createdAt: draft.createdAt,
  metadata: {
    title: draft.title,
    tags: draft.tags,
    device: "iPhone"
  }
};

const req = new XMLHttpRequest();
req.open("POST", endpoint);
req.setRequestHeader("Content-Type", "application/json");
req.setRequestHeader("Authorization", `Bearer ${token}`);
req.send(JSON.stringify(payload));
```

## 5) One-Tap from Share Sheet (optional)
In Drafts Action settings:
- Enable "Share Sheet"
- Assign a shortcut name

This lets you share text directly into Drafts and send it with one tap.

## 6) Verify on the Admin UI
Go to:
- `/admin/weekly-order`
- Check **Ingest Inbox** and **Dish Drafts**

If nothing appears, confirm:
- Correct domain URL
- Matching ingest secret
- Server logs show `/api/recipes/ingest` requests
