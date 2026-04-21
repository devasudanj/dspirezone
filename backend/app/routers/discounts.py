"""
Discount code endpoints:

  Public:
    POST /api/discounts/validate  — validate a code for a booking date

  Admin (requires admin token):
    GET    /api/admin/discounts
    POST   /api/admin/discounts
    PATCH  /api/admin/discounts/{id}
    DELETE /api/admin/discounts/{id}
"""
from datetime import date as _date
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import DiscountCode
from ..schemas import (
    DiscountCodeCreate, DiscountCodeUpdate, DiscountCodeOut,
    DiscountValidateRequest, DiscountValidateResponse,
)
from ..deps import get_admin_user
from ..models import User

router = APIRouter()


# ---------------------------------------------------------------------------
# Public — validate a discount code
# ---------------------------------------------------------------------------

@router.post("/validate", response_model=DiscountValidateResponse)
def validate_discount_code(
    payload: DiscountValidateRequest,
    db: Session = Depends(get_db),
) -> DiscountValidateResponse:
    """
    Validate a discount code.  Returns discount_pct (0 if invalid).
    The discount applies to the venue hourly rate only.
    """
    code_upper = payload.code.strip().upper()
    dc: DiscountCode | None = (
        db.query(DiscountCode).filter(DiscountCode.code == code_upper).first()
    )
    if dc is None:
        return DiscountValidateResponse(valid=False, discount_pct=0, message="Code not found.")

    if not dc.active:
        return DiscountValidateResponse(valid=False, discount_pct=0, message="This code is no longer active.")

    check_date = payload.booking_date or _date.today()
    if dc.valid_from and check_date < dc.valid_from:
        return DiscountValidateResponse(
            valid=False, discount_pct=0,
            message=f"Code is not valid yet. Valid from {dc.valid_from.strftime('%d %b %Y')}.",
        )
    if dc.valid_until and check_date > dc.valid_until:
        return DiscountValidateResponse(
            valid=False, discount_pct=0,
            message=f"Code expired on {dc.valid_until.strftime('%d %b %Y')}.",
        )

    return DiscountValidateResponse(
        valid=True,
        discount_pct=dc.discount_pct,
        message=f"{dc.discount_pct:.0f}% discount applied to event space booking.",
    )


# ---------------------------------------------------------------------------
# Admin CRUD
# ---------------------------------------------------------------------------

@router.get("", response_model=List[DiscountCodeOut])
def admin_list_discounts(
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
) -> list:
    return db.query(DiscountCode).order_by(DiscountCode.id.desc()).all()


@router.post("", response_model=DiscountCodeOut, status_code=status.HTTP_201_CREATED)
def admin_create_discount(
    payload: DiscountCodeCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
) -> DiscountCode:
    code_upper = payload.code.strip().upper()
    if db.query(DiscountCode).filter(DiscountCode.code == code_upper).first():
        raise HTTPException(status_code=400, detail="A code with this name already exists.")
    dc = DiscountCode(**{**payload.model_dump(), "code": code_upper})
    db.add(dc)
    db.commit()
    db.refresh(dc)
    return dc


@router.patch("/{discount_id}", response_model=DiscountCodeOut)
def admin_update_discount(
    discount_id: int,
    payload: DiscountCodeUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
) -> DiscountCode:
    dc = db.get(DiscountCode, discount_id)
    if not dc:
        raise HTTPException(status_code=404, detail="Discount code not found.")
    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(dc, field, val)
    db.commit()
    db.refresh(dc)
    return dc


@router.delete("/{discount_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_discount(
    discount_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
) -> None:
    dc = db.get(DiscountCode, discount_id)
    if not dc:
        raise HTTPException(status_code=404, detail="Discount code not found.")
    db.delete(dc)
    db.commit()
