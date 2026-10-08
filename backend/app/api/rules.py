"""
Rules router module re-exporting ppe_rules router under /rules tag.
"""
from app.api.ppe_rules import router

__all__ = ["router"]
