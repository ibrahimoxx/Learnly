"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";

interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-[--color-primary-subtle] text-[--brand-800]",
  instructor: "bg-[--color-accent-sky]/15 text-[--color-accent-sky]",
  student: "bg-[--color-surface] text-[--color-text-secondary]",
};

export default function AdminUsersPage() {
  const { getToken } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const token = await getToken();
      try {
        const data = await apiFetch<AdminUser[]>("/api/v1/admin/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getToken]);

  async function toggleActive(userId: string, current: boolean) {
    setUpdating(userId);
    const token = await getToken();
    try {
      const updated = await apiFetch<AdminUser>(`/api/v1/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_active: !current }),
      });
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      toast.success(updated.is_active ? "User activated" : "User suspended");
    } catch {
      toast.error("Failed to update user");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-5 text-4xl font-black tracking-tight text-[--color-text-primary]">User Management</h1>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-[--radius-md]" />)}
        </div>
      ) : (
        <div className="premium-card rounded-[--radius-lg]">
          <table className="w-full text-sm">
            <thead className="border-b border-[--color-border] bg-[--color-surface]">
              <tr>
                {["Name", "Email", "Role", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[--color-text-muted]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[--color-border]">
              {users.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-[--color-primary-subtle]/40">
                  <td className="px-4 py-3 font-medium text-[--color-text-primary]">
                    {u.first_name} {u.last_name}
                  </td>
                  <td className="px-4 py-3 text-[--color-text-muted] max-w-[200px] truncate">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${ROLE_COLORS[u.role] ?? "bg-[--color-surface] text-[--color-text-secondary]"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold ${u.is_active ? "text-[--color-success]" : "text-[--color-error]"}`}>
                      {u.is_active ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(u.id, u.is_active)}
                      disabled={updating === u.id}
                      className={`rounded border px-2.5 py-1 text-xs font-semibold disabled:opacity-50 transition-colors ${
                        u.is_active
                          ? "border-[--color-error]/30 text-[--color-error] hover:bg-[--color-error]/10"
                          : "border-[--color-success]/30 text-[--color-success] hover:bg-[--color-success]/10"
                      }`}
                    >
                      {updating === u.id ? "…" : u.is_active ? "Suspend" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
