"""
Workshop content route — serves markdown files from the workshop/ directory.

Security model:
  - Only .md files are served
  - Path traversal (../) is explicitly blocked
  - Absolute paths are rejected
  - Resolved path is checked to be under _WORKSHOP_ROOT via Path.relative_to()

Usage:
  GET /api/v1/workshop/content?path=part1_design_patterns/task01_rest_vs_grpc/README.md
  → {"content": "# REST vs gRPC ...", "path": "part1_design_patterns/task01_rest_vs_grpc/README.md"}
"""

import os
from pathlib import Path

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from shared.errors import AppError
from shared.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1/workshop", tags=["workshop"])

# Resolve the workshop root.
#
# Local dev: navigate 4 parents up from this file to reach the repo root, then
#   descend into workshop/.
#   baseline/api_gateway/app/routes/workshop.py
#   parents[0]=routes  parents[1]=app  parents[2]=api_gateway
#   parents[3]=baseline  parents[4]=repo root  → repo root/workshop
#
# Docker: the file lives at /app/api_gateway/app/routes/workshop.py so
#   parents[4] would be /, not /app. Set WORKSHOP_ROOT=/app/workshop in the
#   container (via docker-compose env + volume mount) to override this
#   calculation.
_ws_env = os.getenv("WORKSHOP_ROOT")
_WORKSHOP_ROOT = (
    Path(_ws_env).resolve()
    if _ws_env
    else (Path(__file__).resolve().parents[4] / "workshop").resolve()
)


class InvalidPathError(AppError):
    status_code = 400
    error_code = "INVALID_PATH"


class ContentNotFoundError(AppError):
    status_code = 404
    error_code = "NOT_FOUND"


def _validate_path(raw: str) -> Path:
    """
    Validate and resolve a relative workshop content path.

    Raises InvalidPathError for any suspicious input; ContentNotFoundError when the
    file does not exist. Returns the absolute resolved Path on success.
    """
    # 1. Reject obvious traversal attempts early
    if ".." in raw or raw.startswith("/") or raw.startswith("\\"):
        raise InvalidPathError("Path must be a relative path with no '..' components")

    # 2. Only .md files are served
    if not raw.endswith(".md"):
        raise InvalidPathError("Only .md files are accessible")

    # 3. Resolve against the workshop root
    resolved = (_WORKSHOP_ROOT / raw).resolve()

    # 4. Confirm the resolved path is still under _WORKSHOP_ROOT (symlink-safe)
    try:
        resolved.relative_to(_WORKSHOP_ROOT)
    except ValueError:
        logger.warning("workshop_path_traversal_attempt", raw_path=raw, resolved=str(resolved))
        raise InvalidPathError("Path must be a relative path with no '..' components")

    # 5. File must exist
    if not resolved.is_file():
        raise ContentNotFoundError(f"Workshop content not found: {raw}")

    return resolved


@router.get("/content")
async def get_workshop_content(
    path: str = Query(..., description="Relative path to the markdown file within workshop/"),
) -> JSONResponse:
    """
    Serve a workshop markdown file by relative path.

    The path is resolved against the workshop/ directory at the repo root.
    Only .md files within that directory are accessible.
    """
    resolved = _validate_path(path)

    content = resolved.read_text(encoding="utf-8")

    logger.info("workshop_content_served", path=path, bytes=len(content))

    return JSONResponse({"content": content, "path": path})
