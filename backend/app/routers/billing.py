from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from ..auth import get_current_user, get_db
from ..models import User
from ..billing import entitlement_status, create_checkout_session, create_billing_portal, handle_stripe_webhook
from ..settings import settings

router = APIRouter(prefix="/billing", tags=["billing"])

@router.get("/status")
def status(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return entitlement_status(db, user)

@router.post("/checkout")
def checkout(user: User = Depends(get_current_user)):
    data = create_checkout_session(user, success_url=settings.BILLING_RETURN_URL)
    return data

@router.post("/portal")
def portal(user: User = Depends(get_current_user)):
    data = create_billing_portal(user, return_url=settings.BILLING_RETURN_URL)
    return data

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    return handle_stripe_webhook(db, payload, sig)
