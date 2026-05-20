import base64
import hashlib
import re
import uuid
from dataclasses import dataclass
from pathlib import Path

from django.conf import settings
from django.utils import timezone


DATA_URL_RE = re.compile(r"^data:(?P<mime>[-\w.]+/[-\w.+]+);base64,(?P<data>.+)$", re.DOTALL)


@dataclass(frozen=True)
class StoredScreenshot:
    relative_path: str
    content_hash: str
    byte_size: int
    mime: str


def store_screenshot_data_url(data_url: str, workspace_id: str, project_id: str) -> StoredScreenshot | None:
    if not data_url:
        return None
    match = DATA_URL_RE.match(data_url)
    if not match:
        return None
    raw = base64.b64decode(match.group("data"), validate=True)
    if len(raw) > settings.MAX_SCREENSHOT_BYTES:
        raise ValueError("screenshot is too large")
    mime = match.group("mime")
    suffix = _suffix_for_mime(mime)
    digest = hashlib.sha256(raw).hexdigest()
    today = timezone.localdate().isoformat()
    relative_dir = Path(str(workspace_id)) / str(project_id) / today
    filename = f"{uuid.uuid4().hex}{suffix}"
    final_relative = relative_dir / filename
    final_path = settings.FILES_ROOT / final_relative
    temp_path = settings.TEMP_DIR / f"{filename}.tmp"
    final_path.parent.mkdir(parents=True, exist_ok=True)
    settings.TEMP_DIR.mkdir(parents=True, exist_ok=True)
    temp_path.write_bytes(raw)
    temp_path.replace(final_path)
    return StoredScreenshot(
        relative_path=final_relative.as_posix(),
        content_hash=digest,
        byte_size=len(raw),
        mime=mime,
    )


def delete_relative_file(relative_path: str) -> bool:
    if not relative_path:
        return False
    root = settings.FILES_ROOT.resolve()
    target = (root / relative_path).resolve()
    if root not in target.parents and target != root:
        return False
    if not target.exists():
        return False
    target.unlink()
    return True


def _suffix_for_mime(mime: str) -> str:
    if mime == "image/jpeg":
        return ".jpg"
    if mime == "image/webp":
        return ".webp"
    return ".png"
