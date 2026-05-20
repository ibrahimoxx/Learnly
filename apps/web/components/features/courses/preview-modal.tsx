"use client";

import { PlayCircle, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Lesson } from "@/types";

interface Props {
  lesson: Lesson | null;
  onClose: () => void;
}

export function PreviewModal({ lesson, onClose }: Props) {
  return (
    <Dialog open={!!lesson} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-[oklch(10%_0.02_295)] border-white/10">
        {lesson && (
          <>
            <DialogHeader className="px-5 pt-5 pb-3">
              <DialogTitle className="text-white text-base font-semibold leading-snug">
                {lesson.title}
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[--color-primary]/20 px-2 py-0.5 text-xs text-[--color-primary] font-medium align-middle">
                  Free Preview
                </span>
              </DialogTitle>
            </DialogHeader>

            {lesson.type === "video" ? (
              <VideoPreview lesson={lesson} />
            ) : lesson.type === "article" ? (
              <ArticlePreview lesson={lesson} />
            ) : (
              <QuizPreviewLock />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function VideoPreview({ lesson }: { lesson: Lesson }) {
  if (!lesson.video_url) {
    return (
      <div className="flex aspect-video items-center justify-center bg-black">
        <div className="text-center text-white/40">
          <PlayCircle className="mx-auto h-12 w-12 mb-2" />
          <p className="text-sm">Video not yet available</p>
        </div>
      </div>
    );
  }
  return (
    <video
      src={lesson.video_url}
      controls
      autoPlay
      className="w-full aspect-video bg-black"
    />
  );
}

function ArticlePreview({ lesson }: { lesson: Lesson }) {
  return (
    <div className="px-6 pb-6 max-h-[60vh] overflow-y-auto">
      {lesson.content ? (
        <div className="prose prose-invert prose-sm max-w-none text-white/80">
          {lesson.content}
        </div>
      ) : (
        <p className="text-sm text-white/40">Content coming soon.</p>
      )}
    </div>
  );
}

function QuizPreviewLock() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <Lock className="h-10 w-10 text-white/20" />
      <p className="text-sm text-white/50">Enroll to take this quiz.</p>
    </div>
  );
}
