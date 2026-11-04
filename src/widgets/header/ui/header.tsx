import Link from "next/link";
import { Suspense } from "react";

import { Logo } from "@/shared/ui/logo";

import { UserMenu } from "./user-menu";

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-foreground/10 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" aria-label="MDEV-Reader home">
          <Logo />
        </Link>
        <Suspense
          fallback={
            <span className="size-8 animate-pulse rounded-full bg-foreground/10" />
          }
        >
          <UserMenu />
        </Suspense>
      </div>
    </header>
  );
}
