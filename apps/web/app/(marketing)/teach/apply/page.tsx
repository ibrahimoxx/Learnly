"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { ChevronRight, Loader2, CheckCircle2, XCircle, Clock, ArrowLeft, RotateCcw } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface ApplicationStatus {
  status: "pending" | "approved" | "rejected" | "withdrawn";
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  expertise: string;
  experience: string;
  course_ideas: string;
  motivation: string;
  website: string | null;
  linkedin: string | null;
}

export default function TeachApplyPage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<"check" | "form" | "submitted">("check");
  const [existing, setExisting] = useState<ApplicationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    expertise: "",
    experience: "",
    course_ideas: "",
    motivation: "",
    website: "",
    linkedin: "",
  });

  // Check existing application on mount
  useEffect(() => {
    async function checkExisting() {
      if (!isLoaded || !user) return;
      const role = user.publicMetadata?.role as string | undefined;
      if (role === "instructor" || role === "admin") {
        router.push("/instructor/courses");
        return;
      }
      setLoading(true);
      try {
        const token = await getToken();
        const data = await apiFetch<ApplicationStatus | null>("/api/v1/instructor-applications/my", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (data) {
          setExisting(data);
          setStep("submitted");
        } else {
          setStep("form");
        }
      } catch {
        setStep("form");
      } finally {
        setLoading(false);
      }
    }
    checkExisting();
  }, [isLoaded, user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!user) { router.push("/sign-up"); return; }
    setLoading(true);
    try {
      const token = await getToken();
      const data = await apiFetch<ApplicationStatus>("/api/v1/instructor-applications", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      setExisting(data);
      setStep("submitted");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg.includes("already") ? "Application already submitted." : msg);
    } finally {
      setLoading(false);
    }
  }

  if (!isLoaded || (step === "check" && loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[--color-primary]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <h2 className="text-xl font-bold">Sign in to apply</h2>
        <Link href="/sign-in" className="rounded-full bg-[--color-primary] px-6 py-2.5 text-sm font-bold text-white">
          Sign in
        </Link>
      </div>
    );
  }

  function handleReapply() {
    if (existing) {
      setForm({
        expertise: existing.expertise,
        experience: existing.experience,
        course_ideas: existing.course_ideas,
        motivation: existing.motivation,
        website: existing.website ?? "",
        linkedin: existing.linkedin ?? "",
      });
    }
    setExisting(null);
    setError("");
    setStep("form");
  }

  if (step === "submitted" && existing) {
    return <ApplicationStatusCard status={existing} onReapply={handleReapply} />;
  }

  return (
    <div className="min-h-screen bg-white">
      <div
        className="px-4 py-10 text-white sm:px-6"
        style={{ background: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)" }}
      >
        <div className="mx-auto max-w-2xl">
          <Link href="/teach" className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white/90">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to instructor page
          </Link>
          <h1 className="text-3xl font-black">Apply to become an instructor</h1>
          <p className="mt-2 text-white/70 text-sm">
            Fill out the form below. Our team reviews every application and responds within 3–5 business days.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="space-y-6">
          <Field
            label="What is your area of expertise?"
            hint="e.g. Web development, Data science, Graphic design, Business, etc."
            required
          >
            <textarea
              value={form.expertise}
              onChange={(e) => setForm((f) => ({ ...f, expertise: e.target.value }))}
              rows={3}
              minLength={20}
              maxLength={1000}
              required
              className={textareaClass}
              placeholder="Describe your expertise in detail..."
            />
          </Field>

          <Field
            label="Tell us about your professional experience"
            hint="Include relevant work experience, certifications, or credentials."
            required
          >
            <textarea
              value={form.experience}
              onChange={(e) => setForm((f) => ({ ...f, experience: e.target.value }))}
              rows={4}
              minLength={20}
              maxLength={2000}
              required
              className={textareaClass}
              placeholder="Describe your professional background..."
            />
          </Field>

          <Field
            label="What course(s) do you plan to create?"
            hint="Give us a brief overview of the course topics you want to teach."
            required
          >
            <textarea
              value={form.course_ideas}
              onChange={(e) => setForm((f) => ({ ...f, course_ideas: e.target.value }))}
              rows={4}
              minLength={20}
              maxLength={2000}
              required
              className={textareaClass}
              placeholder="e.g. A complete course on React 18, a Python for beginners course..."
            />
          </Field>

          <Field
            label="Why do you want to teach on Learnly?"
            hint="Tell us your motivation and teaching goals."
            required
          >
            <textarea
              value={form.motivation}
              onChange={(e) => setForm((f) => ({ ...f, motivation: e.target.value }))}
              rows={3}
              minLength={20}
              maxLength={2000}
              required
              className={textareaClass}
              placeholder="Share your motivation..."
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Personal website" hint="Optional">
              <input
                type="url"
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                className={inputClass}
                placeholder="https://yoursite.com"
              />
            </Field>
            <Field label="LinkedIn profile" hint="Optional">
              <input
                type="url"
                value={form.linkedin}
                onChange={(e) => setForm((f) => ({ ...f, linkedin: e.target.value }))}
                className={inputClass}
                placeholder="https://linkedin.com/in/..."
              />
            </Field>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        )}

        <div className="mt-8 flex items-center gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
            {loading ? "Submitting…" : "Submit application"}
          </button>
          <Link href="/teach" className="text-sm text-[--color-text-muted] hover:underline">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function ApplicationStatusCard({
  status,
  onReapply,
}: {
  status: ApplicationStatus;
  onReapply: () => void;
}) {
  const isPending = status.status === "pending";
  const isApproved = status.status === "approved";
  const isRejected = status.status === "rejected";

  if (isRejected) {
    return (
      <div className="min-h-screen bg-white">
        <div
          className="px-4 py-10 text-white sm:px-6"
          style={{ background: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)" }}
        >
          <div className="mx-auto max-w-2xl">
            <Link href="/teach" className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white/90">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to instructor page
            </Link>
            <h1 className="text-3xl font-black">Your application wasn&apos;t approved</h1>
            <p className="mt-2 text-white/70 text-sm">
              Don&apos;t worry — you can address the feedback below and submit a new application.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
          <div className="flex items-start gap-4 rounded-2xl border border-red-100 bg-red-50 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900">Application not approved</h2>
              {status.rejection_reason ? (
                <p className="mt-1.5 text-sm text-gray-700">
                  <span className="font-bold">Reason: </span>
                  {status.rejection_reason}
                </p>
              ) : (
                <p className="mt-1.5 text-sm text-gray-700">No specific reason was provided.</p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Reviewed on {new Date(status.reviewed_at ?? status.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onReapply}
              className="flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-black text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}
            >
              <RotateCcw className="h-4 w-4" />
              Submit a new application
            </button>
            <Link href="/" className="text-sm text-[--color-text-muted] hover:underline">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-20">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-xl">
        {isPending && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
            <h2 className="mt-5 text-xl font-black text-gray-900">Application under review</h2>
            <p className="mt-2 text-sm text-gray-500">
              Your application was submitted successfully. Our team will review it within 3–5 business days.
            </p>
          </>
        )}
        {isApproved && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="mt-5 text-xl font-black text-gray-900">Application approved!</h2>
            <p className="mt-2 text-sm text-gray-500">
              Congratulations! Your instructor account is now active. Sign out and sign back in to access your dashboard.
            </p>
            <Link
              href="/instructor/courses"
              className="mt-6 inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}
            >
              Go to dashboard <ChevronRight className="h-4 w-4" />
            </Link>
          </>
        )}
        <Link href="/" className="mt-6 inline-block text-sm text-[--color-text-muted] hover:underline">
          Back to home
        </Link>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-bold text-gray-900">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {hint && <p className="mb-2 text-xs text-gray-400">{hint}</p>}
      {children}
    </div>
  );
}

const textareaClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors resize-none";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors";
