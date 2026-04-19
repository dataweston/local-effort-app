#!/usr/bin/env python
"""Convert Claude conversations.json export to one Markdown file per conversation."""

import json
import os
import re
import sys
from datetime import datetime

INPUT = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\user\AppData\Local\Temp\0d345de4-1301-48ec-acbb-f2eb0bb9194a_data-085211f8-7baa-4728-bd52-614f4ad82251-1776497429-2962ec5c-batch-0000.zip.94a\conversations.json"
OUTPUT_DIR = sys.argv[2] if len(sys.argv) > 2 else r"C:\Users\user\Desktop\conversations_md"

def slugify(text, max_len=80):
    text = re.sub(r'[^\w\s-]', '', text.lower().strip())
    text = re.sub(r'[\s_]+', '-', text)
    return text[:max_len].rstrip('-') or "untitled"

def fmt_timestamp(ts):
    try:
        dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
        return dt.strftime('%Y-%m-%d %H:%M UTC')
    except Exception:
        return ts or ""

def main():
    with open(INPUT, 'r', encoding='utf-8') as f:
        conversations = json.load(f)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    seen_slugs = {}
    for conv in conversations:
        name = conv.get("name") or "Untitled"
        created = conv.get("created_at", "")
        date_prefix = created[:10] if created else "undated"
        slug = slugify(name)
        key = f"{date_prefix}_{slug}"

        # deduplicate filenames
        if key in seen_slugs:
            seen_slugs[key] += 1
            key = f"{key}_{seen_slugs[key]}"
        else:
            seen_slugs[key] = 0

        lines = []
        lines.append(f"# {name}\n")
        lines.append(f"**Created:** {fmt_timestamp(created)}  ")
        lines.append(f"**Updated:** {fmt_timestamp(conv.get('updated_at', ''))}\n")

        if conv.get("summary"):
            lines.append(f"> {conv['summary']}\n")

        lines.append("---\n")

        for msg in conv.get("chat_messages", []):
            sender = msg.get("sender", "unknown")
            label = "**Human**" if sender == "human" else "**Assistant**"
            ts = fmt_timestamp(msg.get("created_at", ""))
            lines.append(f"### {label}")
            if ts:
                lines.append(f"*{ts}*\n")

            text = msg.get("text", "")
            lines.append(text)

            # note attachments/files if present
            for att in msg.get("attachments", []):
                att_name = att.get("file_name") or att.get("name") or "attachment"
                lines.append(f"\n📎 *Attachment: {att_name}*")
            for fi in msg.get("files", []):
                fi_name = fi.get("file_name") or fi.get("name") or "file"
                lines.append(f"\n📄 *File: {fi_name}*")

            lines.append("\n---\n")

        filepath = os.path.join(OUTPUT_DIR, f"{key}.md")
        with open(filepath, 'w', encoding='utf-8') as out:
            out.write('\n'.join(lines))

    print(f"Wrote {len(conversations)} conversations to {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
