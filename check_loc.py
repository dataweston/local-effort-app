from pathlib import Path
text = Path('cookbook/repo/harvest/loc_search.py').read_text()
assert 'import os' in text
assert 'LOC_API_KEY' in text
