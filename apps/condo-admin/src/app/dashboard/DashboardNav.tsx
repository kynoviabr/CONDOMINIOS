"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CondoOperationalModule } from "../../lib/operations/modules";

export function DashboardNav({ modules }: { modules: CondoOperationalModule[] }) {
  const pathname = usePathname();

  return (
    <nav className="condo-sidebar-nav" aria-label="Modulos do Condo Admin">
      {modules.map((module) => {
        const active = pathname === module.href || pathname.startsWith(`${module.href}/`);

        return (
          <Link aria-current={active ? "page" : undefined} href={module.href} key={module.key}>
            <span>{module.title.slice(0, 2).toUpperCase()}</span>
            {module.title}
          </Link>
        );
      })}
    </nav>
  );
}
