import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.db.session import get_db
from app.db.tables.course import Course
from app.db.tables.enrollment import Enrollment
from app.db.tables.message import Message
from app.db.tables.notification import Notification
from app.db.tables.user import User
from app.schemas.message import ConversationRead, MessageCreate, MessageRead, MessageUserBrief

router = APIRouter(prefix="/messages", tags=["messages"])


async def _has_existing_conversation(db: AsyncSession, user_a: uuid.UUID, user_b: uuid.UUID) -> bool:
    result = await db.execute(
        select(Message.id)
        .where(
            or_(
                (Message.sender_id == user_a) & (Message.recipient_id == user_b),
                (Message.sender_id == user_b) & (Message.recipient_id == user_a),
            )
        )
        .limit(1)
    )
    return result.scalar_one_or_none() is not None


async def _has_course_relationship(
    db: AsyncSession, user_a: uuid.UUID, user_b: uuid.UUID, course_id: uuid.UUID | None
) -> bool:
    query = (
        select(Enrollment.id)
        .join(Course, Course.id == Enrollment.course_id)
        .where(
            or_(
                (Enrollment.student_id == user_a) & (Course.instructor_id == user_b),
                (Enrollment.student_id == user_b) & (Course.instructor_id == user_a),
            )
        )
    )
    if course_id is not None:
        query = query.where(Enrollment.course_id == course_id)
    result = await db.execute(query.limit(1))
    return result.scalar_one_or_none() is not None


@router.get("/conversations", response_model=list[ConversationRead])
async def list_conversations(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ConversationRead]:
    result = await db.execute(
        select(Message)
        .where(or_(Message.sender_id == user.id, Message.recipient_id == user.id))
        .order_by(Message.created_at.desc())
    )
    messages = result.scalars().all()
    if not messages:
        return []

    last_by_participant: dict[uuid.UUID, Message] = {}
    unread_by_participant: dict[uuid.UUID, int] = {}
    for message in messages:
        other_id = message.recipient_id if message.sender_id == user.id else message.sender_id
        if other_id not in last_by_participant:
            last_by_participant[other_id] = message
        if message.recipient_id == user.id and not message.is_read:
            unread_by_participant[other_id] = unread_by_participant.get(other_id, 0) + 1

    participant_ids = list(last_by_participant.keys())
    users_result = await db.execute(select(User).where(User.id.in_(participant_ids)))
    users_by_id = {u.id: u for u in users_result.scalars().all()}

    conversations: list[ConversationRead] = []
    for other_id, last_message in last_by_participant.items():
        participant = users_by_id.get(other_id)
        if not participant:
            continue
        conversations.append(
            ConversationRead(
                participant=MessageUserBrief.model_validate(participant),
                last_message=MessageRead.model_validate(last_message),
                unread_count=unread_by_participant.get(other_id, 0),
            )
        )
    conversations.sort(key=lambda c: c.last_message.created_at, reverse=True)
    return conversations


@router.get("/thread/{user_id}", response_model=list[MessageRead])
async def get_thread(
    user_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[MessageRead]:
    if not await _has_existing_conversation(db, user.id, user_id):
        return []

    result = await db.execute(
        select(Message)
        .where(
            or_(
                (Message.sender_id == user.id) & (Message.recipient_id == user_id),
                (Message.sender_id == user_id) & (Message.recipient_id == user.id),
            )
        )
        .order_by(Message.created_at.asc())
    )
    thread = result.scalars().all()

    unread_ids = [m.id for m in thread if m.recipient_id == user.id and not m.is_read]
    if unread_ids:
        for message in thread:
            if message.id in unread_ids:
                message.is_read = True
        await db.commit()

    return [MessageRead.model_validate(m) for m in thread]


@router.post("", response_model=MessageRead, status_code=status.HTTP_201_CREATED)
async def send_message(
    body: MessageCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageRead:
    if body.recipient_id == user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot message yourself")

    recipient_result = await db.execute(select(User).where(User.id == body.recipient_id))
    recipient = recipient_result.scalar_one_or_none()
    if not recipient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipient not found")

    if not await _has_existing_conversation(db, user.id, body.recipient_id):
        if body.course_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="course_id is required to start a new conversation",
            )
        if not await _has_course_relationship(db, user.id, body.recipient_id, body.course_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only message your course instructors or enrolled students",
            )

    message = Message(
        sender_id=user.id,
        recipient_id=body.recipient_id,
        course_id=body.course_id,
        body=body.body,
    )
    db.add(message)

    sender_name = f"{user.first_name} {user.last_name}".strip() or user.email
    db.add(Notification(
        user_id=body.recipient_id,
        type="direct_message",
        title=f"New message from {sender_name}",
        body=body.body[:200],
        link="/user/edit-profile/messages",
    ))

    await db.commit()
    await db.refresh(message)
    return MessageRead.model_validate(message)
