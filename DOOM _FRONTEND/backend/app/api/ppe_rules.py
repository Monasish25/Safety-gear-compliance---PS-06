import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import schema
from app.schemas import dto

router = APIRouter(prefix="/ppe-rules", tags=["PPE Rules"])

@router.get("", response_model=List[dto.PPERuleResponse])
def get_ppe_rules(db: Session = Depends(get_db)):
    return db.query(schema.PPERule).all()

@router.get("/{zone_id}", response_model=dto.PPERuleResponse)
def get_zone_ppe_rule(zone_id: str, db: Session = Depends(get_db)):
    rule = db.query(schema.PPERule).filter(schema.PPERule.zone_id == zone_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule for zone not found")
    return rule

@router.put("/{zone_id}", response_model=dto.PPERuleResponse)
def update_zone_ppe_rule(zone_id: str, payload: dto.PPERuleUpdate, db: Session = Depends(get_db)):
    rule = db.query(schema.PPERule).filter(schema.PPERule.zone_id == zone_id).first()
    if not rule:
        rule = schema.PPERule(id=str(uuid.uuid4()), zone_id=zone_id)
        db.add(rule)

    if payload.helmet_required is not None:
        rule.helmet_required = payload.helmet_required
    if payload.vest_required is not None:
        rule.vest_required = payload.vest_required
    if payload.gloves_required is not None:
        rule.gloves_required = payload.gloves_required
    if payload.mask_required is not None:
        rule.mask_required = payload.mask_required

    db.commit()
    db.refresh(rule)
    return rule
