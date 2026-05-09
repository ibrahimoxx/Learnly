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
  admin: "bg-purple-100 text-purple-700",
  instructor: "bg-blue-100 text-blue-700",
  student: "bg-gray-100 text-gray-600",
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
      <h1 className="text-xl font-bold text-[--color-text-primary] mb-5">User Management</h1>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-[--radius-md]" />)}
        </div>
      ) : (
        <div className="rounded-[--radius-md] border border-[--color-border] bg-white overflow-hidden">
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
                <tr key={u.id} className="hover:bg-[--color-surface]/50">
                  <td className="px-4 py-3 font-medium text-[--color-text-primary]">
                    {u.first_name} {u.last_name}
                  </td>
                  <td className="px-4 py-3 text-[--color-text-muted] max-w-[200px] truncate">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${ROLE_COLORS[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${u.is_active ? "text-green-600" : "text-red-500"}`}>
                      {u.is_active ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(u.id, u.is_active)}
                      disabled={updating === u.id}
                      className={`rounded border px-2.5 py-1 text-xs font-semibold disabled:opacity-50 transition-colors ${
                        u.is_active
                          ? "border-red-200 text-red-500 hover:bg-red-50"
                          : "border-green-200 text-green-600 hover:bg-green-50"
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
