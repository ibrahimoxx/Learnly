"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { apiFetch } from "@/lib/api";

interface AdminOrg {
  id: string;
  name: string;
  slug: string;
  clerk_org_id: string;
  is_active: boolean;
  course_count: number;
  created_at: string;
}

export default function AdminOrgsPage() {
  const { getToken } = useAuth();
  const [orgs, setOrgs] = useState<AdminOrg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const token = await getToken();
      try {
        const data = await apiFetch<AdminOrg[]>("/api/v1/admin/orgs", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrgs(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getToken]);

  async function toggleActive(org: AdminOrg) {
    const token = await getToken();
    const updated = await apiFetch<AdminOrg>(`/api/v1/admin/orgs/${org.id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_active: !org.is_active }),
    });
    setOrgs((prev) => prev.map((o) => (o.id === org.id ? updated : o)));
  }

  return (
    <div className="p-6">
      <h1 className="mb-5 text-4xl font-black tracking-tight text-[--color-text-primary]">Organizations</h1>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-[--radius-md]" />)}
        </div>
      ) : orgs.length === 0 ? (
        <div className="premium-card rounded-[--radius-lg] py-12 text-center">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-[--color-text-muted]" />
          <p className="text-sm text-[--color-text-muted]">No organizations have signed up yet.</p>
        </div>
      ) : (
        <div className="premium-card rounded-[--radius-lg]">
          <table className="w-full text-sm">
            <thead className="border-b border-[--color-border] bg-[--color-surface]">
              <tr>
                {["Name", "Slug", "Courses", "Created", "Active"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[--color-text-muted]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[--color-border]">
              {orgs.map((org) => (
                <tr key={org.id} className={`transition-colors hover:bg-[--color-primary-subtle]/40 ${!org.is_active ? "opacity-60" : ""}`}>
                  <td className="px-4 py-3 font-bold text-[--color-text-primary]">{org.name}</td>
                  <td className="px-4 py-3 font-mono text-[--color-text-secondary]">{org.slug}</td>
                  <td className="px-4 py-3 text-[--color-text-muted]">{org.course_count}</td>
                  <td className="px-4 py-3 text-[--color-text-muted]">{new Date(org.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Switch checked={org.is_active} onCheckedChange={() => toggleActive(org)} aria-label={`Toggle ${org.name} active`} />
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
