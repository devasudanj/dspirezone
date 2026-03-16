import json

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import VendorInquiry
from ..schemas import VendorInquiryCreate, VendorInquiryOut

router = APIRouter()


@router.post("/inquiries", response_model=VendorInquiryOut, status_code=status.HTTP_201_CREATED)
def create_vendor_inquiry(
    payload: VendorInquiryCreate,
    db: Session = Depends(get_db),
):
    inquiry = VendorInquiry(
        name=payload.name.strip(),
        contact_number=payload.contact_number.strip(),
        email=payload.email.lower().strip(),
        business_type=payload.business_type.strip(),
        opted_options=json.dumps(payload.opted_options),
        previous_experience=(payload.previous_experience or "").strip() or None,
        healthy_concept=(payload.healthy_concept or "").strip() or None,
    )
    db.add(inquiry)
    db.commit()
    db.refresh(inquiry)

    return VendorInquiryOut(
        id=inquiry.id,
        name=inquiry.name,
        contact_number=inquiry.contact_number,
        email=inquiry.email,
        business_type=inquiry.business_type,
        opted_options=json.loads(inquiry.opted_options),
        previous_experience=inquiry.previous_experience,
        healthy_concept=inquiry.healthy_concept,
        created_at=inquiry.created_at,
    )
