"use client";

import Link from "next/link";
import { Loader2, LogIn } from "lucide-react";
import { type MouseEvent, type ReactNode, useState } from "react";

export function HomeLoginLink({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Link
      aria-disabled={isLoading}
      className={`button secondary-button home-login-link${isLoading ? " is-loading" : ""}`}
      href="/login"
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        if (isLoading) {
          event.preventDefault();
          return;
        }
        setIsLoading(true);
      }}
    >
      {isLoading ? (
        <Loader2 aria-hidden="true" className="ui-icon loading-spinner" size={16} strokeWidth={2.2} />
      ) : (
        <LogIn aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
      )}
      <span>{isLoading ? "Connexion..." : children}</span>
    </Link>
  );
}
