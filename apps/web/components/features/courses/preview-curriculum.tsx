"use client";

import { useState } from "react";
import { PlayCircle, FileText, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PreviewModal } from "./preview-modal";
import type { Lesson, Section } from "@/types";

interface SectionWithLessons extends Section {
  lessons: Lesson[];
}

interface Props {
  sectionsWithLessons: SectionWithLessons[];
  lessonsLabel: string;
  previewLabel: string;
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function LessonIcon({ type }: { type: string }) {
  if (type === "video") return <PlayCircle className="h-4 w-4 shrink-0 text-[--color-text-muted]" />;
  if (type === "quiz") return <HelpCircle className="h-4 w-4 shrink-0 text-[--color-text-muted]" />;
  return <FileText className="h-4 w-4 shrink-0 text-[--color-text-muted]" />;
}

export function PreviewCurriculum({ sectionsWithLessons, lessonsLabel, previewLabel }: Props) {
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null);

  return (
    <>
      <Accordion type="multiple" className="mt-4">
        {sectionsWithLessons.map((section) => (
          <AccordionItem key={section.id} value={section.id}>
            <AccordionTrigger className="font-semibold text-[--color-text-primary]">
              <span className="flex-1 text-left">{section.title}</span>
              <span className="mr-4 text-xs font-normal text-[--color-text-muted]">
                {section.lessons.length} {lessonsLabel.toLowerCase()}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="divide-y divide-[--color-border]">
                {section.lessons.map((lesson) => (
                  <li key={lesson.id} className="flex items-center gap-3 py-2.5">
                    <LessonIcon type={lesson.type} />
                    <span className="flex-1 text-sm text-[--color-text-secondary]">
                      {lesson.title}
                    </span>
                    {lesson.is_free_preview && (
                      <button
                        onClick={() => setPreviewLesson(lesson)}
                        className="shrink-0"
                        aria-label={`Preview ${lesson.title}`}
                      >
                        <Badge
                          variant="success"
                          className="cursor-pointer text-xs hover:opacity-80 transition-opacity"
                        >
                          {previewLabel}
                        </Badge>
                      </button>
                    )}
                    {lesson.duration_seconds != null && lesson.duration_seconds > 0 && (
                      <span className="shrink-0 text-xs text-[--color-text-muted]">
                        {formatDuration(lesson.duration_seconds)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <PreviewModal lesson={previewLesson} onClose={() => setPreviewLesson(null)} />
    </>
  );
}
