"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import type { Course } from "@/types";

interface ListEditorProps {
  title: string;
  description: string;
  items: string[];
  minItems?: number;
  placeholder: string;
  onChange: (items: string[]) => void;
}

function ListEditor({ title, description, items, minItems = 0, placeholder, onChange }: ListEditorProps) {
  function updateItem(index: number, value: string) {
    const next = [...items];
    next[index] = value;
    onChange(next);
  }

  function addItem() {
    onChange([...items, ""]);
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="premium-card rounded-[--radius-lg] p-6">
      <h2 className="font-semibold text-[--color-text-primary]">{title}</h2>
      <p className="mt-1 text-sm text-[--color-text-muted]">{description}</p>
      <div className="mt-4 space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              placeholder={placeholder}
            />
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="text-[--color-text-muted] hover:text-[--color-error]"
              aria-label="Remove"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      {minItems > 0 && items.filter((i) => i.trim()).length < minItems && (
        <p className="mt-2 text-xs text-[--color-error]">
          Add at least {minItems} entries ({items.filter((i) => i.trim()).length}/{minItems}).
        </p>
      )}
      <Button onClick={addItem} variant="outline" size="sm" className="mt-3 gap-1">
        <Plus className="h-4 w-4" /> Add
      </Button>
    </div>
  );
}

export default function CourseGoalsPage() {
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [objectives, setObjectives] = useState<string[]>([]);
  const [prerequisites, setPrerequisites] = useState<string[]>([]);
  const [audience, setAudience] = useState<string[]>([]);

  const load = useCallback(async () => {
    const token = await getToken();
    try {
      const course = await apiFetch<Course>(`/api/v1/courses/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setObjectives(course.learning_objectives?.length ? course.learning_objectives : [""]);
      setPrerequisites(course.prerequisites?.length ? course.prerequisites : [""]);
      setAudience(course.target_audience?.length ? course.target_audience : [""]);
    } catch {
      toast.error("Failed to load course goals.");
    } finally {
      setLoading(false);
    }
  }, [id, getToken]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    const token = await getToken();
    setSaving(true);
    try {
      await apiFetch<Course>(`/api/v1/courses/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          learning_objectives: objectives.map((o) => o.trim()).filter(Boolean),
          prerequisites: prerequisites.map((p) => p.trim()).filter(Boolean),
          target_audience: audience.map((a) => a.trim()).filter(Boolean),
        }),
      });
      toast.success("Goals saved.");
    } catch {
      toast.error("Failed to save goals.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="h-6 w-48 animate-pulse rounded bg-[--color-border]" />;
  }

  return (
    <div className="space-y-6">
      <ListEditor
        title="What students will learn"
        description="List the key learning objectives — minimum 4."
        items={objectives}
        minItems={4}
        placeholder="e.g. Build a REST API with FastAPI"
        onChange={setObjectives}
      />
      <ListEditor
        title="Prerequisites"
        description="What should students already know before starting?"
        items={prerequisites}
        placeholder="e.g. Basic Python syntax"
        onChange={setPrerequisites}
      />
      <ListEditor
        title="Who this course is for"
        description="Describe your target audience."
        items={audience}
        placeholder="e.g. Beginners with no prior coding experience"
        onChange={setAudience}
      />

      <div className="flex items-center justify-between">
        <Link href={`/instructor/courses/${id}/manage/captions`}>
          <Button variant="outline" size="sm">Next: Captions</Button>
        </Link>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? "Saving…" : "Save goals"}
        </Button>
      </div>
    </div>
  );
}
