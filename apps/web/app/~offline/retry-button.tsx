"use client";

export function RetryButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="rounded-[--radius-sm] bg-[--color-primary] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[--color-primary-hover] transition-colors"
    >
      Try again
    </button>
  );
}
