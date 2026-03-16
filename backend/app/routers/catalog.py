from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import CatalogItem, ItemType
from ..schemas import CatalogItemOut

router = APIRouter()


@router.get("", response_model=List[CatalogItemOut])
def list_catalog(
    type: Optional[ItemType] = Query(None),
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
):
    q = db.query(CatalogItem)
    if type:
        q = q.filter(CatalogItem.type == type)
    if active_only:
        q = q.filter(CatalogItem.active == True)
    return q.order_by(CatalogItem.sort_order, CatalogItem.id).all()


@router.get("/{item_id}", response_model=CatalogItemOut)
def get_catalog_item(item_id: int, db: Session = Depends(get_db)):
    item = db.get(CatalogItem, item_id)
    if not item:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Item not found")
    return item
