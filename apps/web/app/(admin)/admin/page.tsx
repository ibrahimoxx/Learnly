"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Clock3,
  DollarSign,
  Headset,
  ShieldAlert,
  Sparkles,
  UserRoundPlus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";

interface TrendPoint {
  month: string;
  value: number;
}

interface RevenueTrendPoint {
  month: string;
  revenue_cents: number;
}

interface RoleBreakdown {
  role: string;
  count: number;
}

interface CourseStatusBreakdown {
  status: string;
  count: number;
}

interface RecentUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
}

interface RecentCourse {
  id: string;
  title: string;
  slug: string;
  status: string;
  created_at: string;
}

interface AdminOverviewStats {
  total_users: number;
  total_students: number;
  total_instructors: number;
  total_courses: number;
  published_courses: number;
  pending_review_courses: number;
  total_enrollments: number;
  total_revenue_cents: number;
  currency: string;
  open_support_tickets: number;
  user_growth: TrendPoint[];
  enrollment_trend: TrendPoint[];
  revenue_trend: RevenueTrendPoint[];
  role_breakdown: RoleBreakdown[];
  course_status_breakdown: CourseStatusBreakdown[];
  recent_users: RecentUser[];
  recent_courses: RecentCourse[];
}

interface BarDatum {
  month: string;
  value: number;
  label: string;
}

interface BreakdownDatum {
  key: string;
  label: string;
  count: number;
  className: string;
}

interface ChartPoint {
  x: number;
  y: number;
  month: string;
  value: number;
}

const CHART_WIDTH = 640;
const CHART_HEIGHT = 220;
const CHART_LEFT = 56;
const CHART_RIGHT = 612;
const CHART_TOP = 28;
const CHART_BOTTOM = 176;

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-[--color-primary-subtle] text-[--brand-800]",
  instructor: "bg-[--color-accent-sky]/15 text-[--color-accent-sky]",
  student: "bg-[--color-surface] text-[--color-text-secondary]",
};

const STATUS_COLORS: Record<string, string> = {
  archived: "bg-[--color-error]/10 text-[--color-error]",
  draft: "bg-[--color-surface] text-[--color-text-secondary]",
  in_review: "bg-[--color-warning]/10 text-[--color-warning]",
  published: "bg-[--color-success]/10 text-[--color-success]",
};

