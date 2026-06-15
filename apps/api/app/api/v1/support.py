import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user
from app.db.session import get_db
from app.db.tables.notification import Notification
from app.db.tables.support_ticket import SupportTicket, SupportTicketReply
from app.db.tables.user import User
from app.schemas.support import (
    SupportTicketCreate,
    SupportTicketDetail,
    SupportTicketRead,
    SupportTicketReplyCreate,
    SupportTicketReplyRead,
)

router = APIRouter(prefix="/support/tickets", tags=["support"])


def _reply_read(reply: SupportTicketReply) -> SupportTicketReplyRead:
    return SupportTicketReplyRead(
        id=reply.id,
        author_id=reply.author_id,
        author_role=reply.author_role,
        author_name=f"{reply.author.first_name} {reply.author.last_name}".strip() or reply.author.email,
        message=reply.message,
        created_at=reply.created_at,
    )


@router.get("", response_model=list[SupportTicketRead])
async def list_my_tickets(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[SupportTicket]:
    result = await db.execute(
        select(SupportTicket).where(SupportTicket.user_id == user.id).order_by(SupportTicket.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("", response_model=SupportTicketRead, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    body: SupportTicketCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SupportTicket:
    ticket = SupportTicket(user_id=user.id, subject=body.subject, message=body.message)
    db.add(ticket)
    await db.flush()

    admins = await db.execute(select(User.id).where(User.role == "admin"))
    sender_name = f"{user.first_name} {user.last_name}".strip() or user.email
    for admin_id in admins.scalars().all():
        db.add(Notification(
            user_id=admin_id,
            type="support_ticket",
            title="New support ticket",
            body=f"{sender_name}: {body.subject}"[:255],
            link="/admin/support",
        ))

    await db.commit()
    await db.refresh(ticket)
    return ticket


@router.get("/{ticket_id}", response_model=SupportTicketDetail)
async def get_ticket(
    ticket_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SupportTicketDetail:
    result = await db.execute(
        select(SupportTicket)
        .where(SupportTicket.id == ticket_id, SupportTicket.user_id == user.id)
        .options(selectinload(SupportTicket.replies).selectinload(SupportTicketReply.author))
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    return SupportTicketDetail(
        id=ticket.id,
        subject=ticket.subject,
        status=ticket.status,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        message=ticket.message,
        user_id=ticket.user_id,
        user_name=f"{user.first_name} {user.last_name}".strip() or user.email,
        user_email=user.email,
        replies=[_reply_read(r) for r in ticket.replies],
    )


@router.post("/{ticket_id}/reply", response_model=SupportTicketReplyRead, status_code=status.HTTP_201_CREATED)
async def reply_to_ticket(
    ticket_id: uuid.UUID,
    body: SupportTicketReplyCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SupportTicketReplyRead:
    result = await db.execute(
        select(SupportTicket).where(SupportTicket.id == ticket_id, SupportTicket.user_id == user.id)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    reply = SupportTicketReply(ticket_id=ticket.id, author_id=user.id, author_role="user", message=body.message)
    db.add(reply)
    await db.flush()

    sender_name = f"{user.first_name} {user.last_name}".strip() or user.email
    admins = await db.execute(select(User.id).where(User.role == "admin"))
    for admin_id in admins.scalars().all():
        db.add(Notification(
            user_id=admin_id,
            type="support_reply",
            title="New reply on support ticket",
            body=f"{sender_name}: {body.message[:200]}",
            link="/admin/support",
        ))

    await db.commit()
    await db.refresh(reply)

    reply_result = await db.execute(
        select(SupportTicketReply)
        .where(SupportTicketReply.id == reply.id)
        .options(selectinload(SupportTicketReply.author))
    )
    reply = reply_result.scalar_one()
    return _reply_read(reply)
