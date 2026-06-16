"use client";

import { useState, useMemo } from "react";
import { LayoutGrid } from "lucide-react";
import { CourseCard } from "./course-card";
import type { Course } from "@/types";

const INITIAL_SHOW = 4;

function CategorySection({ name, courses, ownedIds }: { name: string; courses: Course[]; ownedIds: Set<string> }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? courses : courses.slice(0, INITIAL_SHOW);
  const hidden = courses.length - INITIAL_SHOW;

  return (
    <section>
      <h2 className="text-xl font-black tracking-tight" style={{ color: "#1c1d1f" }}>{name}</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((c) => (
          <CourseCard key={c.id} course={c} isOwned={ownedIds.has(c.id)} />
        ))}
      </div>
      {!expanded && hidden > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-4 rounded border px-4 py-2 text-sm font-semibold transition-colors hover:bg-gray-50"
          style={{ borderColor: "#0056d2", color: "#0056d2" }}
        >
          Show {hidden} more
        </button>
      )}
    </section>
  );
}

interface CourseViewToggleProps {
  courses: Course[];
  ownedIds: Set<string>;
}

export function CourseViewToggle({ courses, ownedIds }: CourseViewToggleProps) {
  const [grouped, setGrouped] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, Course[]>();
    for (const course of courses) {
      const cat = course.category?.name ?? "Other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(course);
    }
    return Array.from(map.entries()).map(([name, items]) => ({ name, courses: items }));
  }, [courses]);

  return (
    <div>
      {/* Toggle */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-3xl font-black tracking-tight" style={{ color: "#1c1d1f" }}>
          Courses
        </h2>
        <button
          onClick={() => setGrouped((v) => !v)}
          className="flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors"
          style={
            grouped
              ? { background: "#1c1d1f", borderColor: "#1c1d1f", color: "#ffffff" }
              : { background: "#ffffff", borderColor: "#d1d7dc", color: "#1c1d1f" }
          }
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Category
        </button>
      </div>

      {/* Views */}
      {grouped ? (
        <div className="space-y-12">
          {groups.map((g) => (
            <CategorySection key={g.name} name={g.name} courses={g.courses} ownedIds={ownedIds} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} isOwned={ownedIds.has(c.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