const QUICK_LINKS = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/courses", label: "Courses" },
  { href: "/admin/revenue", label: "Revenue" },
  { href: "/admin/payouts", label: "Payouts" },
  { href: "/admin/support", label: "Support" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/orgs", label: "Orgs" },
  { href: "/admin/flags", label: "Flags" },
  { href: "/admin/announcements", label: "Announcements" },
  { href: "/admin/affiliates", label: "Affiliates" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/instructor-applications", label: "Applications" },
];

function money(cents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
}

function shortMonth(month: string): string {
  return month.slice(5);
}

function shortDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

function relativeDate(value: string): string {
  const hours = Math.round((new Date(value).getTime() - Date.now()) / 3_600_000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (Math.abs(hours) < 24) {
    return formatter.format(hours, "hour");
  }
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 7) {
    return formatter.format(days, "day");
  }
  return shortDate(value);
}

function displayName(user: RecentUser): string {
  const name = `${user.first_name} ${user.last_name}`.trim();
  return name || user.email;
}

function buildChartPoints(points: TrendPoint[]): ChartPoint[] {
  const max = Math.max(1, ...points.map((point) => point.value));
  return points.map((point, index) => ({
    month: point.month,
    value: point.value,
    x:
      points.length === 1
        ? (CHART_LEFT + CHART_RIGHT) / 2
        : CHART_LEFT + (index * (CHART_RIGHT - CHART_LEFT)) / (points.length - 1),
    y: CHART_BOTTOM - (point.value / max) * (CHART_BOTTOM - CHART_TOP),
  }));
}

function buildLinePath(points: ChartPoint[]): string {
  if (points.length === 0) {
    return "";
  }
  return points.reduce((path, point, index, list) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }
    const previous = list[index - 1]!;
    const controlX = previous.x + (point.x - previous.x) / 2;
    return `${path} C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, "");
}

function buildAreaPath(points: ChartPoint[]): string {
  if (points.length === 0) {
    return "";
  }
  const linePath = buildLinePath(points);
  const first = points[0]!;
  const last = points[points.length - 1]!;
  return `${linePath} L ${last.x} ${CHART_BOTTOM} L ${first.x} ${CHART_BOTTOM} Z`;
}

function sortRoleBreakdown(items: RoleBreakdown[]): BreakdownDatum[] {
  const order = ["student", "instructor", "admin"];
  return order
    .map((role) => items.find((item) => item.role === role))
    .filter((item): item is RoleBreakdown => Boolean(item))
    .map((item) => ({
      key: item.role,
      label: item.role.replace("_", " "),
      count: item.count,
      className: ROLE_COLORS[item.role] ?? "bg-[--color-surface] text-[--color-text-secondary]",
    }));
}

function sortCourseBreakdown(items: CourseStatusBreakdown[]): BreakdownDatum[] {
  const order = ["draft", "in_review", "published", "archived"];
  return order
    .map((status) => items.find((item) => item.status === status))
    .filter((item): item is CourseStatusBreakdown => Boolean(item))
    .map((item) => ({
      key: item.status,
      label: item.status.replace("_", " "),
      count: item.count,
      className: STATUS_COLORS[item.status] ?? "bg-[--color-surface] text-[--color-text-secondary]",
    }));
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-[--radius-lg]" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.6fr_0.9fr]">
        <Skeleton className="h-[380px] rounded-[--radius-xl]" />
        <Skeleton className="h-[380px] rounded-[--radius-xl]" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[260px] rounded-[--radius-xl]" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-[320px] rounded-[--radius-xl]" />
        <Skeleton className="h-[320px] rounded-[--radius-xl]" />
      </div>
    </div>
  );
}

function KpiCard({
  href,
  icon: Icon,
  label,
  value,
  detail,
  accent,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  accent: string;
}) {
  return (
    <Link href={href} className="group hover-lift premium-card sheen-overlay rounded-[--radius-lg] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[--color-text-muted]">{label}</p>
          <p className="mt-3 text-3xl font-black text-[--color-text-primary]">{value}</p>
          <p className="mt-2 text-sm text-[--color-text-secondary]">{detail}</p>
        </div>
        <span className={`inline-flex rounded-full p-3 ${accent}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-[--color-primary]">
        <span>Open</span>
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function GrowthHero({
  data,
  totalStudents,
  totalInstructors,
}: {
  data: TrendPoint[];
  totalStudents: number;
  totalInstructors: number;
}) {
  const hasActivity = data.some((point) => point.value > 0);
  const points = buildChartPoints(data);
  const linePath = buildLinePath(points);
  const areaPath = buildAreaPath(points);
  const first = data[0]?.value ?? 0;
  const latest = data[data.length - 1]?.value ?? 0;
  const change = ((latest - first) / Math.max(first, 1)) * 100;
  const maxValue = Math.max(1, ...data.map((point) => point.value));
  const changePositive = change >= 0;
  const ChangeIcon = changePositive ? ArrowUpRight : ArrowDownRight;
  const gridLines = [1, 0.75, 0.5, 0.25, 0].map((ratio) => ({
    ratio,
    value: Math.round(maxValue * ratio),
    y: CHART_BOTTOM - (CHART_BOTTOM - CHART_TOP) * ratio,
  }));
  const monthLabels = data.map((point) =>
    new Intl.DateTimeFormat(undefined, { month: "short" }).format(new Date(`${point.month}-01T00:00:00Z`))
  );

  return (
    <Link href="/admin/users" className="group premium-card hover-lift rounded-[--radius-xl] p-6">
      <div
        className="relative overflow-hidden rounded-[calc(var(--radius-xl)-4px)] border border-[--color-border] p-6"
        style={{
          background:
            "radial-gradient(circle at 10% 12%, rgba(124, 58, 237, 0.10), transparent 26%), radial-gradient(circle at 88% 18%, rgba(56, 189, 248, 0.12), transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,246,255,0.94))",
        }}
      >
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[--color-text-muted]">Platform growth</p>
            <h2 className="mt-3 text-3xl font-black text-[--color-text-primary]">User curve</h2>
            <p className="mt-2 max-w-2xl text-sm text-[--color-text-secondary]">
              Trailing 12 months. Zero-filled inactive periods, stable monthly frame.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider ${
                changePositive
                  ? "bg-[--color-success]/10 text-[--color-success]"
                  : "bg-[--color-error]/10 text-[--color-error]"
              }`}
            >
              <ChangeIcon className="h-3.5 w-3.5" />
              {`${Math.abs(change).toFixed(1)}%`}
            </span>
            <span className="rounded-full border border-[--color-border] bg-white/70 px-3 py-1 text-xs font-semibold text-[--color-text-secondary]">
              vs 11 months back
            </span>
          </div>
        </div>

        {!hasActivity ? (
          <div className="relative mt-8 rounded-[--radius-lg] border border-[--color-border] bg-white/72 p-6 text-sm text-[--color-text-muted]">
            No signup growth yet.
          </div>
        ) : (
          <>
            <div className="relative mt-8 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-[--radius-lg] border border-[--color-border] bg-white/76 p-4">
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[--color-text-muted]">Latest month</p>
                  <p className="mt-3 text-4xl font-black text-[--color-text-primary]">{latest.toLocaleString()}</p>
                  <p className="mt-2 text-sm text-[--color-text-secondary]">New user accounts</p>
                </div>
                <div className="rounded-[--radius-lg] border border-[--color-border] bg-white/76 p-4">
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[--color-text-muted]">Students</p>
                  <p className="mt-3 text-2xl font-black text-[--color-text-primary]">{totalStudents.toLocaleString()}</p>
                  <p className="mt-2 text-sm text-[--color-text-secondary]">Current learner base</p>
                </div>
                <div className="rounded-[--radius-lg] border border-[--color-border] bg-white/76 p-4">
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[--color-text-muted]">Instructors</p>
                  <p className="mt-3 text-2xl font-black text-[--color-text-primary]">{totalInstructors.toLocaleString()}</p>
                  <p className="mt-2 text-sm text-[--color-text-secondary]">Supply-side growth</p>
                </div>
              </div>

              <div className="rounded-[--radius-lg] border border-[--color-border] bg-white/72 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[--color-text-muted]">
                    Monthly signups
                  </p>
                  <p className="text-sm font-semibold text-[--color-text-secondary]">{data.length} months</p>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <div className="min-w-[640px]">
                    <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="h-60 w-full">
                      <defs>
                        <linearGradient id="admin-growth-line" x1="0%" x2="100%" y1="0%" y2="0%">
                          <stop offset="0%" stopColor="rgba(109, 40, 217, 0.92)" />
                          <stop offset="100%" stopColor="rgba(14, 165, 233, 0.92)" />
                        </linearGradient>
                        <linearGradient id="admin-growth-area" x1="0%" x2="0%" y1="0%" y2="100%">
                          <stop offset="0%" stopColor="rgba(109, 40, 217, 0.18)" />
                          <stop offset="100%" stopColor="rgba(109, 40, 217, 0.02)" />
                        </linearGradient>
                      </defs>

                      {gridLines.map((line) => (
                        <g key={line.ratio}>
                          <line
                            x1={CHART_LEFT}
                            x2={CHART_RIGHT}
                            y1={line.y}
                            y2={line.y}
                            stroke="rgba(54, 39, 94, 0.11)"
                            strokeDasharray={line.ratio === 0 ? "0" : "4 6"}
                          />
                          <text
                            x="4"
                            y={line.y + 4}
                            fill="rgba(79, 70, 101, 0.72)"
                            fontSize="11"
                            fontWeight="700"
                          >
                            {line.value.toLocaleString()}
                          </text>
                        </g>
                      ))}

                      {points.map((point) => (
                        <line
                          key={point.month}
                          x1={point.x}
                          x2={point.x}
                          y1={CHART_TOP}
                          y2={CHART_BOTTOM}
                          stroke="rgba(54, 39, 94, 0.05)"
                        />
                      ))}

                      <path d={areaPath} fill="url(#admin-growth-area)" />
                      <path
                        d={linePath}
                        fill="none"
                        stroke="url(#admin-growth-line)"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={4}
                      />
                      {points.map((point) => (
                        <g key={point.month}>
                          <circle cx={point.x} cy={point.y} r="5" fill="white" stroke="rgba(109, 40, 217, 0.35)" strokeWidth="2" />
                          <circle cx={point.x} cy={point.y} r="10" fill="rgba(109, 40, 217, 0.10)" />
                        </g>
                      ))}
                    </svg>

                    <div className="mt-2 flex gap-2 pl-14">
                      {monthLabels.map((label, index) => (
                        <span
                          key={`${label}-${data[index]?.month ?? index}`}
                          className="flex-1 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-[--color-text-muted]"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative mt-5 flex items-center gap-2 text-sm font-semibold text-[--color-primary]">
              <span>Open user management</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </>
        )}
      </div>
    </Link>
  );
}

function QuickLinkDeck() {
  return (
    <div className="premium-card rounded-[--radius-xl] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[--color-text-muted]">Control map</p>
          <h2 className="mt-3 text-2xl font-black text-[--color-text-primary]">Admin lanes</h2>
        </div>
        <Sparkles className="h-5 w-5 text-[--color-primary]" />
      </div>
      <p className="mt-2 text-sm text-[--color-text-secondary]">
        Fast links for review, revenue, support, policy, growth.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group rounded-[--radius-lg] border border-[--color-border] bg-[--color-surface-raised] px-4 py-3 text-sm font-semibold text-[--color-text-secondary] transition-all hover:border-[--color-primary] hover:bg-[--color-primary-subtle]/50 hover:text-[--color-text-primary]"
          >
            <span className="flex items-center justify-between gap-2">
              {link.label}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function BarTrendCard({
  title,
  href,
  description,
  data,
  accent,
  empty,
}: {
  title: string;
  href?: string;
  description: string;
  data: BarDatum[];
  accent: string;
  empty: string;
}) {
  const max = Math.max(1, ...data.map((item) => item.value));
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[--color-text-muted]">{title}</p>
          <p className="mt-2 text-sm text-[--color-text-secondary]">{description}</p>
        </div>
        {href ? <ArrowRight className="h-4 w-4 text-[--color-primary]" /> : null}
      </div>
      {data.length === 0 ? (
        <p className="mt-16 text-sm text-[--color-text-muted]">{empty}</p>
      ) : (
        <div className="mt-8 flex h-44 items-end gap-2">
          {data.map((item) => (
            <div key={item.month} className="flex flex-1 flex-col items-center gap-2">
              <div
                className={`w-full rounded-t-[--radius-sm] ${accent}`}
                style={{ height: `${Math.max(8, (item.value / max) * 132)}px` }}
                title={item.label}
              />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[--color-text-muted]">
                {shortMonth(item.month)}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (!href) {
    return <div className="premium-card rounded-[--radius-xl] p-6">{content}</div>;
  }

  return (
    <Link href={href} className="group premium-card hover-lift rounded-[--radius-xl] p-6">
      {content}
    </Link>
  );
}

function BreakdownCard({
  title,
  href,
  items,
  empty,
}: {
  title: string;
  href: string;
  items: BreakdownDatum[];
  empty: string;
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <Link href={href} className="group premium-card hover-lift rounded-[--radius-xl] p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[--color-text-muted]">{title}</p>
          <p className="mt-2 text-3xl font-black text-[--color-text-primary]">{total.toLocaleString()}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-[--color-primary]" />
      </div>
      {items.length === 0 ? (
        <p className="mt-16 text-sm text-[--color-text-muted]">{empty}</p>
      ) : (
        <>
          <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-[--color-surface]">
            {items.map((item) => (
              <div
                key={item.key}
                className={item.className.split(" ")[0]}
                style={{ width: `${total === 0 ? 0 : (item.count / total) * 100}%` }}
              />
            ))}
          </div>
          <div className="mt-6 space-y-4">
            {items.map((item) => {
              const width = total === 0 ? 0 : (item.count / total) * 100;
              return (
                <div key={item.key}>
                  <div className="flex items-center justify-between gap-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${item.className}`}>
                      {item.label}
                    </span>
                    <span className="text-sm font-semibold text-[--color-text-secondary]">
                      {item.count.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-[--color-surface]">
                    <div
                      className={`h-2 rounded-full ${item.className.split(" ")[0]}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Link>
  );
}

function RecentUsersPanel({ users }: { users: RecentUser[] }) {
  return (
    <Link href="/admin/users" className="group premium-card hover-lift rounded-[--radius-xl] p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[--color-text-muted]">Recent signups</p>
          <h2 className="mt-2 text-2xl font-black text-[--color-text-primary]">Newest accounts</h2>
        </div>
        <UserRoundPlus className="h-5 w-5 text-[--color-primary]" />
      </div>
      {users.length === 0 ? (
        <p className="mt-16 text-sm text-[--color-text-muted]">No signups yet.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {users.map((user) => (
            <div key={user.id} className="rounded-[--radius-lg] border border-[--color-border] bg-[--color-surface-raised] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[--color-text-primary]">{displayName(user)}</p>
                  <p className="mt-1 truncate text-sm text-[--color-text-muted]">{user.email}</p>
                </div>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${ROLE_COLORS[user.role] ?? "bg-[--color-surface] text-[--color-text-secondary]"}`}>
                  {user.role}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-[--color-text-muted]">
                <span>{relativeDate(user.created_at)}</span>
                <span>{shortDate(user.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-[--color-primary]">
        <span>View all</span>
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function RecentCoursesPanel({ courses }: { courses: RecentCourse[] }) {
  return (
    <Link href="/admin/courses" className="group premium-card hover-lift rounded-[--radius-xl] p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[--color-text-muted]">Recent submissions</p>
          <h2 className="mt-2 text-2xl font-black text-[--color-text-primary]">Review queue</h2>
        </div>
        <ShieldAlert className="h-5 w-5 text-[--color-warning]" />
      </div>
      {courses.length === 0 ? (
        <p className="mt-16 text-sm text-[--color-text-muted]">No submissions yet.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {courses.map((course) => (
            <div key={course.id} className="rounded-[--radius-lg] border border-[--color-border] bg-[--color-surface-raised] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[--color-text-primary]">{course.title}</p>
                  <p className="mt-1 truncate text-sm text-[--color-text-muted]">/{course.slug}</p>
                </div>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${STATUS_COLORS[course.status] ?? "bg-[--color-surface] text-[--color-text-secondary]"}`}>
                  {course.status.replace("_", " ")}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-[--color-text-muted]">
                <span>{relativeDate(course.created_at)}</span>
                <span>{shortDate(course.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-[--color-primary]">
        <span>View all</span>
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

export default function AdminOverviewPage() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const token = await getToken();
      try {
        const result = await apiFetch<AdminOverviewStats>("/api/v1/admin/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) {
          setStats(result);
          setError(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          toast.error("Failed to load admin overview.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  if (loading) {
    return (
      <div className="premium-shell min-h-screen p-6">
        <h1 className="mb-6 text-4xl font-black tracking-tight text-[--color-text-primary]">Overview</h1>
        <OverviewSkeleton />
      </div>
    );
  }

  if (!stats || error) {
    return (
      <div className="premium-shell min-h-screen p-6">
        <h1 className="mb-6 text-4xl font-black tracking-tight text-[--color-text-primary]">Overview</h1>
        <div className="premium-card rounded-[--radius-xl] p-10 text-center">
          <p className="text-lg font-semibold text-[--color-text-primary]">Overview unavailable</p>
          <p className="mt-2 text-sm text-[--color-text-muted]">Refresh page, then retry admin stats fetch.</p>
        </div>
      </div>
    );
  }

  const userGrowth = stats.user_growth.slice(-12);
  const enrollmentTrend = stats.enrollment_trend.slice(-12);
  const revenueTrend = stats.revenue_trend.slice(-12);
  const roleBreakdown = sortRoleBreakdown(stats.role_breakdown);
  const courseBreakdown = sortCourseBreakdown(stats.course_status_breakdown);
  const revenueBars = revenueTrend.map((point) => ({
    month: point.month,
    value: point.revenue_cents,
    label: money(point.revenue_cents, stats.currency),
  }));
  const enrollmentBars = enrollmentTrend.map((point) => ({
    month: point.month,
    value: point.value,
    label: `${point.value.toLocaleString()} enrollments`,
  }));

  const kpis = [
    {
      href: "/admin/users",
      icon: Users,
      label: "Total users",
      value: stats.total_users.toLocaleString(),
      detail: `${stats.total_students.toLocaleString()} students · ${stats.total_instructors.toLocaleString()} instructors`,
      accent: "bg-[--color-accent-sky]/15 text-[--color-accent-sky]",
    },
    {
      href: "/admin/courses",
      icon: BookOpen,
      label: "Total courses",
      value: stats.total_courses.toLocaleString(),
      detail: `${stats.published_courses.toLocaleString()} published live`,
      accent: "bg-[--color-primary]/10 text-[--color-primary]",
    },
    {
      href: "/admin/courses",
      icon: Clock3,
      label: "Pending review",
      value: stats.pending_review_courses.toLocaleString(),
      detail: "Submissions waiting for moderation",
      accent: "bg-[--color-warning]/10 text-[--color-warning]",
    },
    {
      href: "/admin/revenue",
      icon: DollarSign,
      label: "Revenue",
      value: money(stats.total_revenue_cents, stats.currency),
      detail: `${stats.total_enrollments.toLocaleString()} paid or active enrollments`,
      accent: "bg-[--color-success]/10 text-[--color-success]",
    },
    {
      href: "/admin/support",
      icon: Headset,
      label: "Open support",
      value: stats.open_support_tickets.toLocaleString(),
      detail: "Open plus in-progress tickets",
      accent: "bg-[--color-error]/10 text-[--color-error]",
    },
  ];

  return (
    <div className="premium-shell min-h-screen space-y-6 p-6">
      <h1 className="text-4xl font-black tracking-tight text-[--color-text-primary]">Overview</h1>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.6fr_0.9fr]">
        <GrowthHero
          data={userGrowth}
          totalStudents={stats.total_students}
          totalInstructors={stats.total_instructors}
        />
        <QuickLinkDeck />
      </section>

      <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        <BarTrendCard
          title="Revenue trend"
          href="/admin/revenue"
          description="Last 12 active months"
          data={revenueBars}
          accent="bg-[--color-primary]"
          empty="No revenue yet."
        />
        <BarTrendCard
          title="Enrollment trend"
          description="Last 12 active months"
          data={enrollmentBars}
          accent="bg-[--color-accent-sky]"
          empty="No enrollments yet."
        />
        <BreakdownCard
          title="Role mix"
          href="/admin/users"
          items={roleBreakdown}
          empty="No user roles yet."
        />
        <BreakdownCard
          title="Course states"
          href="/admin/courses"
          items={courseBreakdown}
          empty="No course states yet."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <RecentUsersPanel users={stats.recent_users} />
        <RecentCoursesPanel courses={stats.recent_courses} />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Link href="/admin/affiliates" className="premium-card hover-lift rounded-[--radius-lg] p-5">
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[--color-text-muted]">Affiliates</p>
          <p className="mt-3 text-lg font-black text-[--color-text-primary]">Review payout funnel</p>
          <p className="mt-2 text-sm text-[--color-text-secondary]">Links, codes, conversion flow.</p>
        </Link>
        <Link href="/admin/payouts" className="premium-card hover-lift rounded-[--radius-lg] p-5">
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[--color-text-muted]">Payouts</p>
          <p className="mt-3 text-lg font-black text-[--color-text-primary]">Audit outgoing cash</p>
          <p className="mt-2 text-sm text-[--color-text-secondary]">Instructor transfers, payout timing.</p>
        </Link>
        <Link href="/admin/announcements" className="premium-card hover-lift rounded-[--radius-lg] p-5">
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[--color-text-muted]">Announcements</p>
          <p className="mt-3 text-lg font-black text-[--color-text-primary]">Broadcast platform updates</p>
          <p className="mt-2 text-sm text-[--color-text-secondary]">Campaigns, notices, reminders.</p>
        </Link>
        <Link href="/admin/instructor-applications" className="premium-card hover-lift rounded-[--radius-lg] p-5">
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[--color-text-muted]">Applications</p>
          <p className="mt-3 text-lg font-black text-[--color-text-primary]">Screen new instructors</p>
          <p className="mt-2 text-sm text-[--color-text-secondary]">Approve, reject, route talent.</p>
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Link href="/admin/categories" className="premium-card hover-lift rounded-[--radius-lg] p-5">
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[--color-text-muted]">Categories</p>
          <p className="mt-3 text-lg font-black text-[--color-text-primary]">Shape catalog taxonomy</p>
        </Link>
        <Link href="/admin/orgs" className="premium-card hover-lift rounded-[--radius-lg] p-5">
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[--color-text-muted]">Orgs</p>
          <p className="mt-3 text-lg font-black text-[--color-text-primary]">Track organization accounts</p>
        </Link>
        <Link href="/admin/flags" className="premium-card hover-lift rounded-[--radius-lg] p-5">
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[--color-text-muted]">Flags</p>
          <p className="mt-3 text-lg font-black text-[--color-text-primary]">Moderation risk queue</p>
        </Link>
        <Link href="/admin/coupons" className="premium-card hover-lift rounded-[--radius-lg] p-5">
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[--color-text-muted]">Coupons</p>
          <p className="mt-3 text-lg font-black text-[--color-text-primary]">Price campaign controls</p>
        </Link>
      </section>
    </div>
  );
}
