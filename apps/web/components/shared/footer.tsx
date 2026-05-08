import Link from "next/link";
import { BookOpen } from "lucide-react";

const links = {
  Learn: [
    { label: "All Courses", href: "/courses" },
    { label: "Web Development", href: "/courses?category=web-development" },
    { label: "Data Science", href: "/courses?category=data-science" },
    { label: "Design", href: "/courses?category=design" },
  ],
  Teach: [
    { label: "Become an Instructor", href: "/instructor/courses" },
    { label: "Instructor Dashboard", href: "/instructor/courses" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Blog", href: "#" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-[--color-border] bg-[--color-surface] mt-16">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold text-[--color-text-primary]">
              <BookOpen className="h-5 w-5 text-[--color-primary]" />
              <span>Learnly</span>
            </Link>
            <p className="mt-3 text-xs text-[--color-text-muted] leading-relaxed">
              Online learning marketplace with thousands of expert-led courses.
            </p>
          </div>

          {/* Links */}
          {Object.entries(links).map(([section, items]) => (
            <div key={section}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[--color-text-muted]">
                {section}
              </h3>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={`${section}-${item.href}`}>
                    <Link
                      href={item.href}
                      className="text-sm text-[--color-text-secondary] hover:text-[--color-primary] transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-[--color-border] pt-6 text-center text-xs text-[--color-text-muted]">
          © {new Date().getFullYear()} Learnly. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
