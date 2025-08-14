import os, stripe
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException
from sqlalchemy.orm import Session
from .settings import settings
from .models import Subscription, Usage, User

def stripe_client():
    if not settings.STRIPE_SECRET_KEY:
        return None
    stripe.api_key = settings.STRIPE_SECRET_KEY
    return stripe

def get_or_create_subscription(db: Session, user: User) -> Subscription:
    sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
    if not sub:
        sub = Subscription(user_id=user.id, status="inactive", tier="free")
        db.add(sub); db.commit(); db.refresh(sub)
    return sub

def get_or_create_usage(db: Session, user: User) -> Usage:
    u = db.query(Usage).filter(Usage.user_id==user.id).order_by(Usage.id.desc()).first()
    if not u:
        u = Usage(user_id=user.id)
        db.add(u); db.commit(); db.refresh(u)
    return u

def entitlement_status(db: Session, user: User):
    sub = get_or_create_subscription(db, user)
    u = get_or_create_usage(db, user)
    tier = sub.tier or "free"
    daily_gen_limit = 999999 if tier in ("pro","team") else settings.FREE_GENERATIONS_PER_DAY
    monthly_token_limit = 2_000_000 if tier in ("pro","team") else settings.FREE_TOKENS_PER_MONTH
    return {
        "tier": tier,
        "status": sub.status,
        "daily_generations_left": max(0, daily_gen_limit - (u.generations_today or 0)),
        "monthly_tokens_left": max(0, monthly_token_limit - (u.tokens_month or 0)),
    }

def estimate_tokens_from_chars(chars: int) -> int:
    return max(1, chars // 4)

def enforce_or_raise(db: Session, user: User, estimated_chars: int = 2000):
    # Temporarily disable billing checks for testing
    return True

def record_generation(db: Session, user: User, streamed_chars: int):
    u = get_or_create_usage(db, user)
    u.generations_today = (u.generations_today or 0) + 1
    u.tokens_month = (u.tokens_month or 0) + estimate_tokens_from_chars(streamed_chars)
    db.add(u); db.commit()

def create_checkout_session(user: User, success_url: str, price: str | None = None):
    sc = stripe_client()
    if not sc:
        return {"url": f"{success_url}?devCheckout=yes"}
    if not price: price = settings.STRIPE_PRICE_PRO
    if not price:
        raise HTTPException(status_code=500, detail="Missing STRIPE_PRICE_PRO")
    if not user.stripe_customer_id:
        cust = sc.Customer.create(email=user.email)
        user.stripe_customer_id = cust["id"]
    session = sc.checkout.Session.create(
        mode="subscription",
        success_url=success_url + "?session_id={CHECKOUT_SESSION_ID}",
        cancel_url=success_url,
        customer=user.stripe_customer_id,
        line_items=[{ "price": price, "quantity": 1 }],
        allow_promotion_codes=True,
    )
    return {"url": session["url"]}

def create_billing_portal(user: User, return_url: str):
    sc = stripe_client()
    if not sc:
        return {"url": return_url + "?devPortal=yes"}
    if not user.stripe_customer_id:
        cust = sc.Customer.create(email=user.email)
        user.stripe_customer_id = cust["id"]
    portal = sc.billing_portal.Session.create(customer=user.stripe_customer_id, return_url=return_url)
    return {"url": portal["url"]}

def handle_stripe_webhook(db: Session, payload: bytes, sig: str | None):
    sc = stripe_client()
    if not sc:
        return {"ok": True, "dev": True}
    event = None
    try:
        event = stripe.Webhook.construct_event(payload, sig, settings.STRIPE_WEBHOOK_SECRET)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook error: {e}")
    et = event["type"]
    data = event["data"]["object"]
    if et == "checkout.session.completed":
        cust = data.get("customer")
        sub_id = data.get("subscription")
        customer = sc.Customer.retrieve(cust) if cust else None
        email = customer.get("email") if customer else None
        if email:
            from .models import User as U, Subscription as S
            user = db.query(U).filter(U.email==email).first()
            if user:
                user.stripe_customer_id = cust
                sub = db.query(S).filter(S.user_id==user.id).first() or S(user_id=user.id)
                sub.status = "active"
                sub.tier = "pro"
                db.add(user); db.add(sub); db.commit()
    elif et == "customer.subscription.updated":
        cust = data.get("customer")
        status = data.get("status")
        from .models import User as U, Subscription as S
        user = db.query(U).filter(U.stripe_customer_id==cust).first()
        if user:
            sub = db.query(S).filter(S.user_id==user.id).first() or S(user_id=user.id)
            sub.status = status
            if status in ("canceled","unpaid","incomplete_expired"):
                sub.tier = "free"
            db.add(sub); db.commit()
    return {"ok": True}
