"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "./AppShell";

export function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/siswa/login"
  ) {
    return <>{children}</>;
  }
  return <AppShell>{children}</AppShell>;
}
