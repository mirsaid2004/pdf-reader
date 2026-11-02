import Link from "next/link";

import { SignOutButton } from "@/features/auth/sign-out";
import { UserAvatar } from "@/entities/user";
import { getCurrentUser, SIGN_IN_PATH } from "@/shared/auth";

const MENU_ID = "user-menu";

/** Reads the session — render inside <Suspense>. */
export async function UserMenu() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Link
        href={SIGN_IN_PATH}
        className="rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90"
      >
        Sign in
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        popoverTarget={MENU_ID}
        aria-label="Open user menu"
        className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <UserAvatar name={user.name} image={user.image} />
      </button>
      {/* Native popover: light-dismiss + Esc handling without client JS. */}
      <div
        id={MENU_ID}
        popover="auto"
        className="fixed inset-auto top-14 right-4 m-0 w-64 rounded-xl border border-foreground/10 bg-background p-2 text-foreground shadow-lg"
      >
        <div className="border-b border-foreground/10 px-3 py-2">
          <p className="truncate text-sm font-medium">
            {user.name ?? "Reader"}
          </p>
          {user.email && (
            <p className="truncate text-xs text-foreground/60">{user.email}</p>
          )}
        </div>
        <Link
          href="/library"
          className="mt-1 block rounded-lg px-3 py-2 text-sm hover:bg-foreground/5"
        >
          My library
        </Link>
        <SignOutButton className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-foreground/5" />
      </div>
    </>
  );
}
