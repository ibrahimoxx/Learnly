"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { LifeBuoy, Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

interface SupportTicketRow {
  id: string;
  subject: string;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
}

interface SupportTicketReply {
  id: string;
  author_id: string;
  author_role: string;
  author_name: string;
  message: string;
  created_at: string;
}

interface SupportTicketDetail extends SupportTicketRow {
  message: string;
  user_id: string;
  user_name: string;
  user_email: string;
  replies: SupportTicketReply[];
}

const STATUS_FILTERS: { value: TicketStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

function statusVariant(status: TicketStatus): "default" | "secondary" | "success" | "outline" {
  if (status === "open") return "default";
  if (status === "in_progress") return "secondary";
  if (status === "resolved") return "success";
  return "outline";
}

export default function AdminSupportPage() {
  const { getToken } = useAuth();
  const [tickets, setTickets] = useState<SupportTicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TicketStatus | "all">("all");
  const [selected, setSelected] = useState<SupportTicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  async function loadTickets() {
    setLoading(true);
    const token = await getToken();
    try {
      const qs = filter === "all" ? "" : `?status=${filter}`;
      const data = await apiFetch<SupportTicketRow[]>(`/api/v1/admin/support/tickets${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTickets(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, [getToken, filter]);

  async function openTicket(id: string) {
    setDetailLoading(true);
    const token = await getToken();
    try {
      const data = await apiFetch<SupportTicketDetail>(`/api/v1/admin/support/tickets/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelected(data);
    } finally {
      setDetailLoading(false);
    }
  }

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      const token = await getToken();
      const newReply = await apiFetch<SupportTicketReply>(`/api/v1/admin/support/tickets/${selected.id}/reply`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: reply }),
      });
      setSelected((prev) => prev && { ...prev, replies: [...prev.replies, newReply], status: prev.status === "open" ? "in_progress" : prev.status });
      setReply("");
      await loadTickets();
    } finally {
      setSending(false);
    }
  }

  async function updateStatus(status: TicketStatus) {
    if (!selected) return;
    const token = await getToken();
    const updated = await apiFetch<SupportTicketRow>(`/api/v1/admin/support/tickets/${selected.id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    setSelected((prev) => prev && { ...prev, status: updated.status });
    await loadTickets();
  }

  return (
    <div className="p-6">
      <h1 className="mb-5 text-4xl font-black tracking-tight text-[--color-text-primary]">Support Tickets</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); setSelected(null); }}
            className={`rounded-[--radius-md] border px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === f.value
                ? "border-[--color-primary] bg-[--color-primary-subtle] text-[--color-primary]"
                : "border-[--color-border] text-[--color-text-secondary] hover:bg-[--color-surface]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)]">
        <div className="flex flex-col gap-2 self-start">
          {loading ? (
            <>
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-[--radius-md]" />)}
            </>
          ) : tickets.length === 0 ? (
            <div className="premium-card rounded-[--radius-lg] py-12 text-center">
              <LifeBuoy className="mx-auto mb-3 h-10 w-10 text-[--color-text-muted]" />
              <p className="text-sm text-[--color-text-muted]">No tickets in this filter.</p>
            </div>
          ) : (
            tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => openTicket(t.id)}
                className={`group relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-[--radius-md] border px-4 py-3.5 text-left transition-all duration-200 ${
                  selected?.id === t.id
                    ? "border-[--color-primary]/50 bg-linear-to-r from-[--color-primary-subtle] to-white shadow-sm"
                    : "border-[--color-border] bg-white shadow-sm hover:border-[--color-primary]/40 hover:shadow-md hover:-translate-y-0.5"
                }`}
              >
                {selected?.id === t.id && (
                  <span className="absolute left-0 top-0 h-full w-0.5 rounded-full bg-[--color-primary]" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-[--color-text-primary] group-hover:text-[--color-primary] transition-colors duration-150">
                    {t.subject}
                  </p>
                  <p className="mt-0.5 text-xs text-[--color-text-muted]">
                    {new Date(t.updated_at).toLocaleString()}
                  </p>
                </div>
                <Badge variant={statusVariant(t.status)} className="shrink-0">
                  {t.status.replace("_", " ")}
                </Badge>
              </button>
            ))
          )}
        </div>

        <div className="premium-card rounded-[--radius-lg] p-5">
          {detailLoading ? (
            <Skeleton className="h-64 rounded-[--radius-md]" />
          ) : !selected ? (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
              <LifeBuoy className="mb-3 h-10 w-10 text-[--color-text-muted]" />
              <p className="text-sm text-[--color-text-muted]">Select a ticket to view the conversation.</p>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-4 border-b border-[--color-border] pb-3">
                <div>
                  <h2 className="text-lg font-extrabold text-[--color-text-primary]">{selected.subject}</h2>
                  <p className="text-xs text-[--color-text-muted]">{selected.user_name} · {selected.user_email}</p>
                </div>
                <select
                  value={selected.status}
                  onChange={(e) => updateStatus(e.target.value as TicketStatus)}
                  className="rounded-[--radius-md] border border-[--color-border] bg-white px-3 py-1.5 text-xs font-semibold text-[--color-text-primary]"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto py-4">
                <div className="rounded-[--radius-md] border border-[--color-border] bg-[--color-surface] p-3">
                  <p className="text-xs font-semibold text-[--color-text-muted]">{selected.user_name} · {new Date(selected.created_at).toLocaleString()}</p>
                  <p className="mt-1 text-sm text-[--color-text-primary]">{selected.message}</p>
                </div>
                {selected.replies.map((r) => (
                  <div
                    key={r.id}
                    className={`rounded-[--radius-md] border p-3 ${
                      r.author_role === "admin"
                        ? "border-[--color-primary]/30 bg-[--color-primary-subtle]/40"
                        : "border-[--color-border] bg-[--color-surface]"
                    }`}
                  >
                    <p className="text-xs font-semibold text-[--color-text-muted]">{r.author_name} ({r.author_role}) · {new Date(r.created_at).toLocaleString()}</p>
                    <p className="mt-1 text-sm text-[--color-text-primary]">{r.message}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 border-t border-[--color-border] pt-3">
                <Textarea
                  placeholder="Write a reply..."
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={2}
                  className="flex-1"
                />
                <Button onClick={sendReply} disabled={sending || !reply.trim()} className="gap-1.5 self-end">
                  <Send className="h-4 w-4" /> Reply
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
