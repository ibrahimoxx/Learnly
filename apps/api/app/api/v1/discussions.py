import uuid

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user
from app.db.session import get_db
from app.db.tables.course import Course
from app.db.tables.discussion import DiscussionPost, DiscussionReply
from app.db.tables.enrollment import Enrollment
from app.db.tables.user import User
from app.schemas.discussion import (
    DiscussionPostCreate,
    DiscussionPostRead,
    DiscussionReplyCreate,
    DiscussionReplyRead,
)

log = structlog.get_logger()
router = APIRouter(tags=["discussions"])


def _post_to_read(post: DiscussionPost) -> DiscussionPostRead:
    author_name = f"{post.author.first_name} {post.author.last_name}".strip() or post.author.email
    return DiscussionPostRead(
        id=post.id,
        course_id=post.course_id,
        author_id=post.author_id,
        author_name=author_name,
        title=post.title,
        body=post.body,
        is_pinned=post.is_pinned,
        created_at=post.created_at,
        replies=[
            DiscussionReplyRead(
                id=r.id,
                post_id=r.post_id,
                author_id=r.author_id,
                author_name=f"{r.author.first_name} {r.author.last_name}".strip() or r.author.email,
                body=r.body,
                created_at=r.created_at,
            )
            for r in post.replies
        ],
    )


async def _require_participation(course_id: uuid.UUID, user: User, db: AsyncSession) -> None:
    if user.role in ("instructor", "admin"):
        return
    result = await db.execute(
        select(Enrollment).where(Enrollment.student_id == user.id, Enrollment.course_id == course_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Must be enrolled to participate")


async def _require_course_instructor(course_id: uuid.UUID, user: User, db: AsyncSession) -> None:
    if user.role == "admin":
        return
    result = await db.execute(
        select(Course).where(Course.id == course_id, Course.instructor_id == user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the course instructor")


@router.get("/courses/{course_id}/discussions", response_model=list[DiscussionPostRead])
async def list_discussions(
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> list[DiscussionPostRead]:
    result = await db.execute(
        select(DiscussionPost)
        .options(
            selectinload(DiscussionPost.author),
            selectinload(DiscussionPost.replies).selectinload(DiscussionReply.author),
        )
        .where(DiscussionPost.course_id == course_id)
        .order_by(DiscussionPost.is_pinned.desc(), DiscussionPost.created_at.desc())
    )
    return [_post_to_read(p) for p in result.scalars().all()]


@router.post(
    "/courses/{course_id}/discussions",
    response_model=DiscussionPostRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_post(
    course_id: uuid.UUID,
    body: DiscussionPostCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DiscussionPostRead:
    await _require_participation(course_id, user, db)

    post = DiscussionPost(
        course_id=course_id,
        author_id=user.id,
        title=body.title,
        body=body.body,
    )
    db.add(post)
    await db.flush()
    await db.refresh(post, ["author", "replies"])
    await db.commit()

    log.info("discussion_post_created", course_id=str(course_id), author_id=str(user.id))
    return _post_to_read(post)


@router.post(
    "/discussions/{post_id}/replies",
    response_model=DiscussionReplyRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_reply(
    post_id: uuid.UUID,
    body: DiscussionReplyCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DiscussionReplyRead:
    post_result = await db.execute(select(DiscussionPost).where(DiscussionPost.id == post_id))
    post = post_result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    await _require_participation(post.course_id, user, db)

    reply = DiscussionReply(post_id=post_id, author_id=user.id, body=body.body)
    db.add(reply)
    await db.flush()
    await db.refresh(reply, ["author"])
    await db.commit()

    log.info("discussion_reply_created", post_id=str(post_id), author_id=str(user.id))
    return DiscussionReplyRead(
        id=reply.id,
        post_id=reply.post_id,
        author_id=reply.author_id,
        author_name=f"{reply.author.first_name} {reply.author.last_name}".strip() or reply.author.email,
        body=reply.body,
        created_at=reply.created_at,
    )


@router.patch("/discussions/{post_id}/pin", response_model=DiscussionPostRead)
async def toggle_pin(
    post_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DiscussionPostRead:
    result = await db.execute(
        select(DiscussionPost)
        .options(
            selectinload(DiscussionPost.author),
            selectinload(DiscussionPost.replies).selectinload(DiscussionReply.author),
        )
        .where(DiscussionPost.id == post_id)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    await _require_course_instructor(post.course_id, user, db)
    post.is_pinned = not post.is_pinned
    await db.commit()

    log.info("discussion_post_pinned", post_id=str(post_id), is_pinned=post.is_pinned)
    return _post_to_read(post)


@router.delete("/discussions/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(DiscussionPost).where(DiscussionPost.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    is_author = post.author_id == user.id
    is_privileged = user.role in ("instructor", "admin")
    if not is_author and not is_privileged:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    await db.delete(post)
    await db.commit()


@router.delete("/discussions/replies/{reply_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reply(
    reply_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(DiscussionReply).where(DiscussionReply.id == reply_id))
    reply = result.scalar_one_or_none()
    if not reply:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reply not found")

    is_author = reply.author_id == user.id
    is_privileged = user.role in ("instructor", "admin")
    if not is_author and not is_privileged:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    await db.delete(reply)
    await db.commit()
