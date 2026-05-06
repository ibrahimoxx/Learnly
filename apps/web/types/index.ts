export type UserRole = "student" | "instructor" | "admin";
export type CourseStatus = "draft" | "published" | "archived";
export type CourseLevel = "beginner" | "intermediate" | "advanced" | "all_levels";
export type EnrollmentStatus = "active" | "completed" | "refunded";
export type LessonType = "video" | "article" | "quiz";

export interface Course {
  id: string;
  title: string;
  slug: string;
  description?: string;
  thumbnail_url?: string;
  preview_video_url?: string;
  price_in_cents: number;
  is_free: boolean;
  status: CourseStatus;
  level: CourseLevel;
  language: string;
  duration_seconds: number;
  enrollment_count: number;
  rating: number;
  rating_count: number;
  instructor_id: string;
  category_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Section {
  id: string;
  course_id: string;
  title: string;
  position: number;
}

export interface Lesson {
  id: string;
  section_id: string;
  title: string;
  position: number;
  duration_seconds: number;
  is_free_preview: boolean;
  video_url?: string;
  article_body?: string;
  lesson_type: LessonType;
}

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  completed_at?: string;
}

export interface LessonProgress {
  id: string;
  enrollment_id: string;
  lesson_id: string;
  watched_seconds: number;
  last_position_seconds: number;
  is_completed: boolean;
  completed_at?: string;
}

export interface CourseListResponse {
  items: Course[];
  total: number;
  page: number;
  per_page: number;
}
