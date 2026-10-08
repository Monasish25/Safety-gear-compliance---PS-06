import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import schema
from app.schemas import dto

router = APIRouter(prefix="/ppe-rules", tags=["PPE Compliance Rules"])


@router.get("", response_model=List[dto.ComplianceRuleResponse])
async def get_all_ppe_rules(db: Session = Depends(get_db)):
    """Retrieve all zone PPE compliance rules across the factory."""
    return db.query(schema.ComplianceRule).all()


@router.get("/{zone_id}", response_model=dto.ComplianceRuleResponse)
async def get_zone_ppe_rule(zone_id: str, db: Session = Depends(get_db)):
    """Retrieve the required PPE compliance rule for a specific zone."""
    rule = db.query(schema.ComplianceRule).filter(schema.ComplianceRule.zone_id == zone_id).first()
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No PPE compliance rule configured for zone_id {zone_id}"
        )
    return rule


@router.post("", response_model=dto.ComplianceRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_ppe_rule(payload: dto.ComplianceRuleCreate, db: Session = Depends(get_db)):
    """Create a new PPE compliance rule for a designated zone."""
    # Ensure zone exists
    zone = db.query(schema.Zone).filter(
        (schema.Zone.zone_id == payload.zone_id) | (schema.Zone.id == payload.zone_id)
    ).first()
    if not zone:
        zone = schema.Zone(
            zone_id=payload.zone_id,
            name=f"Zone {payload.zone_id}",
            risk_level="Medium",
            status="ok"
        )
        db.add(zone)
        db.flush()

    existing = db.query(schema.ComplianceRule).filter(schema.ComplianceRule.zone_id == payload.zone_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Compliance rule already exists for zone {payload.zone_id}. Use PUT to update."
        )

    rule = schema.ComplianceRule(
        rule_id=str(uuid.uuid4()),
        zone_id=payload.zone_id,
        helmet_required=payload.helmet_required if payload.helmet_required is not None else True,
        vest_required=payload.vest_required if payload.vest_required is not None else True,
        goggles_required=payload.goggles_required if payload.goggles_required is not None else False,
        gloves_required=payload.gloves_required if payload.gloves_required is not None else False,
        mask_required=payload.mask_required if payload.mask_required is not None else False,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.put("/{zone_id}", response_model=dto.ComplianceRuleResponse)
async def update_zone_ppe_rule(
    zone_id: str,
    payload: dto.ComplianceRuleUpdate,
    db: Session = Depends(get_db)
):
    """Upsert (create or update) required PPE gear settings for a zone."""
    # Auto-provision target zone if it does not yet exist in database
    zone = db.query(schema.Zone).filter(
        (schema.Zone.zone_id == zone_id) | (schema.Zone.id == zone_id)
    ).first()
    if not zone:
        zone = schema.Zone(
            zone_id=zone_id,
            name=f"Zone {zone_id}",
            risk_level="Medium",
            status="ok"
        )
        db.add(zone)
        db.flush()

    rule = db.query(schema.ComplianceRule).filter(schema.ComplianceRule.zone_id == zone_id).first()
    if not rule:
        rule = schema.ComplianceRule(
            rule_id=str(uuid.uuid4()),
            zone_id=zone_id,
            helmet_required=True,
            vest_required=True,
            goggles_required=False,
            gloves_required=False,
            mask_required=False
        )
        db.add(rule)

    if payload.helmet_required is not None:
        rule.helmet_required = payload.helmet_required
    if payload.vest_required is not None:
        rule.vest_required = payload.vest_required
    if payload.goggles_required is not None:
        rule.goggles_required = payload.goggles_required
    if payload.gloves_required is not None:
        rule.gloves_required = payload.gloves_required
    if payload.mask_required is not None:
        rule.mask_required = payload.mask_required

    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_zone_ppe_rule(zone_id: str, db: Session = Depends(get_db)):
    """Delete the PPE compliance rule configured for a zone."""
    rule = db.query(schema.ComplianceRule).filter(schema.ComplianceRule.zone_id == zone_id).first()
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No PPE compliance rule found for zone {zone_id}"
        )
    db.delete(rule)
    db.commit()
    return None
