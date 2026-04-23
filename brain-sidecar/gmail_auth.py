#!/usr/bin/env python3
"""
One-time Gmail OAuth flow — runs locally, stores tokens in ../.gmail-tokens.json.

Usage:
  python gmail_auth.py

Requires GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in ../.env
Opens a browser for Google consent, catches the callback on localhost:8765,
writes tokens to ../.gmail-tokens.json (same location the Node sync reads from).
"""

import os
import json
import threading
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from pathlib import Path

from dotenv import load_dotenv
from google_auth_oauthlib.flow import Flow

load_dotenv(dotenv_path=Path(__file__).parent.parent / '.env')

CLIENT_ID = os.environ.get('GMAIL_CLIENT_ID', '').strip('"')
CLIENT_SECRET = os.environ.get('GMAIL_CLIENT_SECRET', '').strip('"')
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
REDIRECT_URI = 'http://localhost:8765/callback'
TOKEN_PATH = Path(__file__).parent.parent / '.gmail-tokens.json'

if not CLIENT_ID or not CLIENT_SECRET:
    raise SystemExit('Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET in .env')

client_config = {
    'installed': {
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'auth_uri': 'https://accounts.google.com/o/oauth2/auth',
        'token_uri': 'https://oauth2.googleapis.com/token',
        'redirect_uris': [REDIRECT_URI],
    }
}

flow = Flow.from_client_config(client_config, scopes=SCOPES, redirect_uri=REDIRECT_URI)
auth_url, _ = flow.authorization_url(access_type='offline', prompt='consent')

received_code = None
server_done = threading.Event()


class CallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        global received_code
        parsed = urlparse(self.path)
        if parsed.path == '/callback':
            params = parse_qs(parsed.query)
            if 'code' in params:
                received_code = params['code'][0]
                self.send_response(200)
                self.send_header('Content-Type', 'text/html')
                self.end_headers()
                self.wfile.write(b'<html><body><h2>Gmail authorized.</h2><p>You can close this tab.</p></body></html>')
            else:
                error = params.get('error', ['unknown'])[0]
                self.send_response(400)
                self.send_header('Content-Type', 'text/html')
                self.end_headers()
                self.wfile.write(f'<html><body><h2>OAuth error: {error}</h2></body></html>'.encode())
        else:
            self.send_response(404)
            self.end_headers()
        server_done.set()

    def log_message(self, *args):
        pass  # silence request logs


httpd = HTTPServer(('localhost', 8765), CallbackHandler)
server_thread = threading.Thread(target=httpd.handle_request)
server_thread.daemon = True
server_thread.start()

print(f'Opening browser for Gmail OAuth...')
print(f'If the browser does not open, visit:\n  {auth_url}\n')
webbrowser.open(auth_url)

server_done.wait(timeout=120)
httpd.server_close()

if not received_code:
    raise SystemExit('No auth code received within 2 minutes.')

flow.fetch_token(code=received_code)
creds = flow.credentials

tokens = {
    'token': creds.token,
    'refresh_token': creds.refresh_token,
    'token_uri': creds.token_uri,
    'client_id': creds.client_id,
    'client_secret': creds.client_secret,
    'scopes': list(creds.scopes) if creds.scopes else SCOPES,
}

TOKEN_PATH.write_text(json.dumps(tokens, indent=2))
os.chmod(TOKEN_PATH, 0o600)
print(f'Tokens saved to {TOKEN_PATH}')
print('You can now run: node backend/api/index.js  and  POST /api/brain/gmail/sync')
