export type UserRole = "student" | "instructor" | "admin";
export type CourseStatus = "draft" | "in_review" | "published" | "archived";
export type CourseLevel = "beginner" | "intermediate" | "expert" | "all";
export type EnrollmentStatus = "active" | "completed" | "refunded";
export type LessonType = "video" | "article" | "quiz" | "coding_exercise";

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
  course_title?: string;
  course_slug?: string;
  status: EnrollmentStatus;
  created_at: string;
  completed_at?: string;
  completed_lessons?: number;
  total_lessons?: number;
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
  attempt_number: number;
  answers: (number | null)[];
  results: QuizQuestionResult[];
  created_at: string;
}

export interface BadgeRead {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: string;
  xp_reward: number;
}

export interface UserBadgeRead {
  badge: BadgeRead;
  earned_at: string;
}

export interface GamificationStats {
  xp_total: number;
  level: number;
  xp_to_next_level: number;
  current_streak: number;
  longest_streak: number;
  badges: UserBadgeRead[];
}

export interface CourseListResponse {
  items: Course[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export type LearningPathStatus = "draft" | "published";

export interface LearningPath {
  id: string;
  instructor_id: string;
  title: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  status: LearningPathStatus;
  course_count: number;
  created_at: string;
}

export interface LearningPathDetail extends LearningPath {
  courses: Course[];
  enrolled_count: number;
}

export interface LearningPathProgress {
  path_id: string;
  completed_courses: number;
  total_courses: number;
  enrolled: boolean;
}

export interface AffiliateLink {
  id: string;
  code: string;
  commission_pct: number;
  click_count: number;
  is_active: boolean;
  created_at: string;
}

export interface AffiliateStats {
  link: AffiliateLink;
  total_conversions: number;
  total_revenue_cents: number;
  total_commission_cents: number;
  pending_commission_cents: number;
}

export interface AffiliateConversion {
  id: string;
  course_id: string;
  amount_cents: number;
  commission_cents: number;
  status: "pending" | "paid";
  created_at: string;
}

export interface TestCase {
  input: string;
  expected_output: string;
}

export interface TestCaseResult {
  index: number;
  passed: boolean;
  stdout: string | null;
  expected: string;
  time_ms: number | null;
  memory_kb: number | null;
}

export interface CodingExercise {
  id: string;
  lesson_id: string;
  language_id: number;
  problem_statement: string;
  starter_code: string;
  test_cases?: TestCase[];
  created_at: string;
  updated_at: string;
}

export interface CodeSubmission {
  id: string;
  lesson_id: string;
  status: "pending" | "running" | "accepted" | "wrong_answer" | "error";
  tests_passed: number;
  tests_total: number;
  stdout: string | null;
  stderr: string | null;
  time_ms: number | null;
  memory_kb: number | null;
  attempt_number: number;
  results: TestCaseResult[];
  created_at: string;
}

export interface LiveSession {
  id: string;
  course_id: string;
  instructor_id: string;
  title: string;
  room_name: string;
  status: "scheduled" | "live" | "ended";
  scheduled_at?: string;
  started_at?: string;
  ended_at?: string;
  created_at: string;
}

export interface LiveSessionToken {
  token: string;
  url: string;
  room_name: string;
}
