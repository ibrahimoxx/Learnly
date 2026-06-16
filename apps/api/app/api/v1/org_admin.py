import uuid
from collections import defaultdict
from datetime import datetime

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.db.session import get_db
from app.db.tables.course import Course
from app.db.tables.enrollment import Enrollment
from app.db.tables.lesson_progress import LessonProgress
from app.db.tables.organization import Organization
from app.db.tables.user import User

log = structlog.get_logger()
router = APIRouter(prefix="/orgs", tags=["org-admin"])


class MemberActivity(BaseModel):
    student_id: uuid.UUID
    student_name: str
    student_email: str
    enrolled_courses: int
    completed_courses: int
    total_lessons_completed: int
    watched_seconds: int
    last_active: datetime | None


class OrgActivityStats(BaseModel):
    total_active_members: int
    total_minutes_watched: int
    total_completions: int
    members: list[MemberActivity]


@router.get("/{slug}/activity", response_model=OrgActivityStats)
async def get_org_activity(
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OrgActivityStats:
    org_result = await db.execute(
        select(Organization).where(Organization.slug == slug, Organization.is_active.is_(True))
    )
    org = org_result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    # Platform admin always allowed. Instructors allowed only if they own a course in this org.
    if user.role != "admin":
        instructor_check = await db.execute(
            select(Course.id)
            .where(Course.organization_id == org.id, Course.instructor_id == user.id)
            .limit(1)
        )
        if not instructor_check.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    course_ids_result = await db.execute(
        select(Course.id).where(Course.organization_id == org.id)
    )
    course_ids = list(course_ids_result.scalars().all())

    if not course_ids:
        return OrgActivityStats(
            total_active_members=0, total_minutes_watched=0, total_completions=0, members=[]
        )

    enrollments_result = await db.execute(
        select(Enrollment).where(Enrollment.course_id.in_(course_ids))
    )
    enrollments = list(enrollments_result.scalars().all())

    if not enrollments:
        return OrgActivityStats(
            total_active_members=0, total_minutes_watched=0, total_completions=0, members=[]
        )

    enrollment_ids = [e.id for e in enrollments]

    progress_result = await db.execute(
        select(
            LessonProgress.enrollment_id,
            func.count(LessonProgress.id).label("completed_lessons"),
            func.coalesce(func.sum(LessonProgress.watched_seconds), 0).label("total_seconds"),
            func.max(LessonProgress.updated_at).label("last_active"),
        )
        .where(
            LessonProgress.enrollment_id.in_(enrollment_ids),
            LessonProgress.is_completed.is_(True),
        )
        .group_by(LessonProgress.enrollment_id)
    )
    progress_by_enrollment = {row.enrollment_id: row for row in progress_result}

    student_enrollments: dict[uuid.UUID, list[Enrollment]] = defaultdict(list)
    for e in enrollments:
        student_enrollments[e.student_id].append(e)

    student_ids = list(student_enrollments.keys())
    students_result = await db.execute(select(User).where(User.id.in_(student_ids)))
    students_by_id = {s.id: s for s in students_result.scalars().all()}

    members: list[MemberActivity] = []
    for student_id, enrs in student_enrollments.items():
        s = students_by_id.get(student_id)
        if not s:
            continue
        total_lessons = 0
        total_seconds = 0
        last_active: datetime | None = None
        completed_courses = sum(1 for e in enrs if e.status == "completed")

        for e in enrs:
            p = progress_by_enrollment.get(e.id)
            if p:
                total_lessons += p.completed_lessons or 0
                total_seconds += int(p.total_seconds or 0)
                if p.last_active and (last_active is None or p.last_active > last_active):
                    last_active = p.last_active

        members.append(
            MemberActivity(
                student_id=student_id,
                student_name=f"{s.first_name} {s.last_name}".strip() or s.email,
                student_email=s.email,
                enrolled_courses=len(enrs),
                completed_courses=completed_courses,
                total_lessons_completed=total_lessons,
                watched_seconds=total_seconds,
                last_active=last_active,
            )
        )

    total_minutes = sum(m.watched_seconds for m in members) // 60
    total_completions = sum(m.completed_courses for m in members)
    active_members = sum(1 for m in members if m.last_active is not None)

    log.info("org_activity_fetched", slug=slug, members=len(members))

    return OrgActivityStats(
        total_active_members=active_members,
        total_minutes_watched=total_minutes,
        total_completions=total_completions,
        members=sorted(members, key=lambda m: m.watched_seconds, reverse=True),
    )
