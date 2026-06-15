import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import require_instructor
from app.core.rate_limit import limiter
from app.db.session import get_db
from app.db.tables.co_instructor import CourseCoInstructor
from app.db.tables.course import Course
from app.db.tables.notification import Notification
from app.db.tables.user import User
from app.schemas.co_instructor import CoInstructorInvite, CoInstructorRead, CoInstructorUpdate

router = APIRouter(prefix="/instructor/courses/{course_id}/co-instructors", tags=["co-instructors"])


async def _get_owned_course(db: AsyncSession, course_id: uuid.UUID, instructor: User) -> Course:
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course or course.instructor_id != instructor.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return course


def _to_read(co: CourseCoInstructor) -> CoInstructorRead:
    return CoInstructorRead(
        id=co.id,
        course_id=co.course_id,
        user_id=co.user_id,
        name=f"{co.user.first_name} {co.user.last_name}".strip() or co.user.email,
        email=co.user.email,
        can_manage_content=co.can_manage_content,
        can_respond_qa=co.can_respond_qa,
        can_respond_reviews=co.can_respond_reviews,
        can_view_revenue=co.can_view_revenue,
        revenue_share_percent=co.revenue_share_percent,
        status=co.status,
        invited_at=co.invited_at,
        accepted_at=co.accepted_at,
    )


@router.get("", response_model=list[CoInstructorRead])
@limiter.limit("60/minute")
async def list_co_instructors(
    request: Request,
    course_id: uuid.UUID,
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> list[CoInstructorRead]:
    await _get_owned_course(db, course_id, instructor)
    result = await db.execute(
        select(CourseCoInstructor)
        .options(selectinload(CourseCoInstructor.user))
        .where(CourseCoInstructor.course_id == course_id, CourseCoInstructor.status != "removed")
        .order_by(CourseCoInstructor.invited_at.desc())
    )
    return [_to_read(co) for co in result.scalars().all()]


@router.post("", response_model=CoInstructorRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def invite_co_instructor(
    request: Request,
    course_id: uuid.UUID,
    body: CoInstructorInvite,
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> CoInstructorRead:
    course = await _get_owned_course(db, course_id, instructor)

    user_result = await db.execute(select(User).where(User.email == body.email))
    invited_user = user_result.scalar_one_or_none()
    if not invited_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No user found with that email")
    if invited_user.id == instructor.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot invite yourself")

    existing_result = await db.execute(
        select(CourseCoInstructor).where(
            CourseCoInstructor.course_id == course_id, CourseCoInstructor.user_id == invited_user.id
        )
    )
    existing = existing_result.scalar_one_or_none()
    if existing and existing.status != "removed":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already invited to this course")

    if existing:
        existing.status = "pending"
        existing.can_manage_content = body.can_manage_content
        existing.can_respond_qa = body.can_respond_qa
        existing.can_respond_reviews = body.can_respond_reviews
        existing.can_view_revenue = body.can_view_revenue
        existing.revenue_share_percent = body.revenue_share_percent
        co = existing
    else:
        co = CourseCoInstructor(
            course_id=course_id,
            user_id=invited_user.id,
            can_manage_content=body.can_manage_content,
            can_respond_qa=body.can_respond_qa,
            can_respond_reviews=body.can_respond_reviews,
            can_view_revenue=body.can_view_revenue,
            revenue_share_percent=body.revenue_share_percent,
        )
        db.add(co)

    db.add(
        Notification(
            user_id=invited_user.id,
            type="co_instructor_invite",
            title="Co-instructor invitation",
            body=f'{instructor.first_name} invited you to co-teach "{course.title}"',
            link=f"/instructor/courses/{course.id}/manage",
        )
    )

    await db.commit()

    co_result = await db.execute(
        select(CourseCoInstructor)
        .options(selectinload(CourseCoInstructor.user))
        .where(CourseCoInstructor.id == co.id)
    )
    co = co_result.scalar_one()
    return _to_read(co)


@router.patch("/{co_instructor_id}", response_model=CoInstructorRead)
@limiter.limit("30/minute")
async def update_co_instructor(
    request: Request,
    course_id: uuid.UUID,
    co_instructor_id: uuid.UUID,
    body: CoInstructorUpdate,
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> CoInstructorRead:
    await _get_owned_course(db, course_id, instructor)

    result = await db.execute(
        select(CourseCoInstructor)
        .options(selectinload(CourseCoInstructor.user))
        .where(CourseCoInstructor.id == co_instructor_id, CourseCoInstructor.course_id == course_id)
    )
    co = result.scalar_one_or_none()
    if not co:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Co-instructor not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(co, field, value)

    await db.commit()
    await db.refresh(co)
    return _to_read(co)


@router.delete("/{co_instructor_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("10/minute")
async def remove_co_instructor(
    request: Request,
    course_id: uuid.UUID,
    co_instructor_id: uuid.UUID,
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> None:
    await _get_owned_course(db, course_id, instructor)

    result = await db.execute(
        select(CourseCoInstructor).where(
            CourseCoInstructor.id == co_instructor_id, CourseCoInstructor.course_id == course_id
        )
    )
    co = result.scalar_one_or_none()
    if not co:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Co-instructor not found")

    co.status = "removed"
    await db.commit()
