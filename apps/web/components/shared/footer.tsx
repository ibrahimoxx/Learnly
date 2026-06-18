import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

const links = {
  Learn: [
    { label: "All Courses", href: "/courses" },
    { label: "Web Development", href: "/courses?category=web-development" },
    { label: "Data Science", href: "/courses?category=data-science" },
    { label: "Design", href: "/courses?category=design" },
  ],
  Teach: [
    { label: "Become an Instructor", href: "/teach/apply" },
    { label: "Pricing", href: "/pricing" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Blog", href: "/blog" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
  ],
};

export function Footer() {
  return (
    <footer className="mesh-panel relative mt-20 overflow-hidden border-t border-white/10 text-white shadow-[var(--shadow-xl)]">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: "var(--gradient-brand)" }}
      />

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="group flex items-center gap-2 font-extrabold text-white">
              <Image
                src="/brand/learnly-logo-generated.png"
                alt="Learnly"
                width={36}
                height={36}
                className="rounded-[--radius-sm] shadow-[var(--shadow-brand)] transition-transform group-hover:-rotate-3 group-hover:scale-105"
                unoptimized
              />
              <span className="font-heading text-xl">Learnly</span>
            </Link>
            <p className="mt-4 max-w-[220px] text-sm leading-relaxed text-white/68">
              Online learning marketplace with thousands of expert-led courses.
            </p>
          </div>

          {Object.entries(links).map(([section, items]) => (
            <div key={section}>
              <h3 className="mb-4 text-xs font-extrabold uppercase tracking-[0.18em] text-white/48">
                {section}
              </h3>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={`${section}-${item.label}`}>
                    <Link
                      href={item.href}
                      className="group inline-flex items-center gap-1 text-sm text-white/74 transition-colors hover:text-white"
                    >
                      {item.label}
                      <ArrowUpRight className="h-3 w-3 text-white/0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white/60" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-3 border-t border-white/10 pt-6 text-xs text-white/48 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Learnly. All rights reserved.</span>
          <span className="text-white/32">Learn without limits.</span>
        </div>
      </div>
    </footer>
  );
}
