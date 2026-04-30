"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type AppNavLinkProps = {
  children: ReactNode;
  href: string;
};

export function AppNavLink({ children, href }: AppNavLinkProps) {
  const pathname = usePathname();
  const isActive = href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={`app-nav-link${isActive ? " is-active" : ""}`}
      href={href}
    >
      {children}
    </Link>
  );
}
