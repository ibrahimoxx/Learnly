export type UserRole = "student" | "instructor" | "admin";
export type CourseStatus = "draft" | "in_review" | "published" | "archived";
export type CourseLevel = "beginner" | "intermediate" | "expert" | "all";
export type EnrollmentStatus = "active" | "completed" | "refunded";
export type LessonType = "video" | "article" | "quiz";

export interface Course {
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  description?: string;
  image_url?: string;
  promo_video_url?: string;
  price_in_cents: number;
  is_free: boolean;
  status: CourseStatus;
  level: CourseLevel;
  language: string;
  currency: string;
  total_duration_seconds: number;
  total_lessons: number;
  enrollment_count: number;
  rating: number;
  review_count: number;
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
  duration_seconds: number | null;
  is_free_preview: boolean;
  video_url?: string;
  content?: string;
  type: LessonType;
}

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  status: EnrollmentStatus;
  created_at: string;
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

export interface Answer {
  id: string;
  question_id: string;
  user_id: string;
  user_name: string;
  body: string;
  created_at: string;
}

export interface Question {
  id: string;
  lesson_id: string;
  student_id: string;
  student_name: string;
  body: string;
  created_at: string;
  answers: Answer[];
}

export interface Review {
  id: string;
  course_id: string;
  student_id: string;
  rating: number;
  comment?: string;
  student_name: string;
  created_at: string;
}

export interface CourseListResponse {
  items: Course[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
