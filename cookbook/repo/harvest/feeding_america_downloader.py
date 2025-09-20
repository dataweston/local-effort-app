"""
Feeding America downloader.

Utilities to fetch and persist documents from Feeding America sources.
"""
from __future__ import annotations
from pathlib import Path
from typing import Optional
import requests


class FeedingAmericaDownloader:
    def __init__(self, base_dir: Path):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def download(self, url: str, filename: Optional[str] = None) -> Path:
        name = filename or url.split("/")[-1]
        target = self.base_dir / name
        with requests.get(url, stream=True, timeout=60) as r:
            r.raise_for_status()
            with open(target, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
        return target
