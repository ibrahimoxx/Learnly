export enum UserRole {
  STUDENT = "student",
  INSTRUCTOR = "instructor",
  ADMIN = "admin",
}

export enum CourseStatus {
  DRAFT = "draft",
  IN_REVIEW = "in_review",
  PUBLISHED = "published",
  ARCHIVED = "archived",
}

export enum CourseLevel {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate",
  EXPERT = "expert",
  ALL = "all",
}

export enum LessonType {
  VIDEO = "video",
  ARTICLE = "article",
  QUIZ = "quiz",
  CODING_EXERCISE = "coding_exercise",
  ASSIGNMENT = "assignment",
}

export enum EnrollmentStatus {
  ACTIVE = "active",
  COMPLETED = "completed",
  REFUNDED = "refunded",
}

export enum PaymentStatus {
  PENDING = "pending",
  SUCCEEDED = "succeeded",
  FAILED = "failed",
  REFUNDED = "refunded",
}
