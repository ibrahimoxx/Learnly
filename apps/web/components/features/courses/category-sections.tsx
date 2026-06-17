"use client";

import { useState } from "react";
import { CourseCard } from "./course-card";
import type { Course } from "@/types";

interface CategoryGroup {
  name: string;
  courses: Course[];
}

interface CategorySectionsProps {
  groups: CategoryGroup[];
  ownedIds: Set<string>;
}

const INITIAL_SHOW = 4;

function CategorySection({ group, ownedIds }: { group: CategoryGroup; ownedIds: Set<string> }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? group.courses : group.courses.slice(0, INITIAL_SHOW);
  const hidden = group.courses.length - INITIAL_SHOW;

  return (
    <section>
      <h2 className="text-xl font-black tracking-tight" style={{ color: "#1c1d1f" }}>
        {group.name}
      </h2>
      <div className="course-grid mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((course) => (
          <CourseCard key={course.id} course={course} isOwned={ownedIds.has(course.id)} />
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

export function CategorySections({ groups, ownedIds }: CategorySectionsProps) {
  if (groups.length === 0) return null;
  return (
    <div className="space-y-12">
      {groups.map((group) => (
        <CategorySection key={group.name} group={group} ownedIds={ownedIds} />
      ))}
    </div>
  );
}
