import secrets
import uuid
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.db.tables.course import Course
from app.db.tables.enrollment import Enrollment
from app.db.tables.live_session import LiveSession
from app.db.tables.user import User
from app.schemas.live_session import LiveSessionCreate, LiveSessionRead, LiveSessionToken

log = structlog.get_logger()
router = APIRouter(tags=["live_sessions"])


def _make_room_name(course_id: uuid.UUID, title: str) -> str:
    slug = title.lower().replace(" ", "-")[:40]
    return f"course-{str(course_id)[:8]}-{slug}-{uuid.uuid4().hex[:6]}"


def _make_token(room_name: str, identity: str, is_instructor: bool) -> str:
    from livekit.api import AccessToken, VideoGrants  # type: ignore[import]

    grants = VideoGrants(
        room_join=True,
        room=room_name,
        can_publish=is_instructor,
        can_subscribe=True,
    )
    token = (
        AccessToken(api_key=settings.livekit_api_key, api_secret=settings.livekit_api_secret)
        .with_identity(identity)
        .with_grants(grants)
    )
    return token.to_jwt()


async def _get_course(course_id: uuid.UUID, db: AsyncSession) -> Course:
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return course


async def _require_enrolled_or_instructor(
    course: Course, user: User, db: AsyncSession
) -> None:
    if user.role in ("instructor", "admin"):
        return
    result = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == user.id,
            Enrollment.course_id == course.id,
            Enrollment.status.in_(["active", "completed"]),
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Must be enrolled to access live sessions",
        )


@router.post(
    "/courses/{course_id}/live-sessions",
    response_model=LiveSessionRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_live_session(
    course_id: uuid.UUID,
    body: LiveSessionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LiveSessionRead:
    course = await _get_course(course_id, db)

    if user.role not in ("instructor", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Instructors only")
    if user.role == "instructor" and course.instructor_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this course")

    session = LiveSession(
        course_id=course_id,
        instructor_id=user.id,
        title=body.title,
        room_name=_make_room_name(course_id, body.title),
        status="scheduled",
        scheduled_at=body.scheduled_at,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    log.info("live_session_created", session_id=str(session.id), course_id=str(course_id))
    return LiveSessionRead.model_validate(session)


@router.get(
    "/courses/{course_id}/live-sessions",
    response_model=list[LiveSessionRead],
)
async def list_live_sessions(
    course_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[LiveSessionRead]:
    course = await _get_course(course_id, db)
    await _require_enrolled_or_instructor(course, user, db)

    result = await db.execute(
        select(LiveSession)
        .where(LiveSession.course_id == course_id)
        .order_by(LiveSession.created_at.desc())
    )
    sessions = result.scalars().all()
    return [LiveSessionRead.model_validate(s) for s in sessions]


@router.get(
    "/live-sessions/{session_id}",
    response_model=LiveSessionRead,
)
async def get_live_session(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LiveSessionRead:
    result = await db.execute(select(LiveSession).where(LiveSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    course = await _get_course(session.course_id, db)
    await _require_enrolled_or_instructor(course, user, db)
    return LiveSessionRead.model_validate(session)


@router.get(
    "/live-sessions/{session_id}/token",
    response_model=LiveSessionToken,
)
async def get_session_token(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LiveSessionToken:
    result = await db.execute(select(LiveSession).where(LiveSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    course = await _get_course(session.course_id, db)
    await _require_enrolled_or_instructor(course, user, db)

    if session.status == "ended":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session has ended")

    is_instructor = user.role in ("instructor", "admin") and (
        user.role == "admin" or course.instructor_id == user.id
    )

    identity = f"{user.id}-{secrets.token_hex(4)}"
    token = _make_token(session.room_name, identity, is_instructor)
    ws_url = settings.livekit_url.replace("http://", "ws://").replace("https://", "wss://")

    return LiveSessionToken(
        token=token,
        url=ws_url,
        room_name=session.room_name,
    )


@router.patch(
    "/live-sessions/{session_id}/start",
    response_model=LiveSessionRead,
)
async def start_live_session(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LiveSessionRead:
    result = await db.execute(select(LiveSession).where(LiveSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    course = await _get_course(session.course_id, db)
    if user.role not in ("instructor", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Instructors only")
    if user.role == "instructor" and course.instructor_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this course")

    if session.status != "scheduled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot start a session with status '{session.status}'",
        )

    session.status = "live"
    session.started_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(session)

    log.info("live_session_started", session_id=str(session_id))
    return LiveSessionRead.model_validate(session)


@router.patch(
    "/live-sessions/{session_id}/end",
    response_model=LiveSessionRead,
)
async def end_live_session(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LiveSessionRead:
    result = await db.execute(select(LiveSession).where(LiveSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    course = await _get_course(session.course_id, db)
    if user.role not in ("instructor", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Instructors only")
    if user.role == "instructor" and course.instructor_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this course")

    if session.status != "live":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot end a session with status '{session.status}'",
        )

    session.status = "ended"
    session.ended_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(session)

    log.info("live_session_ended", session_id=str(session_id))
    return LiveSessionRead.model_validate(session)
