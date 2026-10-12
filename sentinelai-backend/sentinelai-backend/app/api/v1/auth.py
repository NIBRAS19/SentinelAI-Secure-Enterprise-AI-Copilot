from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_member, CurrentMember
from app.core.database import get_db
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    LogoutRequest,
    MemberOut,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenPairOut,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenPairOut, status_code=201)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    member, access, refresh = await auth_service.register(
        db,
        organization_name=payload.organization_name,
        full_name=payload.full_name,
        email=payload.email,
        password=payload.password,
    )
    await db.commit()
    return TokenPairOut(access_token=access, refresh_token=refresh, member=MemberOut.model_validate(member))


@router.post("/login", response_model=TokenPairOut)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    member, access, refresh = await auth_service.login(db, email=payload.email, password=payload.password)
    await db.commit()
    return TokenPairOut(access_token=access, refresh_token=refresh, member=MemberOut.model_validate(member))


@router.post("/refresh")
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    access, refresh_token = await auth_service.refresh_session(db, refresh_token=payload.refresh_token)
    await db.commit()
    return {"access_token": access, "refresh_token": refresh_token, "token_type": "bearer"}


@router.post("/logout", status_code=204)
async def logout(payload: LogoutRequest, db: AsyncSession = Depends(get_db)):
    await auth_service.logout(db, refresh_token=payload.refresh_token)
    await db.commit()


@router.post("/forgot-password", status_code=202)
async def forgot_password(payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    # Always return the same response whether or not the email exists, so this
    # endpoint can't be used to enumerate registered accounts.
    await auth_service.request_password_reset(db, email=payload.email)
    await db.commit()
    return {"message": "If an account exists for this email, a reset link has been sent."}


@router.post("/reset-password", status_code=204)
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    await auth_service.reset_password(db, token=payload.token, new_password=payload.new_password)
    await db.commit()


@router.get("/me", response_model=MemberOut)
async def me(current: CurrentMember = Depends(get_current_member)):
    return MemberOut(
        id=current.id, organization_id=current.organization_id, email=current.email,
        full_name=current.full_name, role=current.role, is_active=True,
    )
