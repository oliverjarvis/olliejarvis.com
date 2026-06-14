"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useIdentity } from "./IdentityProvider";

const LINKS = [
  { href: "/jetlag", label: "Chat" },
  { href: "/jetlag/lists", label: "Lists" },
  { href: "/jetlag/rules", label: "Rules" },
  { href: "/jetlag/teams", label: "Teams" },
];

export function JetlagNav() {
  const pathname = usePathname();
  const { name } = useIdentity();

  return (
    <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
      <div className="flex items-center gap-1">
        <span className="mr-3 font-semibold tracking-tight">Jetlag</span>
        <nav className="flex items-center gap-1">
          {LINKS.map((link) => {
            const active =
              link.href === "/jetlag"
                ? pathname === "/jetlag"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-1.5 text-sm transition ${
                  active
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <span className="text-sm text-neutral-500">{name}</span>
    </header>
  );
}
