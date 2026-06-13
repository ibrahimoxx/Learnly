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
    { label: "Pricing", href: "/pricing" },
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
    <footer className="mt-20 overflow-hidden border-t border-white/10 bg-[--color-hero] text-white shadow-[var(--shadow-xl)]">
      <div className="mesh-panel mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-extrabold text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-[--radius-sm] bg-white/12 text-white shadow-[var(--shadow-brand)] backdrop-blur">
                <BookOpen className="h-5 w-5" />
              </span>
              <span className="font-heading text-xl">Learnly</span>
            </Link>
            <p className="mt-3 text-xs leading-relaxed text-white/68">
              Online learning marketplace with thousands of expert-led courses.
            </p>
          </div>

          {/* Links */}
          {Object.entries(links).map(([section, items]) => (
            <div key={section}>
              <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-white/54">
                {section}
              </h3>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={`${section}-${item.label}`}>
                    <Link
                      href={item.href}
                      className="text-sm text-white/74 transition-colors hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-white/54">
          © {new Date().getFullYear()} Learnly. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
