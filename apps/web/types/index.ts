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
  unlock_at?: string | null;
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

export interface WishlistItem {
  id: string;
  course_id: string;
  course_title: string;
  course_slug: string;
  course_price_in_cents: number;
  course_is_free: boolean;
  course_image_url?: string;
  course_rating: number;
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

export interface DiscussionReply {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

export interface DiscussionPost {
  id: string;
  course_id: string;
  author_id: string;
  author_name: string;
  title: string;
  body: string;
  is_pinned: boolean;
  created_at: string;
  replies: DiscussionReply[];
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

export interface QuizQuestion {
  id: string;
  lesson_id: string;
  question_text: string;
  options: string[];
  explanation: string | null;
  position: number;
  created_at: string;
  correct_index?: number;
}

export interface QuizQuestionResult {
  question_id: string;
  selected_index: number | null;
  correct_index: number;
  is_correct: boolean;
  explanation: string | null;
}

export interface QuizAttemptRead {
  id: string;
  lesson_id: string;
  score: number;
  total: number;
  passed: boolean;
  answers: (number | null)[];
  results: QuizQuestionResult[];
  created_at: string;
}

export interface CourseListResponse {
  items: Course[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
