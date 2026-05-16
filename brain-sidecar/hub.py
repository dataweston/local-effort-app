"""
Hub utility for posting bot messages to ObjectThread from Python sidecar.
Writes directly to Postgres using the same db module as other sidecar jobs.
"""

import uuid
from db import query, execute


def post_bot_message(object_type: str, object_id: str, visibility: str, title: str, body: str) -> str | None:
    """
    Find-or-create an ObjectThread, then post a bot message.
    Returns the message ID, or None on failure.
    """
    try:
        rows = query(
            'SELECT id FROM "ObjectThread" WHERE "objectType" = %s AND "objectId" = %s AND visibility = %s LIMIT 1',
            (object_type, object_id, visibility),
        )
        if rows:
            thread_id = rows[0]['id']
        else:
            thread_id = str(uuid.uuid4())
            execute(
                '''
                INSERT INTO "ObjectThread" (id, "objectType", "objectId", visibility, title, "createdAt", "updatedAt")
                VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
                ''',
                (thread_id, object_type, object_id, visibility, title),
            )

        msg_id = str(uuid.uuid4())
        execute(
            '''
            INSERT INTO "ObjectThreadMessage" (id, "threadId", "senderId", "senderRole", body, "createdAt")
            VALUES (%s, %s, 'system', 'bot', %s, NOW())
            ''',
            (msg_id, thread_id, body),
        )
        execute('UPDATE "ObjectThread" SET "updatedAt" = NOW() WHERE id = %s', (thread_id,))
        return msg_id
    except Exception as e:
        print(f'[hub] post_bot_message failed: {e}')
        return None


def find_space_id(space_key: str) -> str | None:
    rows = query('SELECT id FROM "HubSpace" WHERE key = %s LIMIT 1', (space_key,))
    return rows[0]['id'] if rows else None


def post_to_space(space_key: str, visibility: str, title: str, body: str) -> str | None:
    space_id = find_space_id(space_key)
    if not space_id:
        return None
    return post_bot_message('hub_space', space_id, visibility, title, body)
