import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// YouTube only guarantees hqdefault.jpg exists for all public videos.
// maxresdefault.jpg 404s for lower-resolution uploads — swap proactively.
export function normalizeYtThumbnail(url: string): string {
  if (!url) return url;
  return url.replace("maxresdefault.jpg", "hqdefault.jpg");
}
