"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { LifeBuoy, Plus, Send, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AccountSubnav } from "@/components/shared/account-subnav";
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

function statusVariant(status: TicketStatus): "default" | "secondary" | "success" | "outline" {
  if (status === "open") return "default";
  if (status === "in_progress") return "secondary";
  if (status === "resolved") return "success";
  return "outline";
}

export default function StudentSupportPage() {
  const { getToken } = useAuth();
  const [tickets, setTickets] = useState<SupportTicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SupportTicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadTickets() {
    const token = await getToken();
    try {
      const data = await apiFetch<SupportTicketRow[]>("/api/v1/support/tickets", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTickets(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, [getToken]);

  async function openTicket(id: string) {
    setShowForm(false);
    setDetailLoading(true);
    try {
      const token = await getToken();
      const data = await apiFetch<SupportTicketDetail>(`/api/v1/support/tickets/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelected(data);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = await getToken();
      const created = await apiFetch<SupportTicketRow>("/api/v1/support/tickets", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject, message }),
      });
      setSubject("");
      setMessage("");
      setShowForm(false);
      await loadTickets();
      await openTicket(created.id);
      toast.success("Support ticket submitted");
    } catch {
      toast.error("Couldn't submit your ticket. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      const token = await getToken();
      const newReply = await apiFetch<SupportTicketReply>(`/api/v1/support/tickets/${selected.id}/reply`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: reply }),
      });
      setSelected((prev) => prev && { ...prev, replies: [...prev.replies, newReply] });
      setReply("");
    } catch {
      toast.error("Couldn't send your reply. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="premium-shell min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <span className="inline-flex rounded-full bg-[--color-primary-subtle] px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-[--brand-800]">
          Account settings
        </span>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-[--color-text-primary]">Support</h1>
        <p className="mt-2 text-[--color-text-secondary]">Get help from the Skillforge team.</p>

        <div className="mt-8">
          <AccountSubnav />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className={`space-y-2 md:col-span-1 ${selected || showForm ? "hidden md:block" : ""}`}>
            <Button onClick={() => { setShowForm(true); setSelected(null); }} className="w-full gap-1.5">
              <Plus className="h-4 w-4" /> New ticket
            </Button>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-[--radius-md]" />)}
              </div>
            ) : tickets.length === 0 ? (
              <p className="px-1 text-xs text-[--color-text-muted]">No tickets yet — open one if you need help.</p>
            ) : (
              tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => openTicket(t.id)}
                  className={`hover-lift premium-card flex w-full items-center justify-between gap-2 rounded-[--radius-md] p-3 text-left transition-all ${
                    selected?.id === t.id ? "ring-2 ring-[--color-primary]" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-[--color-text-primary]">{t.subject}</p>
                    <p className="text-xs text-[--color-text-muted]">{new Date(t.updated_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={statusVariant(t.status)}>{t.status.replace("_", " ")}</Badge>
                </button>
              ))
            )}
          </div>

          <div className={`md:col-span-2 ${selected || showForm ? "" : "hidden md:block"}`}>
            {showForm ? (
              <form onSubmit={handleCreate} className="premium-card rounded-[--radius-lg] p-5">
                <button onClick={() => setShowForm(false)} className="mb-3 flex items-center gap-2 text-sm text-[--color-text-secondary] md:hidden" type="button">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <h2 className="mb-3 text-sm font-extrabold text-[--color-text-primary]">New support ticket</h2>
                <div className="space-y-3">
                  <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
                  <Textarea placeholder="Describe your issue..." value={message} onChange={(e) => setMessage(e.target.value)} required rows={5} />
                  <Button type="submit" disabled={submitting} className="gap-1.5">
                    <Send className="h-4 w-4" /> Submit
                  </Button>
                </div>
              </form>
            ) : detailLoading ? (
              <Skeleton className="h-64 rounded-[--radius-md]" />
            ) : !selected ? (
              <div className="premium-card flex h-full min-h-[300px] flex-col items-center justify-center gap-3 rounded-[--radius-lg] p-6 text-center">
                <LifeBuoy className="h-10 w-10 text-[--color-text-muted]" />
                <p className="font-extrabold text-[--color-text-secondary]">Select a ticket or open a new one</p>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4" /> New ticket
                </Button>
              </div>
            ) : (
              <div className="premium-card flex h-full flex-col rounded-[--radius-lg] p-4">
                <div className="flex items-center justify-between gap-3 border-b border-[--color-border] pb-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSelected(null)} className="md:hidden" aria-label="Back to tickets">
                      <ArrowLeft className="h-5 w-5 text-[--color-text-secondary]" />
                    </button>
                    <h2 className="font-extrabold text-[--color-text-primary]">{selected.subject}</h2>
                  </div>
                  <Badge variant={statusVariant(selected.status)}>{selected.status.replace("_", " ")}</Badge>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto py-4">
                  <div className="rounded-[--radius-md] border border-[--color-border] bg-[--color-surface] p-3">
                    <p className="text-xs font-semibold text-[--color-text-muted]">You · {new Date(selected.created_at).toLocaleString()}</p>
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
                      <p className="text-xs font-semibold text-[--color-text-muted]">
                        {r.author_role === "admin" ? "Skillforge Support" : "You"} · {new Date(r.created_at).toLocaleString()}
                      </p>
                      <p className="mt-1 text-sm text-[--color-text-primary]">{r.message}</p>
                    </div>
                  ))}
                </div>

                {selected.status !== "closed" && (
                  <div className="flex items-end gap-2 border-t border-[--color-border] pt-3">
                    <Textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Write a reply..."
                      rows={2}
                      className="flex-1"
                    />
                    <Button onClick={sendReply} disabled={sending || !reply.trim()}>
                      <Send className="h-4 w-4" /> Send
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
