from fastapi import APIRouter, Query
from app import audit

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("")
async def get_audit_log(limit: int = Query(50, ge=1, le=200)):
    """Return recent audit events (newest first, max 200)."""
    return audit.get_recent(limit)
