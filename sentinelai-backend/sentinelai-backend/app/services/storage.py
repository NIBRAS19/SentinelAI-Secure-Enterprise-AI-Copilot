"""
Local-filesystem file storage, with a layout and interface that's easy to
swap for S3/MinIO later (same build_storage_key/save_bytes/read_bytes/delete
surface, different implementation).

`_resolve()` is the path-traversal guard: it resolves the final absolute
path and asserts the storage root is one of its parents before any read,
write, or delete touches disk. A storage_key containing "../../etc/passwd"
resolves outside root and is rejected, rather than trusting the key's
structure to be well-formed just because it's generated internally — this
also protects against any future caller that builds a key from
less-trusted input.
"""
import os
import uuid
from pathlib import Path

from app.core.config import get_settings


class StorageError(Exception):
    pass


def build_storage_key(organization_id: str, document_id: str, original_filename: str) -> str:
    safe_name = "".join(c for c in original_filename if c.isalnum() or c in "._-") or "file"
    return f"{organization_id}/{document_id}/{uuid.uuid4().hex}_{safe_name}"


def _resolve(storage_key: str) -> Path:
    settings = get_settings()
    root = Path(settings.storage_dir).resolve()
    target = (root / storage_key).resolve()
    if root != target and root not in target.parents:
        raise StorageError("Resolved path escapes the storage root; refusing to access it.")
    return target


def save_bytes(storage_key: str, data: bytes) -> None:
    path = _resolve(storage_key)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "wb") as f:
        f.write(data)


def read_bytes(storage_key: str) -> bytes:
    path = _resolve(storage_key)
    with open(path, "rb") as f:
        return f.read()


def delete(storage_key: str) -> None:
    path = _resolve(storage_key)
    if path.exists():
        os.remove(path)
