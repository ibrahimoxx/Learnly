import { CourseLevel, CourseStatus, LessonType } from "./enums";

export interface CourseDTO {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  imageUrl: string | null;
  promoVideoUrl: string | null;
  level: CourseLevel;
  language: string;
  status: CourseStatus;
  isFree: boolean;
  priceInCents: number;
  currency: string;
  totalDurationSeconds: number;
  totalLessons: number;
  rating: number;
  reviewCount: number;
  enrollmentCount: number;
  instructorId: string;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SectionDTO {
  id: string;
  courseId: string;
  title: string;
  objective: string | null;
  position: number;
  lessons: LessonDTO[];
}

export interface LessonDTO {
  id: string;
  sectionId: string;
  title: string;
  type: LessonType;
  position: number;
  durationSeconds: number | null;
  isFreePreview: boolean;
  isDownloadable: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
