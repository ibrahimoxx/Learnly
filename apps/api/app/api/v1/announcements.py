import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_instructor
from app.core.rate_limit import limiter
from app.db.session import get_db
from app.db.tables.announcement import CourseAnnouncement
from app.db.tables.course import Course
from app.db.tables.enrollment import Enrollment
from app.db.tables.notification import Notification
from app.db.tables.user import User
from app.schemas.announcement import AnnouncementCreate, AnnouncementRead

router = APIRouter(prefix="/instructor/announcements", tags=["instructor-announcements"])


async def _get_owned_course(db: AsyncSession, course_id: uuid.UUID, instructor: User) -> Course:
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course or course.instructor_id != instructor.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return course


@router.get("", response_model=list[AnnouncementRead])
@limiter.limit("60/minute")
async def list_announcements(
    request: Request,
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> list[AnnouncementRead]:
    result = await db.execute(
        select(CourseAnnouncement, Course.title)
        .join(Course, Course.id == CourseAnnouncement.course_id)
        .where(Course.instructor_id == instructor.id)
        .order_by(CourseAnnouncement.created_at.desc())
    )
    rows = result.all()

    course_ids = {announcement.course_id for announcement, _ in rows}
    recipient_counts: dict[uuid.UUID, int] = {}
    if course_ids:
        count_result = await db.execute(
            select(Enrollment.course_id, func.count(Enrollment.id))
            .where(Enrollment.course_id.in_(course_ids), Enrollment.status != "refunded")
            .group_by(Enrollment.course_id)
        )
        recipient_counts = dict(count_result.all())

    return [
        AnnouncementRead(
            id=announcement.id,
            course_id=announcement.course_id,
            course_title=course_title,
            title=announcement.title,
            body=announcement.body,
            recipient_count=recipient_counts.get(announcement.course_id, 0),
            created_at=announcement.created_at,
        )
        for announcement, course_title in rows
    ]


@router.post("/{course_id}", response_model=AnnouncementRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def create_announcement(
    request: Request,
    course_id: uuid.UUID,
    body: AnnouncementCreate,
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> AnnouncementRead:
    course = await _get_owned_course(db, course_id, instructor)

    announcement = CourseAnnouncement(
        course_id=course.id,
        instructor_id=instructor.id,
        title=body.title,
        body=body.body,
    )
    db.add(announcement)

    students_result = await db.execute(
        select(Enrollment.student_id).where(Enrollment.course_id == course.id, Enrollment.status != "refunded")
    )
    student_ids = [row[0] for row in students_result.all()]
    for student_id in student_ids:
        db.add(
            Notification(
                user_id=student_id,
                type="announcement",
                title=f"New announcement: {course.title}",
                body=body.title,
                link=f"/courses/{course.slug}",
            )
        )

    await db.commit()
    await db.refresh(announcement)

    return AnnouncementRead(
        id=announcement.id,
        course_id=announcement.course_id,
        course_title=course.title,
        title=announcement.title,
        body=announcement.body,
        recipient_count=len(student_ids),
        created_at=announcement.created_at,
    )
