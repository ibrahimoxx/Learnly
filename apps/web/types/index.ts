export type UserRole = "student" | "instructor" | "admin";
export type CourseStatus = "draft" | "in_review" | "published" | "archived";
export type CourseLevel = "beginner" | "intermediate" | "expert" | "all";
export type EnrollmentStatus = "active" | "completed" | "refunded";
export type LessonType = "video" | "article" | "quiz" | "coding_exercise" | "assignment";

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
  instructor?: {
    id: string;
    first_name: string;
    last_name: string;
    image_url?: string;
  };
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  learning_objectives?: string[] | null;
  prerequisites?: string[] | null;
  target_audience?: string[] | null;
  welcome_message?: string | null;
  completion_message?: string | null;
  image_alt_text?: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface CategoryWithCount extends Category {
  course_count: number;
}

export interface InstructorProfile {
  id: string;
  first_name: string;
  last_name: string;
  image_url?: string;
  bio?: string;
  website?: string;
  created_at: string;
  total_courses: number;
  total_students: number;
  avg_rating: number;
  total_reviews: number;
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
  captions_url?: string | null;
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

export interface Note {
  id: string;
  lesson_id: string;
  course_id: string;
  content: string;
  timestamp_seconds: number | null;
  created_at: string;
  updated_at: string;
}

export interface NoteWithContext extends Note {
  lesson_title: string;
  course_title: string;
  course_slug: string;
}

export interface NoteCreate {
  content: string;
  timestamp_seconds?: number | null;
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

export interface GiftCourseInfo {
  id: string;
  title: string;
  slug: string;
  image_url?: string;
}

export interface GiftUserInfo {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface GiftRead {
  id: string;
  course: GiftCourseInfo;
  other_user: GiftUserInfo;
  message: string | null;
  created_at: string;
  courses?: GiftCourseInfo[] | null;
}

export interface GiftListRead {
  sent: GiftRead[];
  received: GiftRead[];
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
  course_title?: string | null;
  instructor_response?: string | null;
  instructor_response_at?: string | null;
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

export interface UserAccount {
  id: string;
  clerk_id: string;
  email: string;
  first_name: string;
  last_name: string;
  image_url: string | null;
  role: UserRole;
  bio: string | null;
  website: string | null;
  is_active: boolean;
  timezone: string | null;
  is_profile_public: boolean;
  created_at: string;
}

export interface UserAccountUpdate {
  first_name?: string;
  last_name?: string;
  bio?: string;
  website?: string;
  image_url?: string;
  timezone?: string;
}

export interface EmailNotificationPrefs {
  enrollment: boolean;
  qa_reply: boolean;
  review: boolean;
  gift: boolean;
  announcement: boolean;
  message: boolean;
  marketing: boolean;
}

export interface UserPrivacy {
  is_profile_public: boolean;
  email_notification_prefs: EmailNotificationPrefs;
}

export interface UserPrivacyUpdate {
  is_profile_public?: boolean;
  email_notification_prefs?: Partial<EmailNotificationPrefs>;
}

export interface SubscriptionRead {
  plan: string;
  status: string;
  description: string;
  renews_at: string | null;
}

export interface PurchaseHistoryItem {
  id: string;
  course_id: string;
  course_title: string;
  course_slug: string;
  amount_cents: number;
  currency: string;
  is_gift_purchase: boolean;
  purchased_at: string;
}

export interface MessageUserBrief {
  id: string;
  first_name: string;
  last_name: string;
  image_url: string | null;
  role: UserRole;
}

export interface MessageRead {
  id: string;
  sender_id: string;
  recipient_id: string;
  course_id: string | null;
  body: string;
  is_read: boolean;
  created_at: string;
}

export interface ConversationRead {
  participant: MessageUserBrief;
  last_message: MessageRead;
  unread_count: number;
}

export interface CourseRevenueRow {
  course_id: string;
  title: string;
  enrollment_count: number;
  revenue_cents: number;
  currency: string;
  rating: number;
  review_count: number;
}

export interface MonthlyRevenuePoint {
  month: string;
  revenue_cents: number;
}

export interface PerformanceOverview {
  total_revenue_cents: number;
  currency: string;
  total_students: number;
  total_courses: number;
  average_rating: number;
  monthly_revenue: MonthlyRevenuePoint[];
  courses: CourseRevenueRow[];
}

export interface StudentRow {
  student_id: string;
  name: string;
  email: string;
  course_id: string;
  course_title: string;
  enrolled_at: string;
  progress_percent: number;
  last_activity_at: string | null;
}

export interface EngagementRow {
  course_id: string;
  title: string;
  total_students: number;
  completed_students: number;
  completion_rate: number;
  total_watch_minutes: number;
  average_progress_percent: number;
}

export interface TrafficRow {
  course_id: string;
  title: string;
  wishlist_count: number;
  enrollment_count: number;
  conversion_rate: number;
}

export interface AnnouncementCreate {
  title: string;
  body: string;
}

export interface AnnouncementRead {
  id: string;
  course_id: string;
  course_title: string;
  title: string;
  body: string;
  recipient_count: number;
  created_at: string;
}

export type AssignmentSubmissionStatus = "submitted" | "reviewed";

export interface AssignmentSubmissionCreate {
  content?: string | null;
  file_url?: string | null;
}

export interface AssignmentSubmissionRead {
  id: string;
  lesson_id: string;
  course_id: string;
  student_id: string;
  content: string | null;
  file_url: string | null;
  status: AssignmentSubmissionStatus;
  grade: number | null;
  feedback: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  updated_at: string;
}

export interface AssignmentSubmissionWithContext extends AssignmentSubmissionRead {
  student_name: string;
  student_email: string;
  lesson_title: string;
  course_title: string;
}

export interface AssignmentGrade {
  grade: number;
  feedback: string;
}

export interface TestVideoUploadResponse {
  upload_url: string;
  video_key: string;
}

export type TestVideoRequestStatus = "pending" | "reviewed";

export interface TestVideoRequestRead {
  id: string;
  video_url: string;
  note: string | null;
  status: TestVideoRequestStatus;
  feedback: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface MarketplaceInsightRow {
  category_id: string;
  category_name: string;
  course_count: number;
  average_rating: number;
  average_price_cents: number;
  currency: string;
  total_enrollments: number;
}

export type RevenueTransactionType = "purchase" | "refund";

export interface RevenueTransactionRow {
  enrollment_id: string;
  course_id: string;
  course_title: string;
  student_name: string;
  type: RevenueTransactionType;
  amount_cents: number;
  currency: string;
  created_at: string;
}

export interface RevenueReport {
  total_revenue_cents: number;
  currency: string;
  transaction_count: number;
  transactions: RevenueTransactionRow[];
}

export type CoInstructorStatus = "pending" | "active" | "removed";

export interface CoInstructorInvite {
  email: string;
  can_manage_content: boolean;
  can_respond_qa: boolean;
  can_respond_reviews: boolean;
  can_view_revenue: boolean;
  revenue_share_percent: number;
}

export interface CoInstructorUpdate {
  can_manage_content?: boolean;
  can_respond_qa?: boolean;
  can_respond_reviews?: boolean;
  can_view_revenue?: boolean;
  revenue_share_percent?: number;
}

export interface CoInstructorRead {
  id: string;
  course_id: string;
  user_id: string;
  name: string;
  email: string;
  can_manage_content: boolean;
  can_respond_qa: boolean;
  can_respond_reviews: boolean;
  can_view_revenue: boolean;
  revenue_share_percent: number;
  status: CoInstructorStatus;
  invited_at: string;
  accepted_at: string | null;
}
