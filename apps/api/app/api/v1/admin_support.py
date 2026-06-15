import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import require_admin as _require_admin
from app.db.session import get_db
from app.db.tables.notification import Notification
from app.db.tables.support_ticket import SupportTicket, SupportTicketReply
from app.db.tables.user import User
from app.schemas.support import (
    SupportTicketDetail,
    SupportTicketRead,
    SupportTicketReplyCreate,
    SupportTicketReplyRead,
    SupportTicketStatusUpdate,
)

router = APIRouter(prefix="/admin/support/tickets", tags=["admin-support"])

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
async def list_tickets(
    ticket_status: str | None = Query(default=None, alias="status", pattern="^(open|in_progress|resolved|closed)$"),
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[SupportTicket]:
    query = select(SupportTicket).order_by(SupportTicket.created_at.desc())
    if ticket_status:
        query = query.where(SupportTicket.status == ticket_status)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/{ticket_id}", response_model=SupportTicketDetail)
async def get_ticket(
    ticket_id: uuid.UUID,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
) -> SupportTicketDetail:
    result = await db.execute(
        select(SupportTicket)
        .where(SupportTicket.id == ticket_id)
        .options(
            selectinload(SupportTicket.user),
            selectinload(SupportTicket.replies).selectinload(SupportTicketReply.author),
        )
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
        user_name=f"{ticket.user.first_name} {ticket.user.last_name}".strip() or ticket.user.email,
        user_email=ticket.user.email,
        replies=[_reply_read(r) for r in ticket.replies],
    )


@router.post("/{ticket_id}/reply", response_model=SupportTicketReplyRead, status_code=status.HTTP_201_CREATED)
async def reply_to_ticket(
    ticket_id: uuid.UUID,
    body: SupportTicketReplyCreate,
    admin: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
) -> SupportTicketReplyRead:
    result = await db.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    reply = SupportTicketReply(ticket_id=ticket.id, author_id=admin.id, author_role="admin", message=body.message)
    db.add(reply)

    if ticket.status == "open":
        ticket.status = "in_progress"

    db.add(
        Notification(
            user_id=ticket.user_id,
            type="support_reply",
            title="New reply to your support ticket",
            body=body.message[:255],
            link="/user/edit-profile/support",
        )
    )

    await db.commit()
    await db.refresh(reply)

    reply_result = await db.execute(
        select(SupportTicketReply)
        .where(SupportTicketReply.id == reply.id)
        .options(selectinload(SupportTicketReply.author))
    )
    reply = reply_result.scalar_one()
    return _reply_read(reply)


@router.patch("/{ticket_id}/status", response_model=SupportTicketRead)
async def update_ticket_status(
    ticket_id: uuid.UUID,
    body: SupportTicketStatusUpdate,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
) -> SupportTicket:
    result = await db.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    ticket.status = body.status
    await db.commit()
    await db.refresh(ticket)
    return ticket
